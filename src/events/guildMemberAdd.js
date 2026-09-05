const { Events } = require('discord.js');
const config = require('../config');
const { buildWelcome } = require('../utils/welcome');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try { await require('../utils/logger').logJoin(member); } catch {}
    // Auto-role
    if (config.autoRoleId) {
      await member.roles.add(config.autoRoleId).catch(() => {});
    }
    // Chào mừng kiểu mẫu trong hình
    if (!config.welcomeChannelId) return;
    const welcomeCh = await member.guild.channels.fetch(config.welcomeChannelId).catch(() => null);
    if (!welcomeCh?.isTextBased()) return;

    try {
      const msg = await welcomeCh.send({ embeds: [buildWelcome(member)] });
      for (const e of config.welcomeReactions.slice(0, 5)) {
        await msg.react(e).catch(() => {});
      }
    } catch {}
  },
};
