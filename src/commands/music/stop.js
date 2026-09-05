const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'nhạc',
  data: new SlashCommandBuilder().setName('stop').setDescription('Dừng nhạc và out voice'),
  async execute(interaction, client) {
    let queue = null;
    try { queue = useQueue(); } catch {}
    queue = queue || client?.player?.nodes?.get(interaction.guildId);
    if (!queue) return interaction.reply({ embeds: [errorEmbed('Bot không phát gì cả.')], ephemeral: true });
    try {
      if (queue.delete) queue.delete();
      else if (queue.node?.leave) queue.node.leave();
      await interaction.reply({ embeds: [successEmbed('⏹️ Đã dừng nhạc và rời kênh voice.')] });
    } catch (e) {
      await interaction.reply({ embeds: [errorEmbed(e.message)], ephemeral: true });
    }
  },
};
