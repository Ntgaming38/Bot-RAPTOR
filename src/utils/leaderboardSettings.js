const fs = require('node:fs');
const path = require('node:path');
const { embed } = require('./embeds');

const FILE = path.join(__dirname, '..', '..', 'data', 'leaderboard.json');

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

async function getLeaderboardSettings(guildId) {
  if (useMongo()) {
    const { LeaderboardSettings } = require('../db');
    return (await LeaderboardSettings.findOne({ guildId }).lean()) || {};
  }
  return loadAll()[guildId] || {};
}

async function saveLeaderboardSettings(guildId, patch) {
  const clean = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) clean[k] = v;
  }
  if (useMongo()) {
    const { LeaderboardSettings } = require('../db');
    await LeaderboardSettings.updateOne({ guildId }, { $set: clean }, { upsert: true });
    return getLeaderboardSettings(guildId);
  }
  const all = loadAll();
  all[guildId] = { ...(all[guildId] || {}), ...clean };
  saveAll(all);
  return getLeaderboardSettings(guildId);
}

async function clearLeaderboardSettings(guildId) {
  if (useMongo()) {
    const { LeaderboardSettings } = require('../db');
    await LeaderboardSettings.deleteOne({ guildId });
  } else {
    const all = loadAll();
    delete all[guildId];
    saveAll(all);
  }
}

async function listLeaderboardGuilds() {
  if (useMongo()) {
    const { LeaderboardSettings } = require('../db');
    return (await LeaderboardSettings.find({ channelId: { $ne: null } }).lean()).map(d => d.guildId);
  }
  return Object.entries(loadAll()).filter(([, v]) => v?.channelId).map(([g]) => g);
}

// Dựng embed BXH cho 1 guild
async function buildLeaderboardEmbed(client, guildId, limit = 10) {
  const { getLeaderboard } = require('./levels');
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  const top = await getLeaderboard(guildId, limit);
  if (!top.length) {
    return embed({ title: `🏆 Top level ${guild?.name || ''}`, description: '📭 Chưa có ai có XP. Hãy chat để lên level!' });
  }
  const lines = await Promise.all(top.map(async (e) => {
    const u = await client.users.fetch(e.userId).catch(() => null);
    return `**#${e.rank}** ${u ? u.username : `<@${e.userId}>`} — Level **${e.level}** (${e.xp} XP)`;
  }));
  return embed({ title: `🏆 Top level ${guild?.name || ''}`, description: lines.join('\n'), footer: `Cập nhật lúc ${new Date().toLocaleString('vi-VN')}` });
}

// Gửi mới hoặc sửa tin nhắn BXH trong kênh đã setup
async function updateLeaderboardChannel(client, guildId) {
  const s = await getLeaderboardSettings(guildId);
  if (!s.channelId) return null;
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return null;
  const ch = await guild.channels.fetch(s.channelId).catch(() => null);
  if (!ch?.isTextBased()) {
    console.warn('[leaderboard] không tìm thấy kênh', s.channelId);
    return null;
  }
  const em = await buildLeaderboardEmbed(client, guildId, s.limit || 10);
  // Sửa tin cũ nếu còn
  if (s.messageId) {
    const msg = await ch.messages.fetch(s.messageId).catch(() => null);
    if (msg) {
      await msg.edit({ embeds: [em] }).catch(() => null);
      return msg;
    }
  }
  const msg = await ch.send({ embeds: [em] }).catch(() => null);
  if (msg) await saveLeaderboardSettings(guildId, { messageId: msg.id });
  return msg;
}

module.exports = {
  getLeaderboardSettings,
  saveLeaderboardSettings,
  clearLeaderboardSettings,
  listLeaderboardGuilds,
  buildLeaderboardEmbed,
  updateLeaderboardChannel,
};
