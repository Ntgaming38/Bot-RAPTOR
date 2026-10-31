const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'moderation',
  data: new SlashCommandBuilder()
    .setName('move')
    .setDescription('Kéo một thành viên sang kênh voice khác')
    .addUserOption((o) => o.setName('user').setDescription('Người cần kéo').setRequired(true))
    .addChannelOption((o) => o.setName('channel').setDescription('Kênh voice đích').setRequired(true).addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice))
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const channel = interaction.options.getChannel('channel');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [errorEmbed('Không tìm thấy người này trong server.')], ephemeral: true });
    if (!member.voice?.channel) return interaction.reply({ embeds: [errorEmbed(`**${user.tag}** đang không ở kênh voice nào.`)], ephemeral: true });
    await member.voice.setChannel(channel, `Kéo bởi ${interaction.user.tag}`).catch((e) => { throw e; });
    await interaction.reply({ embeds: [successEmbed(`Đã kéo **${user.tag}** sang kênh voice **${channel.name}**.`)], ephemeral: true });
  },
};
