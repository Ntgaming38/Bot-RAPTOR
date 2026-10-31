// Lưu JSON an toàn hơn cho toàn bộ utils:
// - Ghi NGUYÊN TỬ: ghi vào file tạm cùng thư mục rồi rename đè file chính.
//   Crash/kill giữa lúc ghi chỉ hỏng file tạm, file chính vẫn nguyên — trước đây
//   writeFileSync trực tiếp có thể làm file chính bị cắt nửa, lần đọc sau parse lỗi
//   và bị nuốt thành {} (mất trắng dữ liệu của mọi server trong file đó).
// - Đọc có fallback rõ ràng như cũ.
const fs = require('node:fs');
const path = require('node:path');

let tmpSeq = 0;
const quarantined = new Set();

function readJson(file, fallback) {
  let raw;
  try {
    if (!fs.existsSync(file)) return fallback;
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    // File hỏng: KHÔNG nuốt lặng thành fallback rồi để lần ghi sau ghi đè mất trắng.
    // Cách ly bản hỏng (giữ lại để khôi phục tay) + báo to, mỗi file chỉ báo 1 lần.
    if (!quarantined.has(file)) {
      quarantined.add(file);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dest = `${file}.corrupt-${stamp}`;
      try { fs.renameSync(file, dest); } catch {}
      console.error(`[jsonStore] ⚠️ File dữ liệu HỎNG, đã cách ly: ${file} → ${dest} (${e?.message || e}). Đang chạy với dữ liệu trống cho file này — khôi phục tay từ bản cách ly nếu cần.`);
    }
    return fallback;
  }
}

function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  tmpSeq += 1;
  const tmp = `${file}.tmp-${process.pid}-${tmpSeq}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

module.exports = { readJson, writeJsonAtomic };
