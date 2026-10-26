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

    // Discord giới hạn: mỗi field ≤ 1024 ký tự, tối đa 25 fields, tổng embed ≤ 6000 ký tự.
    // Nhóm nhiều lệnh (VD utility) phải chia thành nhiều field, không nhồi 1 field như trước (bị API từ chối).
    const FIELD_LIMIT = 1000;
    const fields = [];
    for (const [name, lines] of Object.entries(groups)) {
      let chunk = [];
      let len = 0;
      let part = 0;
      const flush = () => {
        if (!chunk.length) return;
        fields.push({
          name: part === 0 ? `📁 ${name.toUpperCase()}` : `📁 ${name.toUpperCase()} (tiếp)`,
          value: chunk.join('\n'),
        });
        chunk = [];
        len = 0;
        part += 1;
      };
      for (const line of lines) {
        const l = line.length > FIELD_LIMIT ? line.slice(0, FIELD_LIMIT - 1) + '…' : line;
        if (len + l.length + 1 > FIELD_LIMIT) flush();
        chunk.push(l);
        len += l.length + 1;
      }
      flush();
    }
    // Chặn 25 fields và tổng ~6000 ký tự (trừ phần title/description/footer khoảng 300)
    const capped = fields.slice(0, 25);
    let total = 0;
    for (let i = 0; i < capped.length; i++) {
      total += capped[i].name.length + capped[i].value.length;
      if (total > 5600) {
        capped[i].value = capped[i].value.slice(0, Math.max(0, capped[i].value.length - (total - 5600))) + '\n…';
        capped.length = i + 1;
        break;
      }
    }

    await interaction.reply({
      embeds: [embed({
        title: '📖 Danh sách lệnh',
        description: 'Muốn thêm lệnh mới? Chỉ cần tạo file trong `src/commands/<nhóm>/tenlenh.js` rồi chạy `npm run deploy`.',
        fields: capped,
        footer: `Tổng: ${client.commands.size} lệnh`,
      })],
    });
  },
};
