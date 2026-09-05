const { Events, AuditLogEvent } = require('discord.js');

module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban) {
    try {
      let reason = ban.reason || null;
      // Thử lấy reason từ audit log
      try {
        const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 });
        reason = logs.entries.first()?.reason || reason;
      } catch {}
      await require('../utils/logger').logBan(ban.guild, ban.user, reason, true);
    } catch {}
  },
};
