const { Events, AuditLogEvent } = require('discord.js');

// Log ai nhận/bỏ role (kiểu ProBot). Cần intent Server Members (đã bật).
module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    try {
      const oldIds = new Set(oldMember.roles.cache.keys());
      const newIds = new Set(newMember.roles.cache.keys());
      const added = [...newIds].filter((id) => !oldIds.has(id) && id !== newMember.guild.id)
        .map((id) => newMember.roles.cache.get(id)).filter(Boolean);
      const removed = [...oldIds].filter((id) => !newIds.has(id) && id !== newMember.guild.id)
        .map((id) => oldMember.roles.cache.get(id)).filter(Boolean);
      if (!added.length && !removed.length) return;

      // Tìm người thực hiện qua Audit Log (cần quyền Xem nhật ký)
      let executor = null;
      try {
        const logs = await newMember.guild.fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 3 });
        const hit = logs.entries.find((e) => e.target?.id === newMember.id && Date.now() - e.createdTimestamp < 15000);
        if (hit?.executor) executor = hit.executor;
      } catch {}

      await require('../utils/logger').logRoleChange(newMember.guild, newMember.user, added, removed, executor);
    } catch (e) {
      console.warn('[log memberUpdate]', e?.message);
    }
  },
};
