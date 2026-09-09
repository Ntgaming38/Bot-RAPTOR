const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'data', 'warns.json');

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
const key = (g, u) => `${g}:${u}`;

async function addWarn(guildId, userId, by, byTag, reason) {
  const entry = { by, byTag, reason: reason || 'Không có lý do', at: Date.now() };
  if (useMongo()) {
    const { Warn } = require('../db');
    const doc = await Warn.findOneAndUpdate(
      { guildId, userId },
      { $push: { list: entry } },
      { upsert: true, new: true }
    );
    return doc.list.length;
  }
  const all = loadAll();
  all[key(guildId, userId)] = all[key(guildId, userId)] || [];
  all[key(guildId, userId)].push(entry);
  saveAll(all);
  return all[key(guildId, userId)].length;
}

async function listWarns(guildId, userId) {
  if (useMongo()) {
    const { Warn } = require('../db');
    const doc = await Warn.findOne({ guildId, userId }).lean();
    return doc?.list || [];
  }
  return loadAll()[key(guildId, userId)] || [];
}

async function clearWarns(guildId, userId) {
  if (useMongo()) {
    const { Warn } = require('../db');
    await Warn.deleteOne({ guildId, userId });
  } else {
    const all = loadAll();
    delete all[key(guildId, userId)];
    saveAll(all);
  }
}

module.exports = { addWarn, listWarns, clearWarns };
