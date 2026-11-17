const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Xem bảng trợ giúp theo từng mục — bấm chọn mục để xem lệnh'),
  async execute(interaction, client) {
    const { buildHome } = require('../../utils/helpMenu');
    try {
      await interaction.reply(buildHome(client, interaction.user.id));
    } catch (e) {
      // Không để người dùng ăn lỗi chung chung: log rõ nguyên nhân + trả bản tối giản
      console.error('[help] buildHome lỗi:', e?.message || e);
      const { EmbedBuilder } = require('discord.js');
      const total = client?.commands?.size || 0;
      const embed = new EmbedBuilder()
        .setColor(0xd63031)
        .setTitle('📖 RAPTOR — Trợ giúp')
        .setDescription(`Bot có **${total} lệnh**. Gõ \`/\` trong ô chat rồi bắt đầu gõ tên lệnh — Discord sẽ gợi ý cú pháp của từng lệnh (nhạc, ticket, level, kiểm duyệt...).`);
      await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
    }
  },
};
