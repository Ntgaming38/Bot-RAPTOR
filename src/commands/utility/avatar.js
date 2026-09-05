const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embeds');

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Xem avatar của ai đó')
    .addUserOption(o => o.setName('user').setDescription('Người muốn xem')),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    await interaction.reply({
      embeds: [embed({
        title: `🖼️ Avatar của ${user.tag}`,
        thumbnail: user.displayAvatarURL({ size: 512 }),
        description: `[Mở ảnh gốc](${user.displayAvatarURL({ size: 1024 })})`,
      })],
    });
  },
};
