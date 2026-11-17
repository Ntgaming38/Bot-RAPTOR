'use strict';

// Chống gửi trùng trong thời gian ngắn: Discord đôi khi phát một sự kiện
// 2 lần (session resume / thành viên rời-vào-rời rất nhanh) khiến tin
// chào/tạm biệt bị đăng 2 bản giống hệt nhau. recently(key) trả về true
// nếu key đã được ghi nhận trong vòng ttlMs — nơi gọi tự quyết định bỏ qua.
const seen = new Map();

function recently(key, ttlMs = 90000) {
  const now = Date.now();
  const at = seen.get(key);
  if (at && now - at < ttlMs) return true;
  seen.set(key, now);
  if (seen.size > 500) {
    for (const [k, t] of seen) if (now - t >= ttlMs) seen.delete(k);
  }
  return false;
}

module.exports = { recently, _seen: seen };
