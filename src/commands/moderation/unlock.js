const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'moderation',
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Mở khóa kênh đã khóa bằng /lock')
    .addChannelOption((o) => o.setName('channel').setDescription('Kênh cần mở khóa (mặc định: kênh hiện tại)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const me = interaction.guild.members.me;
    if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ embeds: [errorEmbed('Bot thiếu quyền Quản lý kênh ở kênh này.')], ephemeral: true });
    }
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null }, { reason: `Mở khóa bởi ${interaction.user.tag}` });
    await channel.send({ embeds: [successEmbed(`🔓 Kênh đã được mở khóa bởi ${interaction.user}. Chat tiếp thôi!`)] }).catch(() => {});
    await interaction.reply({ embeds: [successEmbed(`Đã mở khóa kênh ${channel}.`)], ephemeral: true });
    require('../../utils/activity').record(interaction.guildId, 'lock', `@${interaction.user.tag} mở khóa kênh #${channel.name}`).catch(() => {});
  },
};
