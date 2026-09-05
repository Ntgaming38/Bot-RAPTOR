const { Events } = require('discord.js');
const config = require('../config');
const { addXp } = require('../utils/levels');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    // 1) Lọc từ cấm
    if (config.bannedWords.length) {
      const content = message.content.toLowerCase();
      const found = config.bannedWords.find(w => content.includes(w));
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
      const res = addXp(message.guild.id, message.author.id);
      if (res?.leveled && config.levelUpMessage) {
        await message.channel.send(`🎉 ${message.author} đã lên **level ${res.level}**!`).catch(() => {});
      }
    } catch {}
  },
};
