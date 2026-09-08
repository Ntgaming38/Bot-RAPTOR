const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Xem tất cả lệnh của bot'),
  async execute(interaction, client) {
    const groups = {};
    // Sắp xếp tên lệnh cho ổn định, dễ tìm
    const cmds = [...client.commands.values()].sort((a, b) => a.data.name.localeCompare(b.data.name));
    for (const cmd of cmds) {
      // Lấy tên thư mục cha làm nhóm: utility / moderation / fun
      const group = cmd.group || 'khác';
      if (!groups[group]) groups[group] = [];
      // Liệt kê cả subcommand để tính năng mới (setup/test/...) tự hiện, khỏi sửa tay
      let json = null;
      try { json = cmd.data.toJSON(); } catch {}
      const subs = (json?.options || []).filter(o => o.type === 1 || o.type === 2);
      if (!subs.length) {
        groups[group].push(`**/${cmd.data.name}** — ${cmd.data.description}`);
      } else {
        for (const s of subs) {
          if (s.type === 1) {
            groups[group].push(`**/${cmd.data.name} ${s.name}** — ${s.description || ''}`);
          } else if (s.type === 2) {
            for (const ss of (s.options || [])) {
              groups[group].push(`**/${cmd.data.name} ${s.name} ${ss.name}** — ${ss.description || ''}`);
            }
          }
        }
      }
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
