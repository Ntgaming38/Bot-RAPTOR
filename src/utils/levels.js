const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');

const FILE = path.join(__dirname, '..', '..', 'data', 'levels.json');

function load() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch { return {}; }
}
function save(db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db));
}

function useMongo() {
  try {
    return require('../db').isMongo();
  } catch { return false; }
}

// XP cần để từ level L lên L+1 (công thức kiểu MEE6)
function xpNeeded(level) {
  return 5 * level * level + 50 * level + 100;
}

function getUser(db, guildId, userId) {
  db[guildId] = db[guildId] || {};
  db[guildId][userId] = db[guildId][userId] || { xp: 0, level: 0, lastMsg: 0 };
  return db[guildId][userId];
}

// Cộng XP khi nhắn tin. Trả về { leveled, level, xp } hoặc null nếu đang cooldown
async function addXp(guildId, userId) {
  if (useMongo()) {
    const { Level } = require('../db');
    const now = Date.now();
    let doc = await Level.findOne({ guildId, userId });
    if (!doc) doc = new Level({ guildId, userId, xp: 0, level: 0, lastMsg: 0 });
    if (now - (doc.lastMsg || 0) < config.xpCooldownSec * 1000) return null;
    doc.lastMsg = now;
    const gain = Math.floor(Math.random() * (config.xpMax - config.xpMin + 1)) + config.xpMin;
    doc.xp += gain;
    let leveled = false;
    while (doc.xp >= xpNeeded(doc.level)) {
      doc.xp -= xpNeeded(doc.level);
      doc.level += 1;
      leveled = true;
    }
    await doc.save();
    return { leveled, level: doc.level, xp: doc.xp, gain };
  }
  const db = load();
  const u = getUser(db, guildId, userId);
  const now = Date.now();
  if (now - u.lastMsg < config.xpCooldownSec * 1000) return null;
  u.lastMsg = now;
  const gain = Math.floor(Math.random() * (config.xpMax - config.xpMin + 1)) + config.xpMin;
  u.xp += gain;

  let leveled = false;
  while (u.xp >= xpNeeded(u.level)) {
    u.xp -= xpNeeded(u.level);
    u.level += 1;
    leveled = true;
  }
  save(db);
  return { leveled, level: u.level, xp: u.xp, gain };
}

async function getRank(guildId, userId) {
  if (useMongo()) {
    const { Level } = require('../db');
    const all = await Level.find({ guildId }).sort({ level: -1, xp: -1 }).lean();
    const idx = all.findIndex(d => d.userId === userId);
    const me = all[idx] || { xp: 0, level: 0 };
    return { rank: idx >= 0 ? idx + 1 : null, total: all.length, xp: me.xp || 0, level: me.level || 0, needed: xpNeeded(me.level || 0) };
  }
  const db = load();
  const guild = db[guildId] || {};
  const sorted = Object.entries(guild).sort((a, b) => {
    if (b[1].level !== a[1].level) return b[1].level - a[1].level;
    return b[1].xp - a[1].xp;
  });
  const idx = sorted.findIndex(([id]) => id === userId);
  const me = guild[userId] || { xp: 0, level: 0 };
  return { rank: idx >= 0 ? idx + 1 : null, total: sorted.length, ...me, needed: xpNeeded(me.level) };
}

async function getLeaderboard(guildId, limit = 10) {
  if (useMongo()) {
    const { Level } = require('../db');
    const all = await Level.find({ guildId }).sort({ level: -1, xp: -1 }).limit(limit).lean();
    return all.map((d, i) => ({ rank: i + 1, userId: d.userId, xp: d.xp, level: d.level }));
  }
  const db = load();
  const guild = db[guildId] || {};
  return Object.entries(guild)
    .sort((a, b) => (b[1].level - a[1].level) || (b[1].xp - a[1].xp))
    .slice(0, limit)
    .map(([id, v], i) => ({ rank: i + 1, userId: id, ...v }));
}

module.exports = { addXp, getRank, getLeaderboard, xpNeeded };
