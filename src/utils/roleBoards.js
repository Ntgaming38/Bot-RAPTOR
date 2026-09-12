const fs = require('node:fs');
const path = require('node:path');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embed } = require('./embeds');

const FILE = path.join(__dirname, '..', '..', 'data', 'role-boards.json');
const MAX_ITEMS = 25; // Discord: 5 hàng x 5 nút
const MAX_BOARDS = 10;

function loadAll() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch { return {}; }
}
function saveAll(db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}
function useMongo() {
  try {
    return require('../db').isMongo();
  } catch { return false; }
}
const norm = (s) => String(s || '').trim().toLowerCase();

async function listBoards(guildId) {
  if (useMongo()) {
    const { RoleBoard } = require('../db');
    return (await RoleBoard.find({ guildId }).lean().catch(() => []))
      .map((b) => ({ id: String(b._id), name: b.name, channelId: b.channelId, itemCount: (b.items || []).length }));
  }
  return Object.values(loadAll()[guildId] || {}).map((b) => ({ id: b.id, name: b.name, channelId: b.channelId, itemCount: (b.items || []).length }));
}

async function getBoard(guildId, nameOrId) {
  if (useMongo()) {
    const { RoleBoard } = require('../db');
    const q = { guildId };
    if (/^[0-9a-f]{24}$/i.test(String(nameOrId || ''))) {
      return (await RoleBoard.findOne({ ...q, _id: nameOrId }).lean().catch(() => null)) || null;
    }
    return (await RoleBoard.find({ guildId }).lean().catch(() => []))
      .find((b) => norm(b.name) === norm(nameOrId)) || null;
  }
  const boards = loadAll()[guildId] || {};
  return boards[nameOrId] || Object.values(boards).find((b) => norm(b.name) === norm(nameOrId)) || null;
}

// Tìm bảng: theo tên, hoặc bảng duy nhất nếu chỉ có 1
async function resolveBoard(guildId, name) {
  const boards = useMongo()
    ? await require('../db').RoleBoard.find({ guildId }).lean().catch(() => [])
    : Object.values(loadAll()[guildId] || {});
  if (name) return boards.find((b) => norm(b.name) === norm(name)) || null;
  if (boards.length === 1) return boards[0];
  return boards.length ? 'MANY' : null;
}

