const { Events, AuditLogEvent } = require('discord.js');

module.exports = {
  name: Events.GuildRoleDelete,
  async execute(role) {
    try {
      const logger = require('../utils/logger');
      const { executor, reason } = await logger.findExecutorReason(role.guild, AuditLogEvent.RoleDelete, role.id);
      if (executor === 'BOT') return;
      await logger.log(role.guild, 'roleDelete', {
        title: '➖ Xóa role',
        description: `**Role:** \`${role.name}\`${reason ? `\n**Reason:** ${reason}` : ''}`,
        color: 0xED4245,
        moderator: executor,
      });
    } catch {}
  },
};
