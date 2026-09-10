const { Events } = require('discord.js');
const config = require('../config');
const { buildWelcome } = require('../utils/welcome');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    try { await require('../utils/logger').logJoin(member); } catch {}
    try {
      if (client) require('../utils/statsSettings').scheduleStatsRefresh(client, member.guild.id);
    } catch {}
    console.log(`[welcome] ${member.user.tag} join ${member.guild.name} (${member.guild.id})`);
    // Setting ưu tiên từ /welcome setup, fallback về .env
    const s = await require('../utils/welcomeSettings').getWelcomeSettings(member.guild.id).catch((e) => {
      console.warn('[welcome] lỗi đọc setting:', e?.message);
      return null;
    });
    // Auto-role
    const autoRole = s?.autoRoleId || config.autoRoleId;
    if (autoRole) {
      await member.roles.add(autoRole).catch((e) => console.warn('[welcome] gắn auto-role lỗi:', e?.message));
    }
    // Chào mừng kiểu mẫu trong hình
    const channelId = s?.channelId || config.welcomeChannelId;
    if (!channelId) {
      console.warn('[welcome] bỏ qua: chưa setup kênh (chạy /welcome setup).');
      return;
    }
    const welcomeCh = await member.guild.channels.fetch(channelId).catch(() => null);
    if (!welcomeCh?.isTextBased()) {
      console.warn('[welcome] bỏ qua: không tìm thấy kênh', channelId);
      return;
    }

    try {
      const { embed: em, files } = buildWelcome(member, s);
      const msg = await welcomeCh.send({ embeds: [em], files });
      const reactions = s?.reactions || config.welcomeReactions;
      for (const e of reactions.slice(0, 5)) {
        await msg.react(e).catch(() => {});
      }
      console.log(`[welcome] đã gửi chào ${member.user.tag} vào #${welcomeCh.name}`);
    } catch (e) {
      console.error('[welcome] gửi lỗi:', e?.message);
    }
  },
};
