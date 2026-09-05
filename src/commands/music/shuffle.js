const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'nhạc',
  data: new SlashCommandBuilder().setName('shuffle').setDescription('Xáo trộn hàng chờ'),
  async execute(interaction, client) {
    let q = null;
    try { q = useQueue(); } catch {}
    q = q || client?.player?.nodes?.get(interaction.guildId);
    if (!q) return interaction.reply({ embeds: [errorEmbed('Không có gì đang phát.')], ephemeral: true });
    try {
      if (q.tracks?.shuffle) await q.tracks.shuffle();
      await interaction.reply({ embeds: [successEmbed('🔀 Đã xáo trộn hàng chờ.')] });
    } catch (e) { await interaction.reply({ embeds: [errorEmbed(e.message)], ephemeral: true }); }
  },
};
