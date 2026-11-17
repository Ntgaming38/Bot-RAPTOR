// Cap quyen doi biet danh bot theo ID NGUOI DUNG Discord (chu bot cap).
// Mo hinh (chu bot chot 2026-11-18): quyen di theo NGUOI, khong theo
// server — chi dung tai khoan duoc cap moi doi duoc biet danh bot trong
// cac server nguoi do quan ly; admin khac cung server khong co quyen.
// Luu Mongo (model RenameGrant) hoac file data/rename-grants.json khi
// khong co Mongo. renameKeys.js (key theo server) da bi thay the.
const fs = require('fs');
const path = require('path');
const db = require('../db');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const FILE = path.join(DATA_DIR, 'rename-grants.json');

function useMongo() {
  try { return db.isMongo(); } catch { return false; }
}

function readFile() {
  try {
    const arr = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function writeFile(rows) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(rows, null, 2));
  } catch (e) { console.error('[renameGrants] ghi file loi:', e.message); }
}

function validateUserId(id) {
  const s = String(id || '').trim();
  return /^\d{17,20}$/.test(s) ? s : null;
}

function validateNickname(name) {
  if (name == null) return null;
  const s = String(name).trim();
  if (s.length > 32) return undefined;
  return s;
}

async function grantUser(userId, { note = '', grantedBy = '' } = {}) {
  const uid = validateUserId(userId);
  if (!uid) return { ok: false, error: 'invalid-id' };
  const cleanNote = String(note || '').slice(0, 100);
  if (useMongo()) {
    await db.RenameGrant.updateOne(
      { userId: uid },
      { $set: { note: cleanNote, grantedBy: String(grantedBy || ''), createdAt: new Date() } },
      { upsert: true },
    );
  } else {
    const rows = readFile().filter((r) => r.userId !== uid);
    rows.push({ userId: uid, note: cleanNote, grantedBy: String(grantedBy || ''), createdAt: new Date().toISOString() });
    writeFile(rows);
  }
  return { ok: true, userId: uid };
}

async function revokeUser(userId) {
  const uid = validateUserId(userId);
  if (!uid) return false;
  if (useMongo()) {
    const r = await db.RenameGrant.deleteOne({ userId: uid });
    return r.deletedCount > 0;
  }
  const rows = readFile();
  const next = rows.filter((r) => r.userId !== uid);
  if (next.length === rows.length) return false;
  writeFile(next);
  return true;
}

async function hasGrant(userId) {
  const uid = validateUserId(userId);
  if (!uid) return false;
  if (useMongo()) return !!(await db.RenameGrant.findOne({ userId: uid }).lean().catch(() => null));
  return readFile().some((r) => r.userId === uid);
}

async function listGrants() {
  let rows;
  if (useMongo()) rows = await db.RenameGrant.find({}).lean().catch(() => []);
  else rows = readFile();
  return rows
    .map((r) => ({
      userId: String(r.userId),
      note: r.note || '',
      grantedBy: r.grantedBy || '',
      createdAt: r.createdAt || null,
    }))
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

module.exports = { grantUser, revokeUser, hasGrant, listGrants, validateUserId, validateNickname };
