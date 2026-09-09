const { Events, AuditLogEvent } = require('discord.js');

// Log ai sửa kênh (tên cũ → mới, kiểu ProBot). Cần quyền Xem nhật ký để biết người sửa.
module.exports = {
  name: Events.ChannelUpdate,
  async execute(oldCh, newCh) {
    try {
      if (!newCh.guild || oldCh.name === newCh.name) return;
      let executor = null;
      try {
        const logs = await newCh.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelUpdate, limit: 3 });
        const hit = logs.entries.find((e) => e.target?.id === newCh.id && Date.now() - e.createdTimestamp < 15000);
        if (hit?.executor) executor = hit.executor;
      } catch {}
      if (executor?.id === newCh.guild.client.user.id) return; // kênh stats bot tự đổi tên → khỏi spam
      await require('../utils/logger').logChannelUpdate(newCh.guild, oldCh.name, newCh.name, newCh, executor);
    } catch (e) {
      console.warn('[log channelUpdate]', e?.message);
    }
  },
};
