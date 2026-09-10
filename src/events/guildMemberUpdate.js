const { Events, AuditLogEvent } = require('discord.js');

// Log ai nhận/bỏ role + đổi nickname + timeout (kiểu ProBot)
module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    const logger = require('../utils/logger');
    try {
      const oldIds = new Set(oldMember.roles.cache.keys());
      const newIds = new Set(newMember.roles.cache.keys());
      const added = [...newIds].filter((id) => !oldIds.has(id) && id !== newMember.guild.id)
        .map((id) => newMember.roles.cache.get(id)).filter(Boolean);
      const removed = [...oldIds].filter((id) => !newIds.has(id) && id !== newMember.guild.id)
        .map((id) => oldMember.roles.cache.get(id)).filter(Boolean);
      if (added.length || removed.length) {
        const executor = await logger.findExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
        if (executor === 'BOT') return; // nút role của chính bot → khỏi spam
        await logger.logRoleChange(newMember.guild, newMember.user, added, removed, executor);
      }
    } catch (e) {
      console.warn('[log memberUpdate role]', e?.message);
    }
    try {
      // Đổi nickname
      if ((oldMember.nickname || null) !== (newMember.nickname || null)) {
        const executor = await logger.findExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
        if (executor !== 'BOT') {
          await logger.log(newMember.guild, 'nickChange', {
            title: '✏️ Đổi nickname',
            description: `${newMember} (<@${newMember.id}>)\n**Trước:** ${oldMember.nickname || newMember.user.username}\n**Sau:** ${newMember.nickname || newMember.user.username}`,
            color: 0xFEE75C,
            user: newMember.user,
            moderator: executor,
          });
        }
      }
      // Timeout / gỡ timeout (kèm reason + duration)
      const wasTo = oldMember.communicationDisabledUntilTimestamp;
      const nowTo = newMember.communicationDisabledUntilTimestamp;
      if ((wasTo || 0) !== (nowTo || 0)) {
        let executor = await logger.findExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
        let reason = null;
        try {
          const logs = await newMember.guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 3 });
          const hit = logs.entries.find((e) => e.target?.id === newMember.id && Date.now() - e.createdTimestamp < 15000);
          if (hit) {
            reason = hit.reason || null;
            if (!executor && hit.executor) executor = hit.executor.id === newMember.guild.client.user.id ? 'BOT' : hit.executor;
          }
        } catch {}
        if (nowTo && nowTo > Date.now()) {
          const mins = Math.max(1, Math.round((nowTo - Date.now()) / 60000));
          const dur = mins >= 60 ? `${Math.floor(mins / 60)} giờ ${mins % 60 ? `${mins % 60} phút` : ''}`.trim() : `${mins} phút`;
          await logger.log(newMember.guild, 'timeout', {
            title: '⏳ Member Timeout',
            description: `**User:** ${newMember} (<@${newMember.id}>)\n**Reason:** ${reason || 'Không có'}\n**Duration:** ${dur}\n**Đến:** <t:${Math.floor(nowTo / 1000)}:F>`,
            color: 0xED4245,
            user: newMember.user,
            moderator: executor,
          });
        } else {
          await logger.log(newMember.guild, 'timeout', {
            title: '✅ Gỡ timeout',
            description: `**User:** ${newMember} (<@${newMember.id}>)\n**Reason:** ${reason || 'Hết hạn/Không có'}`,
            color: 0x57F287,
            user: newMember.user,
            moderator: executor,
          });
        }
      }
      // Đổi username/avatar toàn cục
      try {
        const changes = [];
        if (oldMember.user.username !== newMember.user.username) {
          changes.push(`**Username:** \`${oldMember.user.username}\` → \`${newMember.user.username}\``);
        }
        if (oldMember.user.avatar !== newMember.user.avatar) changes.push('**Avatar:** đã đổi');
        if (changes.length) await logger.logUsername(newMember.guild, newMember.user, changes);
      } catch {}
    } catch (e) {
      console.warn('[log memberUpdate nick/timeout]', e?.message);
    }
  },
};
