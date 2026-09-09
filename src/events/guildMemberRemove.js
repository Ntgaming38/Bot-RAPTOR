const { Events } = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const logger = require('../utils/logger');
    // Bị kick (không phải tự rời)? Audit log sẽ có trong ~15s
    try {
      const { AuditLogEvent } = require('discord.js');
      const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 3 }).catch(() => null);
      const hit = logs?.entries.find((e) => e.target?.id === member.id && Date.now() - e.createdTimestamp < 15000);
      if (hit) {
        const mod = hit.executor?.id === member.guild.client.user.id ? null : hit.executor;
        await logger.log(member.guild, 'kick', {
          title: '👢 Kick',
          description: `**User:** ${member.user.tag} (<@${member.id}>)\n**Lý do:** ${hit.reason || 'Không có'}`,
          color: 0xED4245,
          user: member.user,
          moderator: mod,
        });
        return; // kick rồi thì thôi log rời + goodbye
      }
    } catch {}
    try { await logger.logLeave(member); } catch {}
    const s = await require('../utils/goodbyeSettings').getGoodbye(member.guild.id).catch(() => null);
    const channelId = s?.channelId || config.goodbyeChannelId;
    if (!channelId) return;
    const ch = await member.guild.channels.fetch(channelId).catch(() => null);
    if (!ch?.isTextBased()) {
      console.warn('[goodbye] không tìm thấy kênh', channelId);
      return;
    }
    const { buildGoodbye } = require('../utils/goodbyeSettings');
    await ch.send({ embeds: [buildGoodbye(member, s)] }).catch((e) => console.warn('[goodbye] gửi lỗi:', e?.message));
  },
};
