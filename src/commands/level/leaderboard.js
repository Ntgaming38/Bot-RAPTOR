const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embeds');
const { getLeaderboard } = require('../../utils/levels');

module.exports = {
  group: 'level',
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Bảng xếp hạng level server'),
  async execute(interaction) {
    const top = await getLeaderboard(interaction.guildId, 10);
    if (!top.length) {
      return interaction.reply({ content: '📭 Chưa có ai có XP. Hãy chat để lên level!', ephemeral: true });
    }
    const lines = await Promise.all(top.map(async (e) => {
      const u = await interaction.client.users.fetch(e.userId).catch(() => null);
      return `**#${e.rank}** ${u ? u.username : `<@${e.userId}>`} — Level **${e.level}** (${e.xp} XP)`;
    }));
    await interaction.reply({
      embeds: [embed({ title: `🏆 Top level ${interaction.guild.name}`, description: lines.join('\n') })],
    });
  },
};
