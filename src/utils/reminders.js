// Nhắc việc /remind: lưu trữ (Mongo hoặc JSON) + quét mỗi 20 giây để nhắc đúng hạn.
// Bot khởi động lại vẫn nhắc được vì dữ liệu không nằm trong RAM.
const fs = require('node:fs');
const path = require('node:path');
const { writeJsonAtomic } = require('./jsonStore');

const FILE = path.join(__dirname, '..', '..', 'data', 'reminders.json');

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

async function add({ guildId, channelId, userId, text, dueAt }) {
  const row = { guildId: String(guildId), channelId: String(channelId), userId: String(userId), text: String(text || '').slice(0, 500), dueAt: Number(dueAt), done: false };
  if (useMongo()) {
    const { Reminder } = require('../db');
    const doc = await Reminder.create(row);
    return String(doc._id);
  }
  const rows = loadAll();
  row.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  rows.push(row);
  saveAll(rows);
  return row.id;
}

async function pending() {
  if (useMongo()) {
    const { Reminder } = require('../db');
    const rows = await Reminder.find({ done: { $ne: true } }).lean();
    return rows.map((r) => ({ id: String(r._id), ...r }));
  }
  return loadAll().filter((r) => !r.done);
}

async function markDone(id) {
  if (useMongo()) {
    const { Reminder } = require('../db');
    await Reminder.deleteOne({ _id: id }).catch(() => {});
    return;
  }
  saveAll(loadAll().filter((r) => String(r.id) !== String(id)));
}

let started = false;
function startScanner(client) {
  if (started) return;
  started = true;
  const tick = async () => {
    try {
      const now = Date.now();
      const rows = await pending();
      for (const r of rows) {
        if (r.dueAt > now) continue;
        await markDone(r.id);
        try {
          const ch = await client.channels.fetch(r.channelId).catch(() => null);
          if (ch?.isTextBased()) {
            await ch.send({ content: `⏰ <@${r.userId}> ơi, đến giờ rồi: **${r.text}**`, allowedMentions: { users: [r.userId] } }).catch(() => {});
          }
        } catch {}
      }
    } catch (e) { console.warn('[remind] quét lỗi:', e?.message); }
  };
  setInterval(tick, 20_000);
  setTimeout(tick, 8_000);
  console.log('⏰ Đã bật quét nhắc việc (/remind)');
}

module.exports = { add, pending, markDone, startScanner };
