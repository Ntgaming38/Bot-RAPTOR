// Rep + Credits + Points kiểu ProBot.
// Lưu trữ dual-mode như các util khác: Mongo (model SocialProfile) khi backend
// chốt 'mongo' lúc boot, ngược lại JSON nguyên tử (data/social.json).
// Mọi hàm đều async — phía Mongo dùng update có điều kiện/$inc nguyên tử.
const path = require('node:path');
const { writeJsonAtomic, readJson } = require('./jsonStore');

const FILE = path.join(__dirname, '..', '..', 'data', 'social.json');
const REP_COOLDOWN_MS = 24 * 3600 * 1000;
const DAILY_CREDITS = 100;

function useMongo() {
  try { return require('../db').isMongo(); } catch { return false; }
}
function model() { return require('../db').SocialProfile; }

const BLANK = () => ({ rep: 0, credits: 0, points: 0, lastRepAt: 0, lastRepTo: null, lastDailyAt: 0 });

// ---------- JSON mode ----------
function load() { return readJson(FILE, {}); }
function save(db) { writeJsonAtomic(FILE, db); }
function profileIn(db, guildId, userId) {
  db[guildId] = db[guildId] || {};
  db[guildId][userId] = db[guildId][userId] || BLANK();
  return db[guildId][userId];
}

// ---------- Mongo helpers ----------
function shape(doc) {
  if (!doc) return BLANK();
  return {
    rep: doc.rep || 0, credits: doc.credits || 0, points: doc.points || 0,
    lastRepAt: doc.lastRepAt || 0, lastRepTo: doc.lastRepTo ?? null, lastDailyAt: doc.lastDailyAt || 0,
  };
}

async function getProfile(guildId, userId) {
  if (useMongo()) {
    const doc = await model().findOne({ guildId, userId }).lean();
    return shape(doc);
  }
  const db = load();
  return { ...profileIn(db, guildId, userId) };
}

// Cộng 1 rep cho target. Trả { ok, rep } hoặc { ok:false, retryAfterMs }
async function giveRep(guildId, giverId, targetId) {
  const now = Date.now();
  if (useMongo()) {
    const M = model();
    const since = now - REP_COOLDOWN_MS;
    // Cập nhật có điều kiện: chỉ qua được khi cooldown đã hết (hoặc chưa từng rep).
    let giver = await M.findOneAndUpdate(
      { guildId, userId: giverId, $or: [{ lastRepAt: { $lte: since } }, { lastRepAt: { $exists: false } }] },
      { $set: { lastRepAt: now, lastRepTo: targetId } },
      { returnDocument: 'after' },
    ).lean();
    if (!giver) {
      const existing = await M.findOne({ guildId, userId: giverId }).lean();
      if (existing) return { ok: false, retryAfterMs: REP_COOLDOWN_MS - (now - (existing.lastRepAt || 0)) };
      // Chưa có hồ sơ: tạo mới, đây là lần rep đầu tiên.
      giver = await M.findOneAndUpdate(
        { guildId, userId: giverId },
        { $set: { lastRepAt: now, lastRepTo: targetId } },
        { upsert: true, returnDocument: 'after' },
      ).lean();
    }
    const target = await M.findOneAndUpdate(
      { guildId, userId: targetId },
      { $inc: { rep: 1 } },
      { upsert: true, returnDocument: 'after' },
    ).lean();
    return { ok: true, rep: target?.rep ?? 1 };
  }
  const db = load();
  const giver = profileIn(db, guildId, giverId);
  if (now - (giver.lastRepAt || 0) < REP_COOLDOWN_MS) {
    return { ok: false, retryAfterMs: REP_COOLDOWN_MS - (now - giver.lastRepAt) };
  }
  giver.lastRepAt = now;
  giver.lastRepTo = targetId;
  const target = profileIn(db, guildId, targetId);
  target.rep += 1;
  save(db);
  return { ok: true, rep: target.rep };
}

