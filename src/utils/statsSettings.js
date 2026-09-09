const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'data', 'stats.json');
const DEFAULT_TEMPLATE = '🟢 ONLINE • 👥 {members} MEMBERS • 🎮 {voice} ONLINE';

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

async function getStats(guildId) {
  if (useMongo()) {
    const { StatsSettings } = require('../db');
    return (await StatsSettings.findOne({ guildId }).lean()) || {};
  }
  return loadAll()[guildId] || {};
}

async function saveStats(guildId, patch) {
  const clean = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) clean[k] = v;
  }
  if (useMongo()) {
    const { StatsSettings } = require('../db');
    await StatsSettings.updateOne({ guildId }, { $set: clean }, { upsert: true });
    return getStats(guildId);
  }
  const all = loadAll();
  all[guildId] = { ...(all[guildId] || {}), ...clean };
  saveAll(all);
  return getStats(guildId);
}

async function clearStats(guildId) {
  if (useMongo()) {
    const { StatsSettings } = require('../db');
    await StatsSettings.deleteOne({ guildId });
  } else {
    const all = loadAll();
    delete all[guildId];
    saveAll(all);
  }
}

async function listStatsGuilds() {
  if (useMongo()) {
    const rows = await require('../db').StatsSettings.find({ voiceChannelId: { $ne: null } }).lean().catch(() => []);
    return rows.map((r) => r.guildId);
  }
  return Object.entries(loadAll()).filter(([, v]) => v?.voiceChannelId).map(([g]) => g);
}

function formatTemplate(tpl, v) {
  return String(tpl || DEFAULT_TEMPLATE)
    .replaceAll('{server}', v.server || '')
    .replaceAll('{members}', String(v.members ?? '?'))
    .replaceAll('{online}', String(v.online ?? '?'))
    .replaceAll('{voice}', String(v.voice ?? '?'))
    .slice(0, 100);
}

// Đếm số liệu + đổi tên kênh voice (Discord giới hạn đổi tên → gọi mỗi 15 phút)
async function updateStatsChannel(client, guildId) {
  const s = await getStats(guildId);
  if (!s.voiceChannelId) return null;
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return null;
  const members = guild.memberCount ?? 0;
  const voice = guild.voiceStates?.cache?.size ?? 0;
  let online = null;
  try {
    const all = await guild.members.fetch();
    online = all.filter((m) => !m.user.bot && m.presence?.status && m.presence.status !== 'offline').size;
  } catch (e) {
    console.warn('[stats] không đếm online được (cần bật Presence Intent):', e?.message);
  }
  const name = formatTemplate(s.template, { server: guild.name, members, online, voice });
  const ch = await guild.channels.fetch(s.voiceChannelId).catch(() => null);
  if (!ch) {
    console.warn('[stats] không tìm thấy kênh', s.voiceChannelId);
    return null;
  }
  if (ch.name !== name) await ch.setName(name, 'Cập nhật trạng thái server').catch((e) => console.warn('[stats] đổi tên lỗi:', e?.message));
  console.log(`[stats] ${guild.name}: ${name}`);
  return name;
}

module.exports = { getStats, saveStats, clearStats, listStatsGuilds, updateStatsChannel, DEFAULT_TEMPLATE };
