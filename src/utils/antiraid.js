// Anti-Raid kiểu ProBot: phát hiện nhiều tài khoản mới vào server trong thời gian ngắn
// và xử lý cả loạt (timeout/kick/ban). Trạng thái theo dõi giữ trong RAM theo cửa sổ trượt.
const joins = new Map(); // guildId -> [{ userId, at, createdAt }]

function getAntiraid(st) {
  const a = (st && st.antiraid) || {};
  return {
    enabled: !!a.enabled,
    ageDays: [0, 7, 30, 90].includes(parseInt(a.ageDays, 10)) ? parseInt(a.ageDays, 10) : 7,
    count: Math.min(100, Math.max(3, parseInt(a.count, 10) || 5)),
    windowSecs: Math.min(600, Math.max(5, parseInt(a.windowSecs, 10) || 30)),
    action: ['timeout', 'kick', 'ban'].includes(a.action) ? a.action : 'timeout',
    timeoutMin: Math.min(40320, Math.max(1, parseInt(a.timeoutMin, 10) || 60)),
  };
}

// Gọi khi có member join. Trả về { triggered, actedIds } — actedIds chứa các user đã bị xử lý trong đợt này.
async function checkJoin(member, st) {
  const cfg = getAntiraid(st);
  const out = { triggered: false, actedIds: [] };
  if (!cfg.enabled || !member?.guild) return out;
  const gid = member.guild.id;
  const now = Date.now();
  const list = (joins.get(gid) || []).filter((j) => now - j.at < cfg.windowSecs * 1000);
  list.push({ userId: member.id, at: now, createdAt: member.user?.createdTimestamp || now });
  joins.set(gid, list);

  const maxAgeMs = cfg.ageDays > 0 ? cfg.ageDays * 86_400_000 : Infinity;
  const suspects = list.filter((j) => now - j.createdAt <= maxAgeMs);
  if (suspects.length < cfg.count) return out;

  out.triggered = true;
  joins.set(gid, []); // reset để không xử lý lặp trong cùng đợt
  for (const s of suspects) {
    const m = await member.guild.members.fetch(s.userId).catch(() => null);
    if (!m || m.user.bot) continue;
    try {
      if (cfg.action === 'ban') {
        if (m.bannable) { await m.ban({ reason: 'Anti-Raid RAPTOR' }); out.actedIds.push(s.userId); }
      } else if (cfg.action === 'kick') {
        if (m.kickable) { await m.kick('Anti-Raid RAPTOR'); out.actedIds.push(s.userId); }
      } else if (m.moderatable) {
        await m.timeout(cfg.timeoutMin * 60 * 1000, 'Anti-Raid RAPTOR');
        out.actedIds.push(s.userId);
      }
    } catch {}
  }
  try {
    require('./logger').logMod(
      member.guild,
      `🛡️ **Anti-Raid kích hoạt**: ${suspects.length} tài khoản (tuổi ≤ ${cfg.ageDays || '∞'} ngày) vào trong ${cfg.windowSecs}s — đã ${cfg.action} ${out.actedIds.length} tài khoản.`,
      out.actedIds.map((id) => `<@${id}>`).join(', ').slice(0, 1000)
    );
  } catch {}
  return out;
}

module.exports = { getAntiraid, checkJoin };
