// Colors kiểu ProBot: role tên là số thuần (1, 2, 3...) = role màu tự chọn.
// Member dùng /color <số> để đổi màu tên; /colors xem bảng màu.
function findColorRoles(guild) {
  return guild.roles.cache
    .filter((r) => /^\d{1,3}$/.test(r.name))
    .sort((a, b) => parseInt(a.name, 10) - parseInt(b.name, 10));
}

async function setColor(member, guild, num) {
  const colors = findColorRoles(guild);
  if (!colors.size) return { ok: false, reason: 'Server chưa có role màu nào. Admin hãy tạo các role tên là số (1, 2, 3...) với màu tùy ý.' };
  const owned = colors.filter((r) => member.roles.cache.has(r.id));
  for (const r of owned.values()) await member.roles.remove(r.id).catch(() => {});
  if (num === 0) return { ok: true, removed: true };
  const target = colors.find((r) => parseInt(r.name, 10) === num);
  if (!target) return { ok: false, reason: `Không có màu số ${num}. Dùng /colors để xem bảng màu.` };
  const me = guild.members.me;
  if (me && target.position >= me.roles.highest.position) {
    return { ok: false, reason: `Role màu ${num} đang cao hơn role của bot — kéo role của bot lên trên nó trước.` };
  }
  await member.roles.add(target.id);
  return { ok: true, role: target };
}

module.exports = { findColorRoles, setColor };
