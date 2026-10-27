// Rep + Credits + Points kiểu ProBot. Lưu JSON nguyên tử (data/social.json).
const fs = require('node:fs');
const path = require('node:path');
const { writeJsonAtomic } = require('./jsonStore');

const FILE = path.join(__dirname, '..', '..', 'data', 'social.json');
const REP_COOLDOWN_MS = 24 * 3600 * 1000;
const DAILY_CREDITS = 100;

function load() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch { return {}; }
}
function save(db) { writeJsonAtomic(FILE, db); }

function profile(db, guildId, userId) {
  db[guildId] = db[guildId] || {};
  db[guildId][userId] = db[guildId][userId] || { rep: 0, credits: 0, points: 0, lastRepAt: 0, lastRepTo: null, lastDailyAt: 0 };
  return db[guildId][userId];
}

function getProfile(guildId, userId) {
  const db = load();
  return { ...profile(db, guildId, userId) };
}

// Cộng 1 rep cho target. Trả { ok } hoặc { ok:false, retryAfterMs }
function giveRep(guildId, giverId, targetId) {
  const db = load();
  const giver = profile(db, guildId, giverId);
  const now = Date.now();
  if (now - (giver.lastRepAt || 0) < REP_COOLDOWN_MS) {
    return { ok: false, retryAfterMs: REP_COOLDOWN_MS - (now - giver.lastRepAt) };
  }
  giver.lastRepAt = now;
  giver.lastRepTo = targetId;
  const target = profile(db, guildId, targetId);
  target.rep += 1;
  save(db);
  return { ok: true, rep: target.rep };
}

function claimDaily(guildId, userId) {
  const db = load();
  const p = profile(db, guildId, userId);
  const now = Date.now();
  if (now - (p.lastDailyAt || 0) < REP_COOLDOWN_MS) {
    return { ok: false, retryAfterMs: REP_COOLDOWN_MS - (now - p.lastDailyAt) };
  }
  p.lastDailyAt = now;
  p.credits += DAILY_CREDITS;
  save(db);
  return { ok: true, credits: p.credits, amount: DAILY_CREDITS };
}

function addPoints(guildId, userId, amount) {
  const db = load();
  const p = profile(db, guildId, userId);
  p.points = Math.max(0, (p.points || 0) + amount);
  save(db);
  return p.points;
}

function addCredits(guildId, userId, amount) {
  const db = load();
  const p = profile(db, guildId, userId);
  p.credits = Math.max(0, (p.credits || 0) + amount);
  save(db);
  return p.credits;
}

module.exports = { getProfile, giveRep, claimDaily, addPoints, addCredits, DAILY_CREDITS, REP_COOLDOWN_MS };
