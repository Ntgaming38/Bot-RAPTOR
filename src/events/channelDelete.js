const { Events, AuditLogEvent } = require('discord.js');

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel) {
    try {
      if (!channel.guild) return;
      const logger = require('../utils/logger');
      const { executor, reason } = await logger.findExecutorReason(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
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
