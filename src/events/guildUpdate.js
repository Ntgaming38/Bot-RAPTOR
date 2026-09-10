const { Events, AuditLogEvent } = require('discord.js');

module.exports = {
  name: Events.GuildUpdate,
  async execute(oldGuild, newGuild) {
    try {
      const logger = require('../utils/logger');
      const executor = await logger.findExecutor(newGuild, AuditLogEvent.GuildUpdate, newGuild.id);
      if (executor === 'BOT') return;
      await logger.logGuildUpdate(oldGuild, newGuild, executor);
    } catch {}
  },
};
