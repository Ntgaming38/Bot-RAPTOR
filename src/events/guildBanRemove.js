const { Events, AuditLogEvent } = require('discord.js');

module.exports = {
  name: Events.GuildBanRemove,
  async execute(ban) {
    try {
      const logger = require('../utils/logger');
      const moderator = await logger.findExecutor(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
      await logger.logBan(ban.guild, ban.user, null, false, moderator === 'BOT' ? null : moderator);
    } catch {}
  },
};
