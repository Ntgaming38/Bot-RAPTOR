const { Events, AuditLogEvent } = require('discord.js');

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    try {
      const logger = require('../utils/logger');
      // Ai xóa (mod xóa hộ thì hiện tên, tự xóa thì thôi)
      let executor = null;
      if (message.guild && !message.author?.bot) {
        const ex = await logger.findExecutor(message.guild, AuditLogEvent.MessageDelete, message.author?.id);
        if (ex && ex !== 'BOT' && ex.id !== message.author?.id) executor = ex;
      }
      await logger.logMessageDelete(message, executor);
    } catch {}
  },
};
