const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  group: 'fun',
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Bot nhắc lại lời của bạn')
    .addStringOption(o => o.setName('text').setDescription('Nội dung').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const text = interaction.options.getString('text');
    await interaction.reply({ content: '✅ Đã gửi!', ephemeral: true });
    await interaction.channel.send(text);
  },
};
