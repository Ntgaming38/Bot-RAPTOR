const { Events, AuditLogEvent } = require('discord.js');

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel) {
    try {
      if (!channel.guild) return;
      const logger = require('../utils/logger');
      const executor = await logger.findExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
      if (executor === 'BOT') return; // kênh ticket đóng → khỏi spam
      await logger.log(channel.guild, 'channelDelete', {
        title: '➖ Xóa kênh',
        description: `**Kênh:** \`#${channel.name}\` (loại ${channel.type})`,
        color: 0xED4245,
        moderator: executor,
      });
    } catch {}
  },
};
