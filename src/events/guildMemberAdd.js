const { Events } = require('discord.js');
const config = require('../config');
const { buildWelcome } = require('../utils/welcome');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try { await require('../utils/logger').logJoin(member); } catch {}
    // Setting ưu tiên từ /welcome setup, fallback về .env
    const s = await require('../utils/welcomeSettings').getWelcomeSettings(member.guild.id).catch(() => null);
    // Auto-role
    const autoRole = s?.autoRoleId || config.autoRoleId;
    if (autoRole) {
      await member.roles.add(autoRole).catch(() => {});
    }
    // Chào mừng kiểu mẫu trong hình
    const channelId = s?.channelId || config.welcomeChannelId;
    if (!channelId) return;
    const welcomeCh = await member.guild.channels.fetch(channelId).catch(() => null);
    if (!welcomeCh?.isTextBased()) return;

    try {
      const msg = await welcomeCh.send({ embeds: [buildWelcome(member, s)] });
      const reactions = s?.reactions || config.welcomeReactions;
      for (const e of reactions.slice(0, 5)) {
        await msg.react(e).catch(() => {});
      }
    } catch {}
  },
};
