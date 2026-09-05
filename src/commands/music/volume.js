const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
  group: 'nhạc',
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Chỉnh âm lượng')
    .addIntegerOption(o => o.setName('volume').setDescription(`0-${config.maxVolume}`).setRequired(true).setMinValue(0).setMaxValue(config.maxVolume)),
  async execute(interaction, client) {
    let q = null;
    try { q = useQueue(); } catch {}
    q = q || client?.player?.nodes?.get(interaction.guildId);
    if (!q) return interaction.reply({ embeds: [errorEmbed('Không có gì đang phát.')], ephemeral: true });
    const v = interaction.options.getInteger('volume', true);
    try {
      if (q.node?.setVolume) await q.node.setVolume(v);
      else if (q.setVolume) await q.setVolume(v);
      await interaction.reply({ embeds: [successEmbed(`🔊 Âm lượng: **${v}%**`)] });
    } catch (e) { await interaction.reply({ embeds: [errorEmbed(e.message)], ephemeral: true }); }
  },
};
