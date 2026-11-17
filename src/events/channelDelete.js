const { Events, AuditLogEvent } = require('discord.js');

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel) {
    try {
      if (!channel.guild) return;
      const logger = require('../utils/logger');
      const { executor, reason } = await logger.findExecutorReason(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
      // Kênh ticket bị xóa ngoài luồng đóng thường (người có thẩm quyền xóa tay,
      // hoặc bot cũ xóa kênh): GHI VÀO LỊCH SỬ ĐÓNG như một lần đóng ticket —
      // kèm người xóa lấy từ audit log — rồi mới dọn hồ sơ, kẻo thành hồ sơ ma
      // chặn chủ ticket mở ticket mới (vụ 2026-11-18). Luồng đóng bình thường
      // đã xóa hồ sơ TRƯỚC khi xóa kênh nên getTicket ở đây trả null → no-op.
      try {
        const tickets = require('../utils/tickets');
        const t = await tickets.getTicket(channel.id);
        if (t) {
          const byId = executor && executor !== 'BOT' ? executor.id || null : channel.client?.user?.id || null;
          const byTag = executor && executor !== 'BOT' ? executor.tag || String(executor) : channel.client?.user?.tag || 'BOT';
          await require('../utils/ticketsPro').recordClosed({
            guildId: channel.guild.id,
            channelId: channel.id,
            number: t.number || null,
            ownerId: t.ownerId,
            ownerTag: t.ownerTag,
            type: t.type,
            typeLabel: t.typeLabel,
            priority: t.priority || 'medium',
            reason: t.reason || '',
            createdAt: t.createdAt || Date.now(),
            closedAt: Date.now(),
            closedBy: byId,
            closedByTag: byTag,
            claimedBy: t.claimedBy || null,
            claimedTag: t.claimedTag || null,
            auto: false,
            closedVia: 'channel-delete',
          });
          await tickets.removeTicket(channel.id);
          require('../utils/activity').record(channel.guild.id, 'ticket', `Ticket #${t.number ?? ''} (${t.typeLabel || ''}) của @${t.ownerTag} đã đóng do kênh bị xóa bởi ${byTag}`).catch(() => {});
          console.warn(`[ticket] kênh ticket ${channel.id} bị xóa bởi ${byTag} — đã ghi lịch sử đóng + dọn hồ sơ.`);
        }
      } catch {}
      if (executor === 'BOT') return; // kênh ticket đóng → khỏi spam
      await logger.log(channel.guild, 'channelDelete', {
        title: '➖ Xóa kênh',
        description: `**Kênh:** \`#${channel.name}\` (loại ${channel.type})${reason ? `\n**Reason:** ${reason}` : ''}`,
        color: 0xED4245,
        moderator: executor,
      });
    } catch {}
  },
};
