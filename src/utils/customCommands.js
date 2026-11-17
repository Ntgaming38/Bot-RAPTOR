// === CUSTOM COMMANDS ===
// Admin tự tạo lệnh riêng cho server: gõ "!ten" trong chat → bot trả lời sẵn.
// Quản lý bằng /custom add|remove|list|toggle. Tiền tố lấy theo setting
// prefix của server (mặc định "!"). Lưu Mongo (model CustomCommand) hoặc
// JSON fallback như các module khác.
// Biến hỗ trợ trong nội dung trả lời: {user} (tag người gọi), {username},
// {server} (tên server), {args} (phần chữ gõ sau tên lệnh).

const fs = require('node:fs');
const path = require('node:path');
const { writeJsonAtomic, readJson } = require('./jsonStore');

const FILE = path.join(__dirname, '..', '..', 'data', 'custom-commands.json');
const MAX_PER_GUILD = 50;
const MAX_RESPONSE = 1500;
const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;
// Tên không được trùng từ khóa hệ thống để tránh nhầm lẫn
const RESERVED = new Set(['custom', 'help', 'warn', 'ai', 'ticket', 'stats']);

function useMongo() {
  try {
    return require('../db').isMongo();
  } catch { return false; }
}

function validateName(raw) {
  const name = String(raw || '').trim().toLowerCase();
  if (!NAME_RE.test(name)) return null;
  if (RESERVED.has(name)) return null;
  return name;
}

function renderResponse(text, { user, guild, args } = {}) {
  return String(text || '')
    .replaceAll('{user}', user ? `<@${user.id}>` : '')
    .replaceAll('{username}', user?.username || user?.tag || '')
    .replaceAll('{server}', guild?.name || '')
    .replaceAll('{args}', args || '')
    .slice(0, 2000);
}

// --- JSON fallback ---
function loadAll() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return readJson(FILE, {});
  } catch { return {}; }
}
function saveAll(db) {
  writeJsonAtomic(FILE, db);
}

async function listCommands(guildId) {
  if (useMongo()) {
    const { CustomCommand } = require('../db');
    return CustomCommand.find({ guildId }).sort({ name: 1 }).lean();
  }
  return [...(loadAll()[guildId] || [])].sort((a, b) => a.name.localeCompare(b.name));
}

async function findCommand(guildId, name) {
  if (useMongo()) {
    const { CustomCommand } = require('../db');
    return CustomCommand.findOne({ guildId, name }).lean();
  }
  return (loadAll()[guildId] || []).find((c) => c.name === name) || null;
}

// Trả { created: true } nếu tạo mới, { created: false } nếu ghi đè lệnh cũ.
// Ném Error('LIMIT') khi đã đủ 50 lệnh mà thêm tên mới.
async function saveCommand(guildId, { name, response, createdBy }) {
  if (useMongo()) {
    const { CustomCommand } = require('../db');
    const existing = await CustomCommand.findOne({ guildId, name }).lean();
    if (!existing) {
      const total = await CustomCommand.countDocuments({ guildId });
      if (total >= MAX_PER_GUILD) throw new Error('LIMIT');
    }
    await CustomCommand.findOneAndUpdate(
      { guildId, name },
      { $set: { response, createdBy, createdAt: Date.now() } },
      { upsert: true }
    );
    return { created: !existing };
  }
  const all = loadAll();
  const list = all[guildId] || [];
  const idx = list.findIndex((c) => c.name === name);
  if (idx < 0 && list.length >= MAX_PER_GUILD) throw new Error('LIMIT');
  const entry = { name, response, createdBy, uses: idx >= 0 ? list[idx].uses || 0 : 0, createdAt: Date.now() };
  if (idx >= 0) list[idx] = entry; else list.push(entry);
  all[guildId] = list;
  saveAll(all);
  return { created: idx < 0 };
}

async function deleteCommand(guildId, name) {
  if (useMongo()) {
    const { CustomCommand } = require('../db');
    const r = await CustomCommand.deleteOne({ guildId, name });
    return r.deletedCount > 0;
  }
  const all = loadAll();
  const list = all[guildId] || [];
  const next = list.filter((c) => c.name !== name);
  if (next.length === list.length) return false;
  all[guildId] = next;
  saveAll(all);
  return true;
}

async function bumpUses(guildId, name) {
  try {
    if (useMongo()) {
      const { CustomCommand } = require('../db');
      await CustomCommand.updateOne({ guildId, name }, { $inc: { uses: 1 } });
      return;
    }
    const all = loadAll();
    const entry = (all[guildId] || []).find((c) => c.name === name);
    if (entry) {
      entry.uses = (entry.uses || 0) + 1;
      saveAll(all);
    }
  } catch {}
}

// Chống spam: mỗi người + mỗi lệnh tối thiểu 3 giây giữa 2 lần gọi
const cooldowns = new Map();
function onCooldown(guildId, userId, name) {
  const k = `${guildId}:${userId}:${name}`;
  const now = Date.now();
  if (now - (cooldowns.get(k) || 0) < 3000) return true;
  cooldowns.set(k, now);
  if (cooldowns.size > 500) {
    for (const [key, t] of cooldowns) if (now - t > 60_000) cooldowns.delete(key);
  }
  return false;
}

// Điểm vào từ messageCreate: đúng tiền tố + đúng tên lệnh thì trả lời.
// Trả true nếu đã xử lý (để messageCreate bỏ qua AI chat cho tin này).
async function handleMessage(message, st) {
  try {
    if (!st || st.customCmdCfg?.enabled === false) return false;
    const prefix = String(st.prefix || '!').trim();
    if (!prefix) return false;
    const content = message.content || '';
    if (!content.startsWith(prefix)) return false;
    const rest = content.slice(prefix.length).trim();
    if (!rest) return false;
    const [rawName, ...argParts] = rest.split(/\s+/);
    const name = validateName(rawName);
    if (!name) return false;
    const cmd = await findCommand(message.guild.id, name);
    if (!cmd) return false;
    if (onCooldown(message.guild.id, message.author.id, name)) return true;
    const text = renderResponse(cmd.response, {
      user: message.author,
      guild: message.guild,
      args: argParts.join(' '),
    });
    if (!text.trim()) return true;
    await message.channel.send({
      content: text,
      allowedMentions: { users: [message.author.id] },
    }).catch(() => {});
    bumpUses(message.guild.id, name);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  MAX_PER_GUILD,
  MAX_RESPONSE,
  validateName,
  renderResponse,
  listCommands,
  findCommand,
  saveCommand,
  deleteCommand,
  handleMessage,
};
