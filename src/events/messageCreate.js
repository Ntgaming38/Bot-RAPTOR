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

    // 1b) Lọc link lừa đảo (domain giả mạo Discord/Steam/Nitro) — mod có quyền quản lý tin nhắn được miễn
    try {
      const scamCfg = st?.scamCfg || {};
      if (scamCfg.enabled !== false && !message.member?.permissions?.has?.('ManageMessages')) {
        const hit = require('../utils/scamFilter').findScam(message.content, scamCfg.extraDomains || []);
        if (hit) {
          await message.delete().catch(() => {});
          const warn = await message.channel.send(`⚠️ ${message.author} — link **${hit}** bị nghi là lừa đảo nên đã bị xóa. Mọi người cẩn thận với link lạ nhé!`).catch(() => null);
          if (warn) setTimeout(() => warn.delete().catch(() => {}), 12_000);
          require('../utils/activity').record(message.guild.id, 'scam', `Đã xóa link nghi lừa đảo (${hit}) của @${message.author.tag}`).catch(() => {});
          try { require('../utils/logger').logMod(message.guild, `🛡️ Xóa link nghi lừa đảo từ ${message.author.tag}: ${hit}`); } catch {}
          return;
        }
      }
    } catch {}

    // 1c) Nhiệm vụ hằng ngày: đếm tin nhắn chat
    try {
      const q = await require('../utils/quests').bumpChat(message.guild.id, message.author.id);
      if (q?.completed) {
        await message.channel.send(`🎯 ${message.author} vừa hoàn thành nhiệm vụ **${q.completed.name}** (+${q.completed.reward} credits)! Gõ /quests để xem nhiệm vụ hôm nay.`).catch(() => {});
        require('../utils/activity').record(message.guild.id, 'quest', `@${message.author.tag} hoàn thành nhiệm vụ “${q.completed.name}” (+${q.completed.reward} credits)`).catch(() => {});
      }
    } catch {}

    // 2) Cộng XP level (tắt được: dashboard tab Level → hệ thống level)
    if (st?.levelEnabled === false) return;
    try {
      const res = await addXp(message.guild.id, message.author.id);
      if (res?.leveled) {
        const { applyLevelRewards } = require('../utils/levels');
        if (message.member) await applyLevelRewards(message.guild, message.member, res.level);
        require('../utils/activity').record(message.guild.id, 'level', `@${message.author.tag} lên cấp ${res.level}`).catch(() => {});
        const lvlMsg = st?.levelUpMessage ?? config.levelUpMessage;
        if (lvlMsg) {
          await message.channel.send(`🎉 ${message.author} đã lên **level ${res.level}**!`).catch(() => {});
        }
      }
    } catch {}
  },
};
