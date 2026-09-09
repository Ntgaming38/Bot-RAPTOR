const { Events, AuditLogEvent } = require('discord.js');

module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban) {
    try {
      const logger = require('../utils/logger');
      let reason = ban.reason || null;
      let moderator = null;
      try {
        const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 3 });
        const hit = logs.entries.find((e) => e.target?.id === ban.user.id && Date.now() - e.createdTimestamp < 15000);
        if (hit) {
          reason = hit.reason || reason;
          if (hit.executor?.id !== ban.guild.client.user.id) moderator = hit.executor;
        }
      } catch {}
      await logger.logBan(ban.guild, ban.user, reason, true, moderator);
    } catch {}
  },
};
