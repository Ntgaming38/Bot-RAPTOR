// Playlist nhạc cá nhân (/playlist): lưu danh sách bài (url + tiêu đề) theo người dùng.
const fs = require('node:fs');
const path = require('node:path');
const { writeJsonAtomic } = require('./jsonStore');

const FILE = path.join(__dirname, '..', '..', 'data', 'playlists.json');
const MAX_TRACKS = 50;
const MAX_LISTS = 10;

function useMongo() {
  try { return require('../db').isMongo(); } catch { return false; }
}
function loadAll() {
  try {
    if (!fs.existsSync(FILE)) return [];
    const v = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}
function saveAll(rows) { writeJsonAtomic(FILE, rows); }
const norm = (name) => String(name || '').trim().toLowerCase().slice(0, 40);

async function save(guildId, userId, name, tracks) {
  const n = norm(name);
  if (!n) throw new Error('Tên playlist trống.');
  const clean = (tracks || []).slice(0, MAX_TRACKS).map((t) => ({ url: String(t.url), title: String(t.title || t.url).slice(0, 120) })).filter((t) => t.url);
  if (!clean.length) throw new Error('Không có bài nào để lưu.');
  if (useMongo()) {
    const { Playlist } = require('../db');
    const mine = await Playlist.countDocuments({ guildId, userId });
    const exists = await Playlist.findOne({ guildId, userId, name: n }).lean();
    if (!exists && mine >= MAX_LISTS) throw new Error(`Mỗi người tối đa ${MAX_LISTS} playlist.`);
    await Playlist.updateOne({ guildId, userId, name: n }, { $set: { tracks: clean, updatedAt: Date.now() } }, { upsert: true });
    return clean.length;
  }
  const rows = loadAll();
  const idx = rows.findIndex((r) => r.guildId === guildId && r.userId === userId && r.name === n);
  if (idx < 0 && rows.filter((r) => r.guildId === guildId && r.userId === userId).length >= MAX_LISTS) throw new Error(`Mỗi người tối đa ${MAX_LISTS} playlist.`);
  const row = { guildId, userId, name: n, tracks: clean, updatedAt: Date.now() };
  if (idx >= 0) rows[idx] = row; else rows.push(row);
  saveAll(rows);
  return clean.length;
}

async function list(guildId, userId) {
  if (useMongo()) {
    const { Playlist } = require('../db');
    const rows = await Playlist.find({ guildId, userId }).lean().catch(() => []);
    return rows.map((r) => ({ name: r.name, count: (r.tracks || []).length }));
  }
  return loadAll().filter((r) => r.guildId === guildId && r.userId === userId).map((r) => ({ name: r.name, count: r.tracks.length }));
}

async function get(guildId, userId, name) {
  const n = norm(name);
  if (useMongo()) {
    const { Playlist } = require('../db');
    const doc = await Playlist.findOne({ guildId, userId, name: n }).lean().catch(() => null);
    return doc ? { name: doc.name, tracks: doc.tracks || [] } : null;
  }
  const row = loadAll().find((r) => r.guildId === guildId && r.userId === userId && r.name === n);
  return row || null;
}

async function remove(guildId, userId, name) {
  const n = norm(name);
  if (useMongo()) {
    const { Playlist } = require('../db');
    const r = await Playlist.deleteOne({ guildId, userId, name: n });
    return r.deletedCount > 0;
  }
  const rows = loadAll();
  const next = rows.filter((r) => !(r.guildId === guildId && r.userId === userId && r.name === n));
  if (next.length === rows.length) return false;
  saveAll(next);
  return true;
}

module.exports = { save, list, get, remove, MAX_TRACKS };
