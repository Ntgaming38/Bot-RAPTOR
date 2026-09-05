require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const { connectDB, Level } = require('./db');
  const ok = await connectDB();
  if (!ok) {
    console.error('❌ Không kết nối được MongoDB. Kiểm tra MONGODB_URI trong .env');
    process.exit(1);
  }
  const file = path.join(__dirname, '..', 'data', 'levels.json');
  if (!fs.existsSync(file)) {
    console.log('📁 Không thấy data/levels.json, không có gì để migrate.');
    process.exit(0);
  }
  const db = JSON.parse(fs.readFileSync(file, 'utf8'));
  let count = 0;
  for (const [guildId, users] of Object.entries(db)) {
    for (const [userId, v] of Object.entries(users)) {
      await Level.updateOne(
        { guildId, userId },
        { $set: { xp: v.xp || 0, level: v.level || 0, lastMsg: v.lastMsg || 0 } },
        { upsert: true }
      );
      count++;
    }
  }
  console.log(`✅ Đã migrate ${count} bản ghi XP lên MongoDB.`);
  process.exit(0);
}

main();
