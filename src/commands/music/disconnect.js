const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { getQueue } = require('../../music/helpers');
const { cancelAloneTimer } = require('../../music/voiceGuard');

module.exports = {
  group: 'nhạc',
  data: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Bot rời kênh voice'),
  async execute(interaction, client) {
    const queue = getQueue(interaction, client);
    const inVoice = interaction.guild.members.me?.voice?.channel;
    if (!queue && !inVoice) {
      return interaction.reply({ embeds: [errorEmbed('Bot không ở trong voice.')], ephemeral: true });
    }
    try {
      cancelAloneTimer(interaction.guildId);
      if (queue?.delete) queue.delete();
      await interaction.reply({ embeds: [successEmbed('👋 Đã rời kênh voice.')] });
    } catch (e) {
      await interaction.reply({ embeds: [errorEmbed('Không rời được: ' + e.message)], ephemeral: true });
    }
  },
};
