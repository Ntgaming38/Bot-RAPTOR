const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'data', 'guild-settings.json');

// Cache nhẹ 30s để không spam Mongo mỗi tin nhắn
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

function baseFromEnv() {
  const config = require('../config');
  return {
    xpMin: config.xpMin,
    xpMax: config.xpMax,
    xpCooldownSec: config.xpCooldownSec,
    levelUpMessage: config.levelUpMessage,
    bannedWords: [...config.bannedWords],
    logChannelId: config.logChannelId,
    ticketCategoryId: config.ticketCategoryId,
    ticketStaffRoleId: config.ticketStaffRoleId,
    ticketPanelImageUrl: config.ticketPanelImageUrl,
    ticketTypes: null,
    panelTitle: null,
    panelDescription: null,
    showClaim: true,
    showTranscript: true,
    showRating: true,
    closeDelaySec: 5,
    archiveCategoryId: null,
    closeMode: 'delete',
    autoCloseHours: 0,
    defaultPriority: 'medium',
    musicDefaultVolume: null,
    giveawayChannelId: null,
    giveawayWinners: 1,
    giveawayDuration: '10m',
  };
}

// Cấu hình đã merge (.env làm mặc định, setting trong dashboard đè lên)
async function getGuildSettings(guildId) {
  const hit = cache.get(guildId);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const base = baseFromEnv();
  let over = {};
  if (useMongo()) {
    const { GuildSettings } = require('../db');
    const doc = await GuildSettings.findOne({ guildId }).lean().catch(() => null);
    if (doc) over = doc;
  } else {
    over = loadAll()[guildId] || {};
  }
  const merged = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (v !== undefined && v !== null && v !== '' && k !== '_id' && k !== '__v' && k !== 'guildId') merged[k] = v;
  }
  cache.set(guildId, { at: Date.now(), data: merged });
  return merged;
}

async function saveGuildSettings(guildId, patch) {
  const clean = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) clean[k] = v;
  }
  if (useMongo()) {
    const { GuildSettings } = require('../db');
    await GuildSettings.updateOne({ guildId }, { $set: clean }, { upsert: true });
  } else {
    const all = loadAll();
    all[guildId] = { ...(all[guildId] || {}), ...clean };
    saveAll(all);
  }
  cache.delete(guildId);
  return getGuildSettings(guildId);
}

module.exports = { getGuildSettings, saveGuildSettings };
