const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'moderation',
  data: new SlashCommandBuilder()
    .setName('vkick')
    .setDescription('Ngắt kết nối một thành viên khỏi kênh voice (không ban, vào lại được)')
    .addUserOption((o) => o.setName('user').setDescription('Người cần ngắt voice').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [errorEmbed('Không tìm thấy người này trong server.')], ephemeral: true });
    if (!member.voice?.channel) return interaction.reply({ embeds: [errorEmbed(`**${user.tag}** đang không ở kênh voice nào.`)], ephemeral: true });
    await member.voice.disconnect(`Ngắt voice bởi ${interaction.user.tag}`);
    await interaction.reply({ embeds: [successEmbed(`Đã ngắt **${user.tag}** khỏi kênh voice.`)], ephemeral: true });
    require('../../utils/activity').record(interaction.guildId, 'vkick', `@${interaction.user.tag} ngắt voice của @${user.tag}`).catch(() => {});
  },
};
