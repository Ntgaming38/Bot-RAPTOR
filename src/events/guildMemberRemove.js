const { Events } = require('discord.js');
const config = require('../config');
const { embed } = require('../utils/embeds');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    try { await require('../utils/logger').logLeave(member); } catch {}
    if (!config.goodbyeChannelId) return;
    const ch = await member.guild.channels.fetch(config.goodbyeChannelId).catch(() => null);
    if (ch?.isTextBased()) {
      ch.send({
        embeds: [embed({
          title: `👋 Tạm biệt ${member.user.username}`,
          description: `**${member.user.tag}** đã rời server. Hẹn gặp lại!`,
          color: 0xED4245,
        })],
      }).catch(() => {});
    }
  },
};
