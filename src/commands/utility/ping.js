const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embeds');

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Kiểm tra độ trễ của bot'),
  async execute(interaction) {
    const sent = await interaction.reply({ content: '🏓 Pong...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply({
      content: '',
      embeds: [embed({
        title: '🏓 Pong!',
        description: `Độ trễ bot: **${latency}ms**\nĐộ trễ API: **${Math.round(interaction.client.ws.ping)}ms**`,
      })],
    });
  },
};
