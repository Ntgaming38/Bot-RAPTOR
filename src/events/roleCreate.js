const { Events, AuditLogEvent } = require('discord.js');

module.exports = {
  name: Events.GuildRoleCreate,
  async execute(role) {
    try {
      const logger = require('../utils/logger');
      const { executor, reason } = await logger.findExecutorReason(role.guild, AuditLogEvent.RoleCreate, role.id);
      if (executor === 'BOT') return;
      await logger.log(role.guild, 'roleCreate', {
        title: '➕ Tạo role',
        description: `**Role:** ${role} (\`${role.name}\`)\n**Màu:** ${role.hexColor}${reason ? `\n**Reason:** ${reason}` : ''}`,
        color: 0x57F287,
        moderator: executor,
      });
    } catch {}
  },
};
