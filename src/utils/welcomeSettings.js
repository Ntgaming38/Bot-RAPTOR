const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'data', 'welcome.json');

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

// Lấy setting của 1 server, merge với .env (ưu tiên setting trong Discord)
async function getWelcomeSettings(guildId) {
  const config = require('../config');
  const base = {
    channelId: config.welcomeChannelId,
    title: config.welcomeTitle,
    roleChannelId: config.welcomeRoleChannelId,
    rulesChannelId: config.welcomeRulesChannelId,
    announceChannelId: config.welcomeAnnounceChannelId,
    chatChannelId: config.welcomeChatChannelId,
    imageUrl: config.welcomeImageUrl,
    color: config.welcomeColor,
    reactions: config.welcomeReactions,
    autoRoleId: config.autoRoleId,
  };
  let over = {};
  if (useMongo()) {
    const { WelcomeSettings } = require('../db');
    const doc = await WelcomeSettings.findOne({ guildId }).lean();
    if (doc) over = doc;
  } else {
    over = loadAll()[guildId] || {};
  }
  const merged = { ...base };
  for (const k of Object.keys(merged)) {
    if (over[k] !== undefined && over[k] !== null && over[k] !== '') merged[k] = over[k];
  }
  // autoRole riêng (không có trong base? có rồi)
  if (over.autoRoleId) merged.autoRoleId = over.autoRoleId;
  return merged;
}

async function saveWelcomeSettings(guildId, patch) {
  const clean = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) clean[k] = v;
  }
  if (useMongo()) {
    const { WelcomeSettings } = require('../db');
    await WelcomeSettings.updateOne({ guildId }, { $set: clean }, { upsert: true });
    return getWelcomeSettings(guildId);
  }
  const all = loadAll();
  all[guildId] = { ...(all[guildId] || {}), ...clean };
  saveAll(all);
  return getWelcomeSettings(guildId);
}

async function clearWelcomeSettings(guildId) {
  if (useMongo()) {
    const { WelcomeSettings } = require('../db');
    await WelcomeSettings.deleteOne({ guildId });
  } else {
    const all = loadAll();
    delete all[guildId];
    saveAll(all);
  }
}

module.exports = { getWelcomeSettings, saveWelcomeSettings, clearWelcomeSettings };
