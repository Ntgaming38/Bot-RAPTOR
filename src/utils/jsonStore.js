// Lưu JSON an toàn hơn cho toàn bộ utils:
// - Ghi NGUYÊN TỬ: ghi vào file tạm cùng thư mục rồi rename đè file chính.
//   Crash/kill giữa lúc ghi chỉ hỏng file tạm, file chính vẫn nguyên — trước đây
//   writeFileSync trực tiếp có thể làm file chính bị cắt nửa, lần đọc sau parse lỗi
//   và bị nuốt thành {} (mất trắng dữ liệu của mọi server trong file đó).
// - Đọc có fallback rõ ràng như cũ.
const fs = require('node:fs');
const path = require('node:path');

let tmpSeq = 0;

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
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
