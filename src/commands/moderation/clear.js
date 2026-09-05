const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'moderation',
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Xóa tin nhắn hàng loạt')
    .addIntegerOption(o => o.setName('amount').setDescription('Số lượng 1-100').setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const n = interaction.options.getInteger('amount');
    await interaction.deferReply({ ephemeral: true });
    const deleted = await interaction.channel.bulkDelete(n, true).catch(() => null);
    if (!deleted) return interaction.editReply({ embeds: [errorEmbed('Không xóa được. Tin nhắn quá cũ (>14 ngày) hoặc bot thiếu quyền.')] });
    require('../../utils/logger').logMod(interaction.guild, `🧹 ${interaction.user.tag} xóa ${deleted.size} tin nhắn trong ${interaction.channel}`).catch(() => {});
    await interaction.editReply({ embeds: [successEmbed(`Đã xóa ${deleted.size} tin nhắn.`)] });
  },
};
