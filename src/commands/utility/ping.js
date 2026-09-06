const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embeds');

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Kiểm tra độ trễ của bot'),
  async execute(interaction) {
    const response = await interaction.reply({ content: '🏓 Pong...', withResponse: true });
    const sent = response.resource.message;
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
