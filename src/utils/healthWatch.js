// Cảnh báo sức khỏe bot cho chủ bot qua DM Discord:
// - Bot vừa khởi động (nghi restart bất thường nếu không phải giờ bảo trì).
// - RAM vượt ~85% trần 512MB của gói Free (có thời gian chờ giữa các lần báo).
const fs = require('node:fs');
const path = require('node:path');
const { writeJsonAtomic, readJson } = require('./jsonStore');

const FILE = path.join(__dirname, '..', '..', 'data', 'health.json');
const RAM_LIMIT_MB = 512;
const RAM_WARN_MB = Math.round(RAM_LIMIT_MB * 0.85);

function loadState() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return readJson(FILE, {});
  } catch { return {}; }
}
function saveState(s) { writeJsonAtomic(FILE, s); }

let ownerId = null;
async function getOwner(client) {
  if (ownerId) return ownerId;
  try {
    const app = client.application || await client.fetchApplication().catch(() => null);
    const full = app?.owner ? app : await client.application?.fetch().catch(() => null);
    ownerId = full?.owner?.id || full?.owner?.user?.id || null;
  } catch {}
  return ownerId;
}
async function dmOwner(client, text) {
  const id = await getOwner(client);
  if (!id) return false;
  const user = await client.users.fetch(id).catch(() => null);
  if (!user) return false;
  await user.send(text).catch(() => null);
  return true;
}

let started = false;
function start(client) {
  if (started) return;
  started = true;
  console.log('🩺 Đã bật cảnh báo sức khỏe bot (khởi động + RAM)');
  // Thông báo khởi động (chống spam: tối đa 1 lần / 10 phút dù crash-loop)
  setTimeout(async () => {
    try {
      const st = loadState();
      if (Date.now() - (st.lastBootNotice || 0) < 10 * 60_000) return;
      st.lastBootNotice = Date.now();
      saveState(st);
      const when = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      await dmOwner(client, `🤖 **RAPTOR vừa khởi động** lúc ${when}.\nNếu bạn không vừa restart/deploy, có thể bot đã tự chạy lại (hết RAM hoặc nền tảng chập chờn) — kiểm tra Botkeep khi rảnh nhé.`);
    } catch {}
  }, 45_000);
  // Kiểm tra RAM mỗi 2 phút, báo tối đa 1 lần / 30 phút
  let lastRamAlert = 0;
  setInterval(async () => {
    try {
      const mb = Math.round(process.memoryUsage().rss / 1048576);
      if (mb >= RAM_WARN_MB && Date.now() - lastRamAlert > 30 * 60_000) {
        lastRamAlert = Date.now();
        await dmOwner(client, `⚠️ **RAPTOR đang dùng RAM cao: ${mb}/${RAM_LIMIT_MB} MB** (ngưỡng báo ${RAM_WARN_MB} MB).\nGói Free sắp chạm trần — bot có thể bị tự restart bất cứ lúc nào. Bạn có thể bấm “Khởi động lại bot” trong dashboard (trang Overview) để giải phóng RAM.`);
      }
    } catch {}
  }, 2 * 60_000);
}

module.exports = { start, RAM_WARN_MB, RAM_LIMIT_MB };
