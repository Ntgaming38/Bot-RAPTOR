const { Events, AuditLogEvent, ChannelType } = require('discord.js');

function kind(ch) {
  if (ch.type === ChannelType.GuildText) return 'kênh text';
  if (ch.type === ChannelType.GuildVoice) return 'kênh voice';
  if (ch.type === ChannelType.GuildCategory) return 'category';
  if (ch.type === ChannelType.GuildAnnouncement) return 'kênh thông báo';
  if (ch.type === ChannelType.GuildForum) return 'forum';
  return 'kênh';
}

module.exports = {
  name: Events.ChannelCreate,
  async execute(channel) {
    try {
      if (!channel.guild) return;
      const logger = require('../utils/logger');
      const executor = await logger.findExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
      if (executor === 'BOT') return; // kênh ticket/stats do bot tạo → khỏi spam
      await logger.log(channel.guild, 'channelCreate', {
        title: '➕ Tạo kênh',
        description: `**${kind(channel)}:** ${channel} (\`${channel.name}\`)`,
        color: 0x57F287,
        moderator: executor,
      });
    } catch {}
  },
};
