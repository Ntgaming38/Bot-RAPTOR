// Nhật ký hoạt động gần đây cho thẻ "Hoạt động gần đây" trên trang Overview.
// Mongo (ActivityEvent) khi có, JSON (data/activity.json) khi không — giữ tối đa 50 mục/server.
const fs = require('node:fs');
const path = require('node:path');
const { writeJsonAtomic } = require('./jsonStore');

const FILE = path.join(__dirname, '..', '..', 'data', 'activity.json');
const MAX_PER_GUILD = 50;

function useMongo() {
  try { return require('../db').isMongo(); } catch { return false; }
}
function loadAll() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch { return {}; }
}

// Ghi 1 sự kiện. type: join | leave | level | ticket | giveaway | shop | poll
async function record(guildId, type, text) {
  if (!guildId || !text) return;
  const ev = { guildId: String(guildId), type: String(type || 'info'), text: String(text).slice(0, 200), ts: Date.now() };
  try {
    if (useMongo()) {
      const { ActivityEvent } = require('../db');
      await ActivityEvent.create(ev);
      // Dọn sự kiện cũ hơn 30 ngày (thỉnh thoảng, không chặn)
      if (Math.random() < 0.05) ActivityEvent.deleteMany({ ts: { $lt: Date.now() - 30 * 864e5 } }).catch(() => {});
    } else {
      const db = loadAll();
      const list = db[ev.guildId] || [];
      list.push(ev);
      db[ev.guildId] = list.slice(-MAX_PER_GUILD);
      writeJsonAtomic(FILE, db);
    }
  } catch (e) { console.warn('[activity] ghi lỗi:', e?.message); }
}

async function list(guildId, limit = 8) {
  const n = Math.min(30, Math.max(1, parseInt(limit, 10) || 8));
  try {
    if (useMongo()) {
      const { ActivityEvent } = require('../db');
      const rows = await ActivityEvent.find({ guildId: String(guildId) }).sort({ ts: -1 }).limit(n).lean();
      return rows.map((r) => ({ type: r.type, text: r.text, ts: r.ts }));
    }
    const list = loadAll()[String(guildId)] || [];
    return list.slice(-n).reverse().map((r) => ({ type: r.type, text: r.text, ts: r.ts }));
  } catch { return []; }
}

module.exports = { record, list };
