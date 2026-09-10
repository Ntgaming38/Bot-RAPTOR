const { Events, AuditLogEvent } = require('discord.js');

module.exports = {
  name: Events.GuildRoleUpdate,
  async execute(oldRole, newRole) {
    try {
      const changes = [];
      if (oldRole.name !== newRole.name) changes.push(`**Tên:** \`${oldRole.name}\` → \`${newRole.name}\``);
      if (oldRole.hexColor !== newRole.hexColor) changes.push(`**Màu:** ${oldRole.hexColor} → ${newRole.hexColor}`);
      if (oldRole.mentionable !== newRole.mentionable || oldRole.hoist !== newRole.hoist) {
        changes.push(`**Hiển thị:** hoist ${oldRole.hoist}→${newRole.hoist}, mention ${oldRole.mentionable}→${newRole.mentionable}`);
      }
      if (!changes.length) return;
      const logger = require('../utils/logger');
      const { executor, reason } = await logger.findExecutorReason(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
      if (executor === 'BOT') return;
      await logger.log(newRole.guild, 'roleUpdate', {
        title: `🎨 Sửa role: ${newRole.name}`,
        description: `**Role:** ${newRole}\n${changes.join('\n')}${reason ? `\n**Reason:** ${reason}` : ''}`,
        color: 0xFEE75C,
        moderator: executor,
      });
    } catch {}
  },
};
