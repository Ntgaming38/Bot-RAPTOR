const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'data', 'log-settings.json');

// 19 loại log kiểu ProBot (+ roleAssign của bot mình)
const LOG_TYPES = [
  ['memberJoin', 'Vào server'],
  ['memberLeave', 'Rời server'],
  ['ban', 'Ban'],
  ['unban', 'Unban'],
  ['kick', 'Kick'],
  ['timeout', 'Timeout'],
  ['warn', 'Warn'],
  ['msgDelete', 'Xóa tin nhắn'],
  ['msgEdit', 'Sửa tin nhắn'],
  ['roleCreate', 'Tạo role'],
  ['roleDelete', 'Xóa role'],
  ['roleUpdate', 'Sửa role'],
  ['roleAssign', 'Nhận/bỏ role'],
  ['channelCreate', 'Tạo kênh'],
  ['channelDelete', 'Xóa kênh'],
  ['channelUpdate', 'Sửa kênh'],
  ['nickChange', 'Đổi nickname'],
  ['voiceJoin', 'Vào voice'],
  ['voiceLeave', 'Rời voice'],
  ['voiceMove', 'Chuyển voice'],
];

const cache = new Map();
const TTL = 30_000;

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

async function getLogSettings(guildId) {
  const hit = cache.get(guildId);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const config = require('../config');
  const data = { channelId: config.logChannelId, toggles: {} };
  let over = {};
  if (useMongo()) {
    const { LogSettings } = require('../db');
    const doc = await LogSettings.findOne({ guildId }).lean().catch(() => null);
    if (doc) over = doc;
  } else {
    over = loadAll()[guildId] || {};
  }
  if (over.channelId !== undefined && over.channelId !== null && over.channelId !== '') data.channelId = over.channelId;
  for (const [k] of LOG_TYPES) {
    data.toggles[k] = over.toggles?.[k] !== undefined ? !!over.toggles[k] : true;
  }
  cache.set(guildId, { at: Date.now(), data });
  return data;
}

async function saveLogSettings(guildId, patch) {
  const clean = {};
  if (patch.channelId !== undefined) clean.channelId = patch.channelId || null;
  if (patch.toggles !== undefined) clean.toggles = patch.toggles;
  if (useMongo()) {
    const { LogSettings } = require('../db');
    const ops = {};
    if (clean.channelId !== undefined) ops.channelId = clean.channelId;
    if (clean.toggles) {
      for (const [k, v] of Object.entries(clean.toggles)) ops[`toggles.${k}`] = !!v;
    }
    await LogSettings.updateOne({ guildId }, { $set: ops }, { upsert: true });
  } else {
    const all = loadAll();
    const cur = all[guildId] || { toggles: {} };
    all[guildId] = {
      channelId: clean.channelId !== undefined ? clean.channelId : cur.channelId,
      toggles: { ...(cur.toggles || {}), ...(clean.toggles || {}) },
    };
    saveAll(all);
  }
  cache.delete(guildId);
  return getLogSettings(guildId);
}

async function isLogEnabled(guildId, type) {
  const s = await getLogSettings(guildId);
  if (!s.channelId) return false;
  return s.toggles[type] !== false;
}

module.exports = { LOG_TYPES, getLogSettings, saveLogSettings, isLogEnabled };
