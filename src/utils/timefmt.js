// Định dạng ngày giờ theo timezone của server (mặc định Asia/Ho_Chi_Minh).
// Đọc cache đồng bộ để dùng được cả trong hàm sync (welcome...).

function getTz(guildId) {
  try {
    const { getCached } = require('./guildSettings');
    return getCached(guildId)?.timezone || 'Asia/Ho_Chi_Minh';
  } catch {
    return 'Asia/Ho_Chi_Minh';
  }
}

function fmtDT(when = Date.now(), tz, locale = 'vi-VN') {
  try {
    return new Date(when).toLocaleString(locale, { timeZone: tz || getTz() });
  } catch {
    return new Date(when).toLocaleString(locale);
  }
}

function fmtDTGuild(when, guildId, locale = 'vi-VN') {
  return fmtDT(when, getTz(guildId), locale);
}

module.exports = { getTz, fmtDT, fmtDTGuild };