async function createBoard(guildId, { name, channelId, title, description }) {
  const clean = String(name || '').trim().slice(0, 50);
  if (!clean) throw new Error('no-name');
  if (useMongo()) {
    const { RoleBoard } = require('../db');
    const count = await RoleBoard.countDocuments({ guildId }).catch(() => 0);
    if (count >= MAX_BOARDS) throw new Error('limit');
    if (await RoleBoard.findOne({ guildId, name: { $regex: `^${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })) {
      throw new Error('exists');
    }
    const doc = await RoleBoard.create({ guildId, name: clean, channelId: channelId || null, title: title || null, description: description || null, items: [] });
    return doc.toObject();
  }
  const all = loadAll();
  all[guildId] = all[guildId] || {};
  if (Object.keys(all[guildId]).length >= MAX_BOARDS) throw new Error('limit');
  if (Object.values(all[guildId]).some((b) => norm(b.name) === norm(clean))) throw new Error('exists');
  const id = `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  all[guildId][id] = { id, name: clean, channelId: channelId || null, messageId: null, title: title || null, description: description || null, items: [] };
  saveAll(all);
  return all[guildId][id];
}

async function saveBoard(guildId, boardId, patch) {
  const clean = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) clean[k] = v;
  }
  if (useMongo()) {
    const { RoleBoard } = require('../db');
    await RoleBoard.updateOne({ guildId, _id: boardId }, { $set: clean }).catch(() => null);
    return getBoard(guildId, boardId);
  }
  const all = loadAll();
  if (!all[guildId]?.[boardId]) return null;
  all[guildId][boardId] = { ...all[guildId][boardId], ...clean };
  saveAll(all);
  return all[guildId][boardId];
}

async function deleteBoard(guildId, boardId) {
  const board = await getBoard(guildId, boardId);
  if (useMongo()) {
    const { RoleBoard } = require('../db');
    await RoleBoard.deleteOne({ guildId, _id: boardId }).catch(() => {});
  } else {
    const all = loadAll();
    if (all[guildId]) {
      delete all[guildId][boardId];
      saveAll(all);
    }
  }
  return board;
}

function boardIdOf(board) {
  return String(board._id || board.id);
}

function buildRows(board, withEmoji = true) {
  const rows = [];
  const items = board.items || [];
  for (let i = 0; i < items.length && rows.length < 5; i += 5) {
    const row = new ActionRowBuilder();
    for (const it of items.slice(i, i + 5)) {
      const btn = new ButtonBuilder()
        .setCustomId(`rpb:${boardIdOf(board)}:${it.roleId}`)
        .setLabel((it.label || 'Role').slice(0, 80))
        .setStyle(ButtonStyle.Secondary);
      if (withEmoji && it.emoji) {
        try { btn.setEmoji(it.emoji); } catch {}
      }
      row.addComponents(btn);
    }
    rows.push(row);
  }
  return rows;
}

function buildSelect(board, withEmoji = true) {
  const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
  const items = (board.items || []).slice(0, 25);
  const max = board.maxPicks > 0 ? Math.min(board.maxPicks, items.length) : items.length;
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`rps:${boardIdOf(board)}`)
    .setPlaceholder((board.placeholder || 'Chọn role...').slice(0, 150))
    .setMinValues(1)
    .setMaxValues(Math.max(1, max));
  for (const it of items) {
    const opt = { label: (it.label || 'Role').slice(0, 100), value: it.roleId, description: '' };
    if (withEmoji && it.emoji) opt.emoji = it.emoji;
    menu.addOptions(opt);
  }
  return [new ActionRowBuilder().addComponents(menu)];
}

// So khớp emoji reaction với item (unicode hoặc custom <:name:id>)
function matchItemEmoji(items, reaction) {
  const customId = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : null;
  return (items || []).find((it) => {
    if (!it.emoji) return false;
    if (customId && (it.emoji === customId || it.emoji.endsWith(`:${reaction.emoji.id}>`))) return true;
    return it.emoji === reaction.emoji.name || it.emoji === reaction.emoji.toString();
  }) || null;
}

async function renderBoard(client, guildId, nameOrId) {
  const board = typeof nameOrId === 'object' ? nameOrId : await getBoard(guildId, nameOrId);
  if (!board?.channelId || !board.items?.length) return null;
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return null;
  const ch = await guild.channels.fetch(board.channelId).catch(() => null);
  if (!ch?.isTextBased()) {
    console.warn('[rolepanel] không tìm thấy kênh', board.channelId);
    return null;
  }
  const display = board.display || 'buttons';
  const roleList = (board.items || []).map((it) => `<@&${it.roleId}>`).join('\n');
  const descNote = display === 'reactions'
    ? '\n\n_Thả reaction vào tin này để nhận role, bỏ reaction để gỡ._'
    : display === 'select' ? '\n\n_Chọn trong menu bên dưới (bấm lại để bỏ)._' : '';
  const fillDesc = (t) => String(t || '')
    .replaceAll('{roles}', roleList)
    .replaceAll('{server}', guild.name)
    .replaceAll('{members}', String(guild.memberCount ?? '?'));
  const path = require('node:path');
  const RAINBOW = path.join(__dirname, '..', '..', 'assets', 'rainbow.png');
  const files = [];
  const data = {
    embeds: [embed({
      title: board.title || '🎮 CHỌN ROLE',
      description: fillDesc(board.description || 'Bấm nút bên dưới để nhận / bỏ role.') + descNote,
      thumbnail: board.thumbnailUrl || guild.iconURL({ size: 256 }) || undefined,
      footer: board.footer || guild.name,
    })],
  };
  if (board.rainbowBar !== false) {
    data.embeds[0].setImage('attachment://rainbow.png');
    files.push({ attachment: RAINBOW, name: 'rainbow.png' });
  }
  const bid = boardIdOf(board);
  const trySend = async (withEmoji) => {
    let rows = [];
    if (display === 'select') {
      try {
        rows = buildSelect({ ...board, _id: bid, id: bid }, withEmoji);
      } catch {
        rows = buildRows({ ...board, _id: bid, id: bid }, withEmoji);
      }
    } else if (display === 'buttons') {
      rows = buildRows({ ...board, _id: bid, id: bid }, withEmoji);
    }
    if (board.messageId) {
      const msg = await ch.messages.fetch(board.messageId).catch(() => null);
      if (msg) return msg.edit({ ...data, files, components: rows }).catch(() => null);
    }
    return ch.send({ ...data, files, components: rows }).catch(() => null);
  };
  let msg = await trySend(true);
  if (!msg) msg = await trySend(false); // emoji lỗi → vẽ lại không emoji
  if (msg) {
    if (display === 'reactions') {
      // Thả sẵn reaction để member chỉ việc bấm
      for (const it of (board.items || []).slice(0, 20)) {
        if (it.emoji) await msg.react(it.emoji).catch(() => {});
      }
    }
    if (msg.id !== board.messageId) {
      if (useMongo()) {
        const { RoleBoard } = require('../db');
        await RoleBoard.updateOne({ guildId, _id: bid }, { $set: { messageId: msg.id } }).catch(() => {});
      } else {
        const all = loadAll();
        if (all[guildId]?.[bid]) {
          all[guildId][bid].messageId = msg.id;
          saveAll(all);
        }
      }
    }
  }
  return msg;
}

// Tìm board theo messageId (cho reaction events)
async function findBoardByMessage(guildId, messageId) {
  if (useMongo()) {
    const { RoleBoard } = require('../db');
    return (await RoleBoard.findOne({ guildId, messageId }).lean().catch(() => null)) || null;
  }
  return Object.values(loadAll()[guildId] || {}).find((b) => b.messageId === messageId) || null;
}

// Lõi toggle dùng chung: kiểm tra verify/limit/exclusive/quyền bot
// Trả về { action: 'added'|'removed'|'denied', reason?, role? }
async function toggleBoardRole(guild, member, board, item) {
  const role = await guild.roles.fetch(item.roleId).catch(() => null);
  if (!role) return { action: 'denied', reason: 'Role này không còn tồn tại.' };
  if (role.managed || role.id === guild.id) return { action: 'denied', reason: 'Role này không thể tự nhận.' };
  const me = guild.members.me;
  if (!me?.permissions.has('ManageRoles')) return { action: 'denied', reason: 'Bot thiếu quyền Manage Roles.' };
  if (role.position >= me.roles.highest.position) {
    return { action: 'denied', reason: 'Role này cao hơn role bot (kéo role bot lên trên).' };
  }
  // Verify role: phải có role X mới được chọn
  if (board.requiredRoleId && !member.roles.cache.has(board.requiredRoleId)) {
    const req = await guild.roles.fetch(board.requiredRoleId).catch(() => null);
    return { action: 'denied', reason: `Cần có role **${req ? req.name : 'xác minh'}** trước (bấm bảng verify).` };
  }
  if (member.roles.cache.has(role.id)) {
    await member.roles.remove(role).catch(() => null);
    return { action: 'removed', role };
  }
  // Exclusive: bỏ các role khác cùng bảng
  if (board.exclusive) {
    for (const it of board.items || []) {
      if (it.roleId !== role.id && member.roles.cache.has(it.roleId)) {
        await member.roles.remove(it.roleId).catch(() => {});
      }
    }
  } else if ((board.maxPicks || 0) > 0) {
    // Giới hạn số role/bảng/người
    const mine = (board.items || []).filter((it) => member.roles.cache.has(it.roleId)).length;
    if (mine >= board.maxPicks) {
      return { action: 'denied', reason: `Mỗi người chỉ được chọn tối đa ${board.maxPicks} role ở bảng này.` };
    }
  }
  await member.roles.add(role).catch(() => null);
  if (!member.roles.cache.has(role.id)) return { action: 'denied', reason: 'Không gắn được role (kiểm tra phân quyền).' };
  return { action: 'added', role };
}

module.exports = { listBoards, getBoard, resolveBoard, createBoard, saveBoard, deleteBoard, renderBoard, findBoardByMessage, toggleBoardRole, matchItemEmoji, MAX_ITEMS, MAX_BOARDS };
