const fs = require('node:fs');
const path = require('node:path');
const { embed } = require('./embeds');

const FILE = path.join(__dirname, '..', '..', 'data', 'goodbye.json');
const DEFAULT_TEXT = '👋 {user} vừa rời **{server}**. Hẹn gặp lại! (Còn {members} thành viên)';

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

async function getGoodbye(guildId) {
  if (useMongo()) {
    const { GoodbyeSettings } = require('../db');
    return (await GoodbyeSettings.findOne({ guildId }).lean()) || {};
  }
  return loadAll()[guildId] || {};
}

async function saveGoodbye(guildId, patch) {
  const clean = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) clean[k] = v;
  }
  if (useMongo()) {
    const { GoodbyeSettings } = require('../db');
    await GoodbyeSettings.updateOne({ guildId }, { $set: clean }, { upsert: true });
    return getGoodbye(guildId);
  }
  const all = loadAll();
  all[guildId] = { ...(all[guildId] || {}), ...clean };
  saveAll(all);
  return getGoodbye(guildId);
}

async function clearGoodbye(guildId) {
  if (useMongo()) {
    const { GoodbyeSettings } = require('../db');
    await GoodbyeSettings.deleteOne({ guildId });
  } else {
    const all = loadAll();
    delete all[guildId];
    saveAll(all);
  }
}

function buildGoodbye(member, s) {
  const guild = member.guild;
  const vars = {
    user: `${member}`, mention: `${member}`,
    username: member.user.username, tag: member.user.tag,
    server: guild.name, members: String(guild.memberCount ?? '?'), membercount: String(guild.memberCount ?? '?'),
    created: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`,
  };
  let text = s?.text || DEFAULT_TEXT;
  for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, v);
  return embed({
    title: s?.title || `👋 Tạm biệt ${member.user.username}`,
    description: text.slice(0, 2000),
    thumbnail: s?.imageUrl || member.user.displayAvatarURL(),
    color: s?.color || '#ED4245',
  });
}

module.exports = { getGoodbye, saveGoodbye, clearGoodbye, buildGoodbye, DEFAULT_TEXT };
