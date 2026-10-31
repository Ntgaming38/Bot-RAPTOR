const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'moderation',
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Khóa kênh: mọi người không gửi tin nhắn được (trừ quản trị)')
    .addChannelOption((o) => o.setName('channel').setDescription('Kênh cần khóa (mặc định: kênh hiện tại)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const me = interaction.guild.members.me;
    if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ embeds: [errorEmbed('Bot thiếu quyền Quản lý kênh ở kênh này.')], ephemeral: true });
    }
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }, { reason: `Khóa bởi ${interaction.user.tag}` });
    await channel.send({ embeds: [successEmbed(`🔒 Kênh đã bị khóa bởi ${interaction.user}. Mọi người tạm thời không gửi tin nhắn được.`)] }).catch(() => {});
    if (channel.id !== interaction.channelId) {
      await interaction.reply({ embeds: [successEmbed(`Đã khóa kênh ${channel}.`)], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [successEmbed('Đã khóa kênh này.')], ephemeral: true });
    }
    require('../../utils/activity').record(interaction.guildId, 'lock', `@${interaction.user.tag} khóa kênh #${channel.name}`).catch(() => {});
  },
};
