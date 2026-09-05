const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'moderation',
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Mute tạm thời một thành viên')
    .addUserOption(o => o.setName('user').setDescription('Người cần timeout').setRequired(true))
    .addIntegerOption(o => o.setName('minutes').setDescription('Số phút (1-40320)').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption(o => o.setName('reason').setDescription('Lý do'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const minutes = interaction.options.getInteger('minutes');
    const reason = interaction.options.getString('reason') || 'Không có lý do';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [errorEmbed('Không tìm thấy người này.')], ephemeral: true });
    if (!member.moderatable) return interaction.reply({ embeds: [errorEmbed('Bot không thể timeout người này.')], ephemeral: true });
    await member.timeout(minutes * 60 * 1000, reason);
    require('../../utils/logger').logMod(interaction.guild, `⏳ ${interaction.user.tag} timeout ${user.tag} ${minutes} phút`, `Lý do: ${reason}`).catch(() => {});
    await interaction.reply({ embeds: [successEmbed(`Đã timeout **${user.tag}** trong ${minutes} phút\nLý do: ${reason}`)] });
  },
};
