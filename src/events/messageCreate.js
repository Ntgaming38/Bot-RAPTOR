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

    // 1) Lọc từ cấm (theo server, dashboard chỉnh được)
    const st = await require('../utils/guildSettings').getGuildSettings(message.guild.id).catch(() => null);
    const banned = st?.bannedWords ?? config.bannedWords;
    if (banned.length) {
      const content = message.content.toLowerCase();
      const found = banned.find(w => content.includes(w));
      if (found) {
        await message.delete().catch(() => {});
        const warn = await message.channel.send(`⚠️ ${message.author}, tin nhắn của bạn chứa từ cấm, đã bị xóa.`).catch(() => null);
        if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);
        try {
          require('../utils/logger').logMod(message.guild, `🗑️ Xóa tin nhắn chứa từ cấm của ${message.author.tag} trong ${message.channel}`, message.content.slice(0, 1000));
        } catch {}
        return;
      }
    }

    // 2) Cộng XP level
    try {
      const res = await addXp(message.guild.id, message.author.id);
      const lvlMsg = st?.levelUpMessage ?? config.levelUpMessage;
      if (res?.leveled && lvlMsg) {
        await message.channel.send(`🎉 ${message.author} đã lên **level ${res.level}**!`).catch(() => {});
      }
    } catch {}
  },
};
