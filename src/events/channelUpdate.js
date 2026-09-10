const { Events, AuditLogEvent } = require('discord.js');

// Log ai sửa kênh (tên cũ → mới, kiểu ProBot). Cần quyền Xem nhật ký để biết người sửa.
module.exports = {
  name: Events.ChannelUpdate,
  async execute(oldCh, newCh) {
    try {
      if (!newCh.guild || oldCh.name === newCh.name) return;
      const logger = require('../utils/logger');
      const { executor, reason } = await logger.findExecutorReason(newCh.guild, AuditLogEvent.ChannelUpdate, newCh.id);
      if (executor === 'BOT') return; // kênh stats bot tự đổi tên → khỏi spam
      await logger.logChannelUpdate(newCh.guild, oldCh.name, newCh.name, newCh, executor, reason);
    } catch (e) {
      console.warn('[log channelUpdate]', e?.message);
    }
  },
};
