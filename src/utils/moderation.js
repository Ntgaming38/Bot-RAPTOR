// Kiểm tra thứ bậc khi phạt (ban/kick/timeout/warn) — dùng chung cho lệnh slash và dashboard web.
// Trước đây lệnh chỉ kiểm tra bot có phạt được không (bannable/kickable/moderatable),
// nên mod cấp thấp phạt được cả mod cấp cao/admin miễn là role bot cao hơn nạn nhân.
//
// Trả về null nếu được phạt, hoặc chuỗi lý do từ chối.
function checkHierarchy(actorMember, targetMember, guild, { blockBotTarget = false } = {}) {
  if (!actorMember || !targetMember || !guild) return 'Không xác định được người dùng.';
  if (targetMember.id === actorMember.id) return 'Không thể tự phạt chính mình.';
  if (targetMember.id === guild.ownerId) return 'Không thể phạt chủ server.';
  if (blockBotTarget && targetMember.user?.bot) return 'Không áp dụng với bot.';
  // Chủ server được phạt mọi người (trừ chính mình — đã chặn ở trên)
  if (actorMember.id === guild.ownerId) return null;
  const actorTop = actorMember.roles?.highest?.position ?? 0;
  const targetTop = targetMember.roles?.highest?.position ?? 0;
  if (actorTop <= targetTop) {
    return 'Bạn chỉ phạt được người có role thấp hơn mình.';
  }
  return null;
}

module.exports = { checkHierarchy };
