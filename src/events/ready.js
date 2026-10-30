const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Bot online: ${client.user.tag}`);
    console.log(`📊 Phục vụ ${client.guilds.cache.size} server`);
    // Chụp link mời (role theo link mời) + bật quét nhắc việc / bình chọn
    try { await require('../utils/inviteRoles').primeAll(client); } catch (e) { console.warn('[invite-prime]', e?.message); }
    try { require('../utils/reminders').startScanner(client); } catch {}
  },
};
