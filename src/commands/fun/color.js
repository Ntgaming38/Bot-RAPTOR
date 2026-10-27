const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embeds');
const { setColor } = require('../../utils/colors');

module.exports = {
  group: 'fun',
  data: new SlashCommandBuilder()
    .setName('color')
    .setDescription('Đổi màu tên của bạn bằng role màu (xem /colors)')
    .addIntegerOption(o => o.setName('so').setDescription('Số màu muốn chọn (0 = gỡ màu)').setRequired(true).setMinValue(0).setMaxValue(999)),
  async execute(interaction) {
    const num = interaction.options.getInteger('so');
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'Không tìm thấy bạn trong server.', ephemeral: true });
    const r = await setColor(member, interaction.guild, num);
    if (!r.ok) return interaction.reply({ content: `⚠️ ${r.reason}`, ephemeral: true });
    await interaction.reply({
      embeds: [embed({
        title: r.removed ? '🎨 Đã gỡ màu tên' : `🎨 Đã đổi màu tên sang số ${num}`,
        description: r.removed ? 'Tên của bạn trở lại màu mặc định.' : `Màu mới: <@&${r.role.id}>`,
        color: r.role ? r.role.color : undefined,
      })],
      ephemeral: true,
    });
  },
};
