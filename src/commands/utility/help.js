const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Xem bảng trợ giúp theo từng mục — bấm chọn mục để xem lệnh'),
  async execute(interaction, client) {
    const { buildHome } = require('../../utils/helpMenu');
    await interaction.reply(buildHome(client, interaction.user.id));
  },
};
