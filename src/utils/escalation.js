// === LEO THANG HÌNH PHẠT THEO SỐ WARN ===
// Trước đây warn cộng dồn vô hạn mà không có hậu quả thêm (audit H6).
// Nay: đạt mốc warn thì tự leo thang — mặc định 3 warn → timeout 60 phút,
// 5 warn → kick, 7 warn → ban. Admin chỉnh qua /warn escalation (lưu trong
// guildSettings.warnEscalation) — tắt được, đổi mốc được.
// Áp dụng cho CẢ warn tay (/warn add) lẫn warn từ AutoMod, vì cả hai đều
// đi qua addWarn() rồi gọi applyEscalation() ở đây.

const DEFAULTS = { enabled: true, timeoutAt: 3, timeoutMinutes: 60, kickAt: 5, banAt: 7 };

function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function getEscalation(st) {
  const c = (st && st.warnEscalation) || {};
  return {
    enabled: c.enabled !== false,
    timeoutAt: clampInt(c.timeoutAt, 2, 50, DEFAULTS.timeoutAt),
    timeoutMinutes: clampInt(c.timeoutMinutes, 1, 40320, DEFAULTS.timeoutMinutes),
    kickAt: clampInt(c.kickAt, 2, 50, DEFAULTS.kickAt),
    banAt: clampInt(c.banAt, 2, 50, DEFAULTS.banAt),
  };
}

// Mốc cao nhất đã đạt ở số warn này (null = chưa tới mốc nào / đang tắt)
function stepFor(count, cfg) {
  if (!cfg || cfg.enabled === false) return null;
  if (count >= cfg.banAt) return 'ban';
  if (count >= cfg.kickAt) return 'kick';
  if (count >= cfg.timeoutAt) return 'timeout';
  return null;
}

function describeStep(step, cfg) {
  if (step === 'timeout') return `timeout ${cfg.timeoutMinutes} phút (mốc ${cfg.timeoutAt} warn)`;
  if (step === 'kick') return `kick khỏi server (mốc ${cfg.kickAt} warn)`;
  if (step === 'ban') return `ban khỏi server (mốc ${cfg.banAt} warn)`;
  return null;
}

// Thực thi leo thang. Trả về chuỗi mô tả hành động đã làm (để báo lại),
// hoặc null nếu chưa tới mốc / không phạt được (thiếu quyền, chủ server...).
// KHÔNG bao giờ ném lỗi — phạt hụt thì thôi, warn vẫn đã ghi.
async function applyEscalation({ guild, member, count, st, source }) {
  try {
    const cfg = getEscalation(st);
    const step = stepFor(count, cfg);
    if (!step || !guild || !member) return null;
    if (member.id === guild.ownerId) return null;
    const reason = `Leo thang warn: đạt ${count} warn (${source || 'warn'})`;
    if (step === 'timeout') {
      if (!member.moderatable) return null;
      await member.timeout(cfg.timeoutMinutes * 60 * 1000, reason);
    } else if (step === 'kick') {
      if (!member.kickable) return null;
      await member.kick(reason);
    } else if (step === 'ban') {
      if (!member.bannable) return null;
      await member.ban({ reason });
    }
    const desc = describeStep(step, cfg);
    try {
      require('./logger').logMod(guild, `⤴️ Leo thang warn: ${member.user?.tag || member.id} bị **${desc}** — đã đạt ${count} warn.`);
    } catch {}
    try {
      require('./activity').record(guild.id, 'escalation', `@${member.user?.tag || member.id} bị ${desc} (${count} warn)`).catch(() => {});
    } catch {}
    return desc;
  } catch {
    return null;
  }
}

module.exports = { DEFAULTS, getEscalation, stepFor, describeStep, applyEscalation };