async function claimDaily(guildId, userId) {
  const now = Date.now();
  if (useMongo()) {
    const M = model();
    const since = now - REP_COOLDOWN_MS;
    let doc = await M.findOneAndUpdate(
      { guildId, userId, $or: [{ lastDailyAt: { $lte: since } }, { lastDailyAt: { $exists: false } }] },
      { $set: { lastDailyAt: now }, $inc: { credits: DAILY_CREDITS } },
      { returnDocument: 'after' },
    ).lean();
    if (!doc) {
      const existing = await M.findOne({ guildId, userId }).lean();
      if (existing) return { ok: false, retryAfterMs: REP_COOLDOWN_MS - (now - (existing.lastDailyAt || 0)) };
      doc = await M.findOneAndUpdate(
        { guildId, userId },
        { $set: { lastDailyAt: now }, $inc: { credits: DAILY_CREDITS } },
        { upsert: true, returnDocument: 'after' },
      ).lean();
    }
    return { ok: true, credits: doc?.credits ?? DAILY_CREDITS, amount: DAILY_CREDITS };
  }
  const db = load();
  const p = profileIn(db, guildId, userId);
  if (now - (p.lastDailyAt || 0) < REP_COOLDOWN_MS) {
    return { ok: false, retryAfterMs: REP_COOLDOWN_MS - (now - p.lastDailyAt) };
  }
  p.lastDailyAt = now;
  p.credits += DAILY_CREDITS;
  save(db);
  return { ok: true, credits: p.credits, amount: DAILY_CREDITS };
}

// Cộng/trừ có kẹp sàn 0 — phía Mongo dùng pipeline update để giữ nguyên tử.
async function addField(guildId, userId, field, amount) {
  if (useMongo()) {
    const doc = await model().findOneAndUpdate(
      { guildId, userId },
      [{ $set: { [field]: { $max: [0, { $add: [{ $ifNull: [`$${field}`, 0] }, amount] }] } } }],
      { upsert: true, returnDocument: 'after' },
    ).lean();
    return doc?.[field] ?? Math.max(0, amount);
  }
  const db = load();
  const p = profileIn(db, guildId, userId);
  p[field] = Math.max(0, (p[field] || 0) + amount);
  save(db);
  return p[field];
}

async function addPoints(guildId, userId, amount) { return addField(guildId, userId, 'points', amount); }
async function addCredits(guildId, userId, amount) { return addField(guildId, userId, 'credits', amount); }

// Chuyển một lần dữ liệu JSON cũ → Mongo khi bot chạy ở chế độ Mongo:
// economy trước đây CHỈ có JSON, nên lần đầu bật dual-mode mà không chuyển thì
// số dư của mọi người sẽ "về 0". Chỉ chèn khi Mongo chưa có hồ sơ ($setOnInsert)
// — dữ liệu Mongo hiện hữu luôn thắng, chạy lại nhiều lần vô hại.
let migratedOnce = false;
async function migrateJsonOnce() {
  if (migratedOnce || !useMongo()) return;
  migratedOnce = true;
  try {
    const data = load();
    let n = 0;
    for (const [guildId, users] of Object.entries(data || {})) {
      for (const [userId, p] of Object.entries(users || {})) {
        await model().updateOne(
          { guildId, userId },
          {
            $setOnInsert: {
              rep: p.rep || 0, credits: p.credits || 0, points: p.points || 0,
              lastRepAt: p.lastRepAt || 0, lastRepTo: p.lastRepTo ?? null, lastDailyAt: p.lastDailyAt || 0,
            },
          },
          { upsert: true },
        );
        n++;
      }
    }
    if (n) console.log(`[social] đã chuyển ${n} hồ sơ economy từ JSON sang Mongo (chỉ chèn hồ sơ chưa có).`);
  } catch (e) {
    console.warn('[social] migrate JSON→Mongo lỗi:', e?.message || e);
  }
}

module.exports = { getProfile, giveRep, claimDaily, addPoints, addCredits, migrateJsonOnce, DAILY_CREDITS, REP_COOLDOWN_MS };
