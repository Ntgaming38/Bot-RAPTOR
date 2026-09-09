const fs = require('node:fs');
const path = require('node:path');
const { embed } = require('./embeds');

const FILE = path.join(__dirname, '..', '..', 'data', 'announce.json');

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

async function getAnnounce(guildId) {
  if (useMongo()) {
    const { AnnounceSettings } = require('../db');
    return (await AnnounceSettings.findOne({ guildId }).lean()) || {};
  }
  return loadAll()[guildId] || {};
}

async function saveAnnounce(guildId, patch) {
  const clean = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) clean[k] = v;
  }
  if (useMongo()) {
    const { AnnounceSettings } = require('../db');
    await AnnounceSettings.updateOne({ guildId }, { $set: clean }, { upsert: true });
    return getAnnounce(guildId);
  }
  const all = loadAll();
  all[guildId] = { ...(all[guildId] || {}), ...clean };
  saveAll(all);
  return getAnnounce(guildId);
}

async function clearAnnounce(guildId) {
  if (useMongo()) {
    const { AnnounceSettings } = require('../db');
    await AnnounceSettings.deleteOne({ guildId });
  } else {
    const all = loadAll();
    delete all[guildId];
    saveAll(all);
  }
}

// Nhiều tin ticker tách nhau bằng dòng --- (giống BotGhost rotation)
function parseLines(text) {
  return String(text || '').split(/\r?\n---\r?\n/).map((s) => s.trim()).filter(Boolean);
}

function applyVars(text, vars) {
  return String(text || '')
    .replaceAll('{server}', vars.server || '')
    .replaceAll('{members}', String(vars.members ?? ''));
}

function boardEmbed(guild, title, line, idx, total) {
  return embed({
    title: title || '📢 THÔNG BÁO',
    description: applyVars(line, { server: guild?.name, members: guild?.memberCount }),
    footer: total > 1 ? `Tin ${idx + 1}/${total} • ${new Date().toLocaleString('vi-VN')}` : new Date().toLocaleString('vi-VN'),
  });
}

// Đăng mới hoặc sửa bảng tin (lineIdx: null = giữ dòng hiện tại)
async function updateBoard(client, guildId, lineIdx = null) {
  const s = await getAnnounce(guildId);
  if (!s.channelId || !s.text) return null;
  const lines = parseLines(s.text);
  if (!lines.length) return null;
  const idx = lineIdx !== null ? (lineIdx % lines.length) : Math.min(s.idx || 0, lines.length - 1);
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return null;
  const ch = await guild.channels.fetch(s.channelId).catch(() => null);
  if (!ch?.isTextBased()) {
    console.warn('[announce] không tìm thấy kênh', s.channelId);
    return null;
  }
  const em = boardEmbed(guild, s.title, lines[idx], idx, lines.length);
  if (s.messageId) {
    const msg = await ch.messages.fetch(s.messageId).catch(() => null);
    if (msg) {
      await msg.edit({ embeds: [em] }).catch(() => null);
      await saveAnnounce(guildId, { idx });
      return msg;
    }
  }
  const msg = await ch.send({ embeds: [em] }).catch(() => null);
  if (msg) await saveAnnounce(guildId, { messageId: msg.id, idx });
  return msg;
}

// Các guild đến lượt xoay ticker
async function listAnnounceDue() {
  const now = Date.now();
  const all = useMongo()
    ? await require('../db').AnnounceSettings.find({ channelId: { $ne: null } }).lean().catch(() => [])
    : Object.entries(loadAll()).map(([guildId, v]) => ({ guildId, ...v }));
  return all
    .filter((s) => s.channelId && (s.intervalMin || 0) > 0 && parseLines(s.text).length > 1 && now - (s.lastRotated || 0) >= s.intervalMin * 60000)
    .map((s) => s.guildId);
}

async function rotateAnnounce(client, guildId) {
  const s = await getAnnounce(guildId);
  const lines = parseLines(s.text);
  if (lines.length < 2) return null;
  const next = ((s.idx || 0) + 1) % lines.length;
  const msg = await updateBoard(client, guildId, next);
  if (msg) await saveAnnounce(guildId, { lastRotated: Date.now() });
  return msg;
}

module.exports = { getAnnounce, saveAnnounce, clearAnnounce, parseLines, updateBoard, listAnnounceDue, rotateAnnounce };
