const { Events } = require('discord.js');
const config = require('../config');
const { addXp } = require('../utils/levels');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    // Chạm activity cho auto-close ticket
    try {
      require('../utils/ticketsPro').touchTicketActivity(message.channelId);
    } catch {}

    // 1) AutoMod: từ cấm / invite / link / spam (dashboard tab AutoMod)
    const st = await require('../utils/guildSettings').getGuildSettings(message.guild.id).catch(() => null);
    try {
      const { checkAutomod, punishAutomod } = require('../utils/automod');
      const banned = st?.bannedWords ?? config.bannedWords;
      const violation = await checkAutomod(message, st, banned);
      if (violation) {
        await punishAutomod(message, st, violation);
        return;
      }
    } catch {}

    // 2) Cộng XP level (tắt được: dashboard tab Level → hệ thống level)
    if (st?.levelEnabled === false) return;
    try {
      const res = await addXp(message.guild.id, message.author.id);
      const lvlMsg = st?.levelUpMessage ?? config.levelUpMessage;
      if (res?.leveled && lvlMsg) {
        await message.channel.send(`🎉 ${message.author} đã lên **level ${res.level}**!`).catch(() => {});
      }
    } catch {}
  },
};
