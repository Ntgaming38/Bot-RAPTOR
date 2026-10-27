const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embeds');
const { findColorRoles } = require('../../utils/colors');

module.exports = {
  group: 'fun',
  data: new SlashCommandBuilder()
    .setName('colors')
    .setDescription('Xem bảng màu tên có sẵn trong server'),
  async execute(interaction) {
    const colors = findColorRoles(interaction.guild);
    if (!colors.size) {
      return interaction.reply({ content: 'Server chưa có role màu nào. Admin hãy tạo các role tên là số (1, 2, 3...) với màu tùy ý.', ephemeral: true });
    }
    const lines = colors.map((r) => `**${r.name}** — <@&${r.id}> · mã màu #${r.color.toString(16).padStart(6, '0').toUpperCase()} · ${r.members.size} người đang dùng`);
    await interaction.reply({
      embeds: [embed({
        title: '🎨 Bảng màu của server',
        description: lines.join('\n').slice(0, 4000) + '\n\nDùng `/color <số>` để đổi màu tên của bạn.',
      })],
    });
  },
};
