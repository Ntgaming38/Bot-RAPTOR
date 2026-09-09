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
    const rows = await require('../db').StatsSettings.find({
      $or: [{ voiceChannelId: { $ne: null } }, { 'multi.all': { $ne: null } }],
    }).lean().catch(() => []);
    return rows.map((r) => r.guildId);
  }
  return Object.entries(loadAll()).filter(([, v]) => v?.voiceChannelId || v?.multi?.all).map(([g]) => g);
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
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return null;

  // Chế độ multi: 5 kênh riêng như hình (All Members / Members / Bots / Channels / Roles)
  if (s.mode === 'multi' && s.multi?.all) {
    const all = guild.memberCount ?? 0;
    let humans = null, bots = null;
    try {
      const members = await guild.members.fetch();
      bots = members.filter((m) => m.user.bot).size;
      humans = members.size - bots;
    } catch (e) {
      console.warn('[stats] không đếm members/bots được:', e?.message);
    }
    const channels = (await guild.channels.fetch().catch(() => guild.channels.cache))?.size ?? 0;
    const roles = (await guild.roles.fetch().catch(() => guild.roles.cache))?.size ?? 0;
    const targets = [
      [s.multi.all, `🔊 All Members: ${all}`],
      [s.multi.members, humans !== null ? `🔊 Members: ${humans}` : null],
      [s.multi.bots, bots !== null ? `🔊 Bots: ${bots}` : null],
      [s.multi.channels, `🔊 Channels: ${channels}`],
      [s.multi.roles, `🔊 Roles: ${roles}`],
    ];
    for (const [id, name] of targets) {
      if (!id || !name) continue;
      const ch = await guild.channels.fetch(id).catch(() => null);
      if (!ch) continue;
      if (ch.name !== name) await ch.setName(name, 'Cập nhật trạng thái server').catch((e) => console.warn('[stats] đổi tên lỗi:', e?.message));
    }
    const line = `All ${all} • Members ${humans ?? '?'} • Bots ${bots ?? '?'} • Channels ${channels} • Roles ${roles}`;
    console.log(`[stats-multi] ${guild.name}: ${line}`);
    return line;
  }

  if (!s.voiceChannelId) return null;
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

// Dựng category + 5 kênh voice kiểu mẫu (ảnh user gửi), khóa không cho join
async function setupMultiChannels(client, guildId, categoryName) {
  const { ChannelType, PermissionFlagsBits } = require('discord.js');
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) throw new Error('no-guild');
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) throw new Error('no-perm');

  const s = await getStats(guildId);
  let category = s.categoryId ? await guild.channels.fetch(s.categoryId).catch(() => null) : null;
  if (!category) {
    category = await guild.channels.create({ name: categoryName || '_Info Server_', type: ChannelType.GuildCategory });
  }
  const lock = [{ id: guild.id, deny: [PermissionFlagsBits.Connect] }];
  const mk = async (oldId, name) => {
    const old = oldId ? await guild.channels.fetch(oldId).catch(() => null) : null;
    if (old) {
      if (old.parentId !== category.id) await old.setParent(category.id).catch(() => {});
      return old.id;
    }
    const ch = await guild.channels.create({ name, type: ChannelType.GuildVoice, parent: category.id, permissionOverwrites: lock });
    return ch.id;
  };
  const multi = {
    all: await mk(s.multi?.all, '🔊 All Members: ...'),
    members: await mk(s.multi?.members, '🔊 Members: ...'),
    bots: await mk(s.multi?.bots, '🔊 Bots: ...'),
    channels: await mk(s.multi?.channels, '🔊 Channels: ...'),
    roles: await mk(s.multi?.roles, '🔊 Roles: ...'),
  };
  await saveStats(guildId, { mode: 'multi', categoryId: category.id, multi });
  return updateStatsChannel(client, guildId);
}

module.exports = { getStats, saveStats, clearStats, listStatsGuilds, updateStatsChannel, setupMultiChannels, DEFAULT_TEMPLATE };
