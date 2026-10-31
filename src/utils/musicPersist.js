// Lưu hàng đợi nhạc xuống kho (Mongo hoặc JSON) để bot tự phát tiếp sau khi khởi động lại.
const fs = require('node:fs');
const path = require('node:path');
const { writeJsonAtomic, readJson } = require('./jsonStore');

const FILE = path.join(__dirname, '..', '..', 'data', 'music-queues.json');

function useMongo() {
  try { return require('../db').isMongo(); } catch { return false; }
}
function loadAll() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return readJson(FILE, {});
  } catch { return {}; }
}

async function save(guildId, snap) {
  const data = { guildId: String(guildId), voiceChannelId: snap.voiceChannelId || null, textChannelId: snap.textChannelId || null, volume: snap.volume ?? null, current: snap.current || null, tracks: (snap.tracks || []).slice(0, 100), ts: Date.now() };
  try {
    if (useMongo()) {
      const { MusicQueue } = require('../db');
      await MusicQueue.updateOne({ guildId: data.guildId }, { $set: data }, { upsert: true });
    } else {
      const db = loadAll();
      db[data.guildId] = data;
      writeJsonAtomic(FILE, db);
    }
  } catch (e) { console.warn('[music-persist] lưu lỗi:', e?.message); }
}

async function clear(guildId) {
  try {
    if (useMongo()) {
      const { MusicQueue } = require('../db');
      await MusicQueue.deleteOne({ guildId: String(guildId) });
    } else {
      const db = loadAll();
      delete db[String(guildId)];
      writeJsonAtomic(FILE, db);
    }
  } catch {}
}

async function all() {
  try {
    if (useMongo()) {
      const { MusicQueue } = require('../db');
      const rows = await MusicQueue.find({}).lean();
      return rows.map((r) => ({ guildId: r.guildId, voiceChannelId: r.voiceChannelId, textChannelId: r.textChannelId, volume: r.volume, current: r.current, tracks: r.tracks || [], ts: r.ts }));
    }
    return Object.values(loadAll());
  } catch { return []; }
}

module.exports = { save, clear, all };
