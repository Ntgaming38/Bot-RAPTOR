const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'moderation',
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Bật/tắt chế độ chậm cho kênh (mỗi người chờ X giây mới gửi tiếp được)')
    .addIntegerOption((o) => o.setName('seconds').setDescription('Số giây chờ (0 = tắt chế độ chậm, tối đa 21600)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .addChannelOption((o) => o.setName('channel').setDescription('Kênh áp dụng (mặc định: kênh hiện tại)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction) {
    const seconds = interaction.options.getInteger('seconds');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const me = interaction.guild.members.me;
    if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ embeds: [errorEmbed('Bot thiếu quyền Quản lý kênh ở kênh này.')], ephemeral: true });
    }
    await channel.setRateLimitPerUser(seconds, `Đặt bởi ${interaction.user.tag}`);
    await interaction.reply({
      embeds: [successEmbed(seconds > 0
        ? `🐌 Đã bật chế độ chậm cho ${channel}: mỗi người chờ **${seconds} giây** giữa hai tin nhắn.`
        : `Đã tắt chế độ chậm cho ${channel}.`)],
      ephemeral: true,
    });
  },
};
