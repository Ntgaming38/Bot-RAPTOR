// === KEY ĐỔI BIỆT DANH BOT THEO SERVER ===
// Chủ bot nắm quyền cấp key (qua Telegram /key hoặc dashboard): server nào
// được cấp key thì admin của server đó mới đặt được BIỆT DANH (nickname)
// cho bot trong server của họ — tên gốc + avatar toàn cục vẫn chỉ chủ bot
// đổi. Quyết định của chủ bot 2026-11-18: "Key mở đổi tên RIÊNG trong
// server đó".
//
// Bảo mật: chỉ lưu sha256(key) — key gốc hiện đúng 1 lần lúc tạo. Một key
// gắn vào đúng 1 server (lần nhập đầu tiên); chủ bot hủy theo server thì
// server mất quyền ngay. Lưu Mongo (model RenameKey) hoặc JSON fallback.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { writeJsonAtomic, readJson } = require('./jsonStore');

const FILE = path.join(__dirname, '..', '..', 'data', 'rename-keys.json');
// Bỏ các ký tự dễ nhầm (0/O, 1/I/L) để đọc qua điện thoại không sai
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function useMongo() {
  try {
    return require('../db').isMongo();
  } catch { return false; }
}

function hashKey(key) {
  return crypto.createHash('sha256').update(String(key || '').trim().toUpperCase()).digest('hex');
}

function generateKey() {
  let raw = '';
  const bytes = crypto.randomBytes(15);
  for (let i = 0; i < 15; i++) raw += ALPHABET[bytes[i] % ALPHABET.length];
  return `RPT-${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}`;
}

// Chuẩn hóa key người dùng nhập: bỏ khoảng trắng, viết hoa — "rpt-xxxxx..."
// hay gõ liền không dấu gạch cũng nhận.
function normalizeKey(raw) {
  const s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!s.startsWith('RPT') || s.length !== 18) return null;
  return `RPT-${s.slice(3, 8)}-${s.slice(8, 13)}-${s.slice(13, 18)}`;
}

// --- JSON fallback ---
function loadAll() {
  try {
    if (!fs.existsSync(FILE)) return [];
    const d = readJson(FILE, []);
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}
function saveAll(list) {
  writeJsonAtomic(FILE, list);
}

function pub(rec) {
  if (!rec) return null;
  return {
    guildId: rec.guildId || null,
    note: rec.note || '',
    createdBy: rec.createdBy || null,
    createdAt: rec.createdAt || 0,
    redeemedAt: rec.redeemedAt || null,
    hashPrefix: String(rec.keyHash || '').slice(0, 8),
  };
}

// Tạo key mới — trả key gốc đúng 1 lần kèm bản ghi công khai.
async function createKey({ createdBy = null, note = '' } = {}) {
  const key = generateKey();
  const rec = {
    keyHash: hashKey(key),
    guildId: null,
    note: String(note || '').slice(0, 100),
    createdBy: createdBy ? String(createdBy) : null,
    createdAt: Date.now(),
    redeemedAt: null,
  };
  if (useMongo()) {
    const { RenameKey } = require('../db');
    await RenameKey.create(rec);
  } else {
    const list = loadAll();
    list.push(rec);
    saveAll(list);
  }
  return { key, record: pub(rec) };
}

async function findByHash(keyHash) {
  if (useMongo()) {
    const { RenameKey } = require('../db');
    return RenameKey.findOne({ keyHash }).lean();
  }
  return loadAll().find((r) => r.keyHash === keyHash) || null;
}

async function getKeyForGuild(guildId) {
  if (!guildId) return null;
  if (useMongo()) {
    const { RenameKey } = require('../db');
    const rec = await RenameKey.findOne({ guildId: String(guildId) }).lean();
    return pub(rec);
  }
  return pub(loadAll().find((r) => r.guildId === String(guildId)) || null);
}

async function hasAccess(guildId) {
  return !!(await getKeyForGuild(guildId));
}

// Nhập key cho 1 server. Trả { ok: true, record } hoặc { ok: false, error }.
// - Key không tồn tại / sai định dạng -> 'invalid'
// - Key đã gắn server KHÁC -> 'used'
// - Key đã gắn đúng server này -> ok (nhập lại vô hại)
// - Server đã có key khác đang gắn -> 'guild-has-key' (chủ bot hủy key cũ trước)
async function redeemKey(guildId, rawKey) {
  const key = normalizeKey(rawKey);
  if (!key) return { ok: false, error: 'invalid' };
  const gid = String(guildId);
  const keyHash = hashKey(key);
  const rec = await findByHash(keyHash);
  if (!rec) return { ok: false, error: 'invalid' };
  if (rec.guildId && rec.guildId !== gid) return { ok: false, error: 'used' };
  if (rec.guildId === gid) return { ok: true, record: pub(rec) };
  const existing = await getKeyForGuild(gid);
  if (existing) return { ok: false, error: 'guild-has-key' };
  const now = Date.now();
  if (useMongo()) {
    const { RenameKey } = require('../db');
    await RenameKey.updateOne({ keyHash }, { $set: { guildId: gid, redeemedAt: now } });
  } else {
    const list = loadAll();
    const r = list.find((x) => x.keyHash === keyHash);
    if (r) { r.guildId = gid; r.redeemedAt = now; saveAll(list); }
  }
  return { ok: true, record: pub({ ...rec, guildId: gid, redeemedAt: now }) };
}

// Hủy mọi key đã gắn vào server này — trả số key đã hủy.
async function revokeGuild(guildId) {
  const gid = String(guildId);
  if (useMongo()) {
    const { RenameKey } = require('../db');
    const r = await RenameKey.deleteMany({ guildId: gid });
    return r?.deletedCount || 0;
  }
  const list = loadAll();
  const kept = list.filter((r) => r.guildId !== gid);
  saveAll(kept);
  return list.length - kept.length;
}

async function listKeys() {
  if (useMongo()) {
    const { RenameKey } = require('../db');
    const rows = await RenameKey.find({}).sort({ createdAt: -1 }).lean();
    return rows.map(pub);
  }
  return [...loadAll()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(pub);
}

function validateNickname(raw) {
  const name = String(raw ?? '').trim();
  if (name.length < 1 || name.length > 32) return null;
  return name;
}

module.exports = {
  createKey, redeemKey, revokeGuild, listKeys, getKeyForGuild, hasAccess,
  generateKey, normalizeKey, hashKey, validateNickname,
};
