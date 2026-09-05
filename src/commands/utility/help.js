const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Xem tất cả lệnh của bot'),
  async execute(interaction, client) {
    const groups = {};
    for (const cmd of client.commands.values()) {
      // Lấy tên thư mục cha làm nhóm: utility / moderation / fun
      const group = cmd.group || 'khác';
      if (!groups[group]) groups[group] = [];
      groups[group].push(`**/${cmd.data.name}** — ${cmd.data.description}`);
    }

    const fields = Object.entries(groups).map(([name, lines]) => ({
      name: `📁 ${name.toUpperCase()}`,
      value: lines.join('\n'),
    }));

    await interaction.reply({
      embeds: [embed({
        title: '📖 Danh sách lệnh',
        description: 'Muốn thêm lệnh mới? Chỉ cần tạo file trong `src/commands/<nhóm>/tenlenh.js` rồi chạy `npm run deploy`.',
        fields,
        footer: `Tổng: ${client.commands.size} lệnh`,
      })],
    });
  },
};
