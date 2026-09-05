const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'moderation',
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban một thành viên')
    .addUserOption(o => o.setName('user').setDescription('Người cần ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Lý do'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Không có lý do';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [errorEmbed('Không tìm thấy người này trong server.')], ephemeral: true });
    if (!member.bannable) return interaction.reply({ embeds: [errorEmbed('Bot không thể ban người này (role cao hơn bot?).')], ephemeral: true });
    await member.ban({ reason });
    require('../../utils/logger').logMod(interaction.guild, `🔨 ${interaction.user.tag} banned ${user.tag}`, `Lý do: ${reason}`).catch(() => {});
    await interaction.reply({ embeds: [successEmbed(`Đã ban **${user.tag}**\nLý do: ${reason}`)] });
  },
};
