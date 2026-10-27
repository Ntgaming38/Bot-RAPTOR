const fs = require('node:fs');
const path = require('node:path');
const { writeJsonAtomic } = require('./jsonStore');
const config = require('../config');

const FILE = path.join(__dirname, '..', '..', 'data', 'levels.json');

function load() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch { return {}; }
}
function save(db) {
  writeJsonAtomic(FILE, db);
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
  const st = await require('./guildSettings').getGuildSettings(guildId).catch(() => null);
  const xpMin = st?.xpMin ?? config.xpMin;
  const xpMax = st?.xpMax ?? config.xpMax;
  const cooldownMs = (st?.xpCooldownSec ?? config.xpCooldownSec) * 1000;
  if (useMongo()) {
    const { Level } = require('../db');
    const now = Date.now();
    let doc = await Level.findOne({ guildId, userId });
    if (!doc) doc = new Level({ guildId, userId, xp: 0, level: 0, lastMsg: 0 });
    if (now - (doc.lastMsg || 0) < cooldownMs) return null;
    doc.lastMsg = now;
    const gain = Math.floor(Math.random() * (xpMax - xpMin + 1)) + xpMin;
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
  if (now - u.lastMsg < cooldownMs) return null;
  u.lastMsg = now;
  const gain = Math.floor(Math.random() * (xpMax - xpMin + 1)) + xpMin;
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

// Cộng thẳng một lượng XP (không cooldown) — dùng cho XP thoại và admin set.
// Trả về { leveled, level, xp, gain } hoặc null nếu gain <= 0
async function addXpAmount(guildId, userId, gain) {
  gain = Math.floor(Number(gain) || 0);
  if (gain <= 0) return null;
  if (useMongo()) {
    const { Level } = require('../db');
    let doc = await Level.findOne({ guildId, userId });
    if (!doc) doc = new Level({ guildId, userId, xp: 0, level: 0, lastMsg: 0 });
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

// Admin đặt XP/level trực tiếp (lệnh /setxp, /setlevel). Trường nào truyền thì đặt trường đó.
async function setUserXp(guildId, userId, patch) {
  if (useMongo()) {
    const { Level } = require('../db');
    let doc = await Level.findOne({ guildId, userId });
    if (!doc) doc = new Level({ guildId, userId, xp: 0, level: 0, lastMsg: 0 });
    if (patch.level !== undefined) doc.level = Math.max(0, Math.floor(patch.level));
    if (patch.xp !== undefined) doc.xp = Math.max(0, Math.floor(patch.xp));
    // XP không được vượt ngưỡng của level hiện tại
    const cap = xpNeeded(doc.level) - 1;
    if (doc.xp > cap) doc.xp = cap;
    await doc.save();
    return { level: doc.level, xp: doc.xp };
  }
  const db = load();
  const u = getUser(db, guildId, userId);
  if (patch.level !== undefined) u.level = Math.max(0, Math.floor(patch.level));
  if (patch.xp !== undefined) u.xp = Math.max(0, Math.floor(patch.xp));
  const cap = xpNeeded(u.level) - 1;
  if (u.xp > cap) u.xp = cap;
  save(db);
  return { level: u.level, xp: u.xp };
}

// Role thưởng theo cấp (dashboard tab Level): đạt level >= mốc thì nhận role tương ứng.
// Chỉ cộng role còn thiếu; không tự gỡ role mốc cao hơn.
async function applyLevelRewards(guild, member, level) {
  try {
    if (!guild || !member || member.user?.bot) return;
    const st = await require('./guildSettings').getGuildSettings(guild.id).catch(() => null);
    const roles = Array.isArray(st?.levelRoles) ? st.levelRoles : [];
    for (const r of roles) {
      if (!r?.roleId || !Number.isFinite(r.level)) continue;
      if (level >= r.level && !member.roles.cache.has(r.roleId)) {
        await member.roles.add(r.roleId).catch(() => {});
      }
    }
  } catch {}
}

module.exports = { addXp, getRank, getLeaderboard, xpNeeded, addXpAmount, setUserXp, applyLevelRewards };
