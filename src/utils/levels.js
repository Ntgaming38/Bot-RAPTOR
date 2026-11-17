const fs = require('node:fs');
const path = require('node:path');
const { writeJsonAtomic, readJson } = require('./jsonStore');
const config = require('../config');

const FILE = path.join(__dirname, '..', '..', 'data', 'levels.json');

function load() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return readJson(FILE, {});
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

// Chuẩn hóa level sau khi XP đã được $inc (GĐ1 — nguyên tử hóa):
// tính lại (xp, level) từ bản ghi vừa đọc rồi ghi CÓ ĐIỀU KIỆN (chỉ ghi khi
// xp/level còn đúng như vừa đọc). Tiến trình khác chen vào -> modifiedCount=0
// -> đọc lại tính lại, tối đa 5 vòng. Trả về { leveled, level, xp }.
async function normalizeLevels(Level, guildId, userId) {
  for (let i = 0; i < 5; i++) {
    const doc = await Level.findOne({ guildId, userId });
    if (!doc) return null;
    let xp = doc.xp || 0;
    let level = doc.level || 0;
    let leveled = false;
    while (xp >= xpNeeded(level)) {
      xp -= xpNeeded(level);
      level += 1;
      leveled = true;
    }
    if (!leveled) return { leveled: false, level: doc.level || 0, xp: doc.xp || 0 };
    const r = await Level.updateOne(
      { guildId, userId, xp: doc.xp, level: doc.level },
      { $set: { xp, level } },
    );
    if (r?.modifiedCount) return { leveled: true, level, xp };
  }
  const doc = await Level.findOne({ guildId, userId });
  return doc ? { leveled: true, level: doc.level || 0, xp: doc.xp || 0 } : null;
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
    const gain = Math.floor(Math.random() * (xpMax - xpMin + 1)) + xpMin;
    // Nhận cooldown + cộng XP trong MỘT thao tác nguyên tử: filter chỉ khớp
    // khi đã qua cooldown (hoặc chưa có lastMsg). Đang cooldown mà upsert cố
    // tạo bản ghi mới sẽ đụng unique (guildId,userId) -> mã 11000 -> coi như cooldown.
    let updated = null;
    try {
      updated = await Level.findOneAndUpdate(
        { guildId, userId, $or: [{ lastMsg: { $lte: now - cooldownMs } }, { lastMsg: { $exists: false } }] },
        { $inc: { xp: gain }, $set: { lastMsg: now }, $setOnInsert: { guildId, userId, level: 0 } },
        { upsert: true, new: true },
      );
    } catch (e) {
      if (e?.code === 11000) return null;
      throw e;
    }
    if (!updated) return null;
    const norm = await normalizeLevels(Level, guildId, userId);
    return { leveled: !!norm?.leveled, level: norm?.level ?? updated.level ?? 0, xp: norm?.xp ?? updated.xp ?? 0, gain };
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
    // GĐ1: đếm số người đứng trên bằng countDocuments — không tải cả bảng nữa.
    const me = await Level.findOne({ guildId, userId });
    const total = await Level.countDocuments({ guildId });
    if (!me) return { rank: null, total, xp: 0, level: 0, needed: xpNeeded(0) };
    const ahead = await Level.countDocuments({
      guildId,
      $or: [{ level: { $gt: me.level || 0 } }, { level: me.level || 0, xp: { $gt: me.xp || 0 } }],
    });
    return { rank: ahead + 1, total, xp: me.xp || 0, level: me.level || 0, needed: xpNeeded(me.level || 0) };
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
    const updated = await Level.findOneAndUpdate(
      { guildId, userId },
      { $inc: { xp: gain }, $setOnInsert: { guildId, userId, level: 0, lastMsg: 0 } },
      { upsert: true, new: true },
    );
    const norm = await normalizeLevels(Level, guildId, userId);
    return { leveled: !!norm?.leveled, level: norm?.level ?? updated?.level ?? 0, xp: norm?.xp ?? updated?.xp ?? 0, gain };
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
    const cur = await Level.findOne({ guildId, userId });
    const level = patch.level !== undefined ? Math.max(0, Math.floor(patch.level)) : (cur?.level || 0);
    let xp = patch.xp !== undefined ? Math.max(0, Math.floor(patch.xp)) : (cur?.xp || 0);
    // XP không được vượt ngưỡng của level hiện tại
    const cap = xpNeeded(level) - 1;
    if (xp > cap) xp = cap;
    const doc = await Level.findOneAndUpdate(
      { guildId, userId },
      { $set: { level, xp }, $setOnInsert: { guildId, userId, lastMsg: 0 } },
      { upsert: true, new: true },
    );
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
