// Nhiệm vụ hằng ngày (/quests): chat 20 tin, voice 15 phút, điểm danh /credits daily.
// Hoàn thành là tự cộng credits qua social.js. Lưu Mongo (QuestProgress) hoặc JSON.
const fs = require('node:fs');
const path = require('node:path');
const { writeJsonAtomic } = require('./jsonStore');

const FILE = path.join(__dirname, '..', '..', 'data', 'quests.json');
const DEFS = [
  { id: 'chat', name: 'Trò chuyện sôi nổi', desc: 'Gửi 20 tin nhắn trong ngày', target: 20, reward: 50 },
  { id: 'voice', name: 'Giọng nói vàng', desc: 'Ở kênh voice 15 phút', target: 15, reward: 50 },
  { id: 'daily', name: 'Điểm danh chăm chỉ', desc: 'Nhận /credits daily hôm nay', target: 1, reward: 30 },
];

function dayKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}
function useMongo() {
  try { return require('../db').isMongo(); } catch { return false; }
}
function loadAll() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch { return {}; }
}
const blank = () => ({ chat: 0, voice: 0, daily: false, rewarded: {} });

async function getProgress(guildId, userId) {
  const day = dayKey();
  if (useMongo()) {
    const { QuestProgress } = require('../db');
    const doc = await QuestProgress.findOne({ guildId, userId, day }).lean().catch(() => null);
    if (doc) return { chat: doc.chat || 0, voice: doc.voice || 0, daily: !!doc.daily, rewarded: doc.rewarded || {} };
    return blank();
  }
  const db = loadAll();
  return db[`${guildId}:${userId}:${day}`] || blank();
}

async function saveProgress(guildId, userId, row) {
  const day = dayKey();
  if (useMongo()) {
    const { QuestProgress } = require('../db');
    await QuestProgress.updateOne({ guildId, userId, day }, { $set: { chat: row.chat, voice: row.voice, daily: row.daily, rewarded: row.rewarded } }, { upsert: true });
    return;
  }
  const db = loadAll();
  db[`${guildId}:${userId}:${day}`] = row;
  writeJsonAtomic(FILE, db);
}

async function bump(guildId, userId, field, amount = 1) {
  const row = await getProgress(guildId, userId);
  if (field === 'daily') row.daily = true;
  else row[field] = Math.min(9999, (row[field] || 0) + amount);
  let completed = null;
  for (const def of DEFS) {
    const cur = def.id === 'daily' ? (row.daily ? 1 : 0) : (row[def.id] || 0);
    if (cur >= def.target && !row.rewarded[def.id]) {
      row.rewarded[def.id] = true;
      const balance = require('./social').addCredits(guildId, userId, def.reward);
      completed = { ...def, balance };
    }
  }
  await saveProgress(guildId, userId, row);
  return { row, completed };
}

const bumpChat = (g, u) => bump(g, u, 'chat', 1);
const bumpVoice = (g, u) => bump(g, u, 'voice', 1);
const onDaily = (g, u) => bump(g, u, 'daily', 0);

async function listFor(guildId, userId) {
  const row = await getProgress(guildId, userId);
  return DEFS.map((def) => {
    const cur = def.id === 'daily' ? (row.daily ? 1 : 0) : Math.min(def.target, row[def.id] || 0);
    return { ...def, cur, done: !!row.rewarded[def.id] };
  });
}

module.exports = { DEFS, dayKey, getProgress, bumpChat, bumpVoice, onDaily, listFor };
