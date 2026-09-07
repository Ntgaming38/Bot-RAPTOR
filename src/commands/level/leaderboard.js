const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embeds');
const { buildLeaderboardEmbed, getLeaderboardSettings, saveLeaderboardSettings, clearLeaderboardSettings, updateLeaderboardChannel } = require('../../utils/leaderboardSettings');

function needAdmin(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    interaction.reply({ embeds: [errorEmbed('Chỉ Admin (Manage Server) mới dùng được lệnh này.')], ephemeral: true }).catch(() => {});
    return false;
  }
  return true;
}

module.exports = {
  group: 'level',
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Bảng xếp hạng level server')
    .addSubcommand(s => s.setName('show').setDescription('Xem BXH ngay tại đây'))
    .addSubcommand(s => s
      .setName('setup')
      .setDescription('Ghim BXH tự cập nhật vào 1 kênh riêng (chỉ Admin)')
      .addChannelOption(o => o.setName('channel').setDescription('Kênh đăng BXH').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
      .addIntegerOption(o => o.setName('top').setDescription('Số người hiển thị (mặc định 10)').setMinValue(3).setMaxValue(25)))
    .addSubcommand(s => s.setName('status').setDescription('Xem kênh BXH đang ghim (chỉ Admin)'))
    .addSubcommand(s => s.setName('disable').setDescription('Gỡ BXH khỏi kênh riêng (chỉ Admin)')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === 'show') {
      if (!interaction.deferred && !interaction.replied) await interaction.deferReply().catch(() => {});
      const em = await buildLeaderboardEmbed(interaction.client, guildId, 10);
      return interaction.editReply({ embeds: [em] });
    }

    if (sub === 'setup') {
      if (!needAdmin(interaction)) return;
      if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true }).catch(() => {});
      const channel = interaction.options.getChannel('channel');
      const top = interaction.options.getInteger('top') || 10;
      await saveLeaderboardSettings(guildId, { channelId: channel.id, limit: top });
      const msg = await updateLeaderboardChannel(interaction.client, guildId);
      if (!msg) return interaction.editReply({ embeds: [errorEmbed('Không gửi được vào kênh đó. Kiểm tra bot có quyền Xem + Gửi tin trong kênh không.')] });
      return interaction.editReply({ embeds: [successEmbed(`Đã ghim BXH top ${top} vào ${channel}, tự cập nhật mỗi 10 phút.`)] });
    }

    if (sub === 'status') {
      if (!needAdmin(interaction)) return;
      const s = await getLeaderboardSettings(guildId);
      return interaction.reply({
        embeds: [embed({
          title: '⚙️ Kênh leaderboard',
          description: s.channelId
            ? `Kênh: <#${s.channelId}>\nTop: **${s.limit || 10}**\nTin nhắn: ${s.messageId ? `[mở](https://discord.com/channels/${guildId}/${s.channelId}/${s.messageId})` : 'chưa có'}\nTự cập nhật mỗi 10 phút.`
            : 'Chưa setup. Chạy `/leaderboard setup` để ghim.',
        })],
        ephemeral: true,
      });
    }

    if (sub === 'disable') {
      if (!needAdmin(interaction)) return;
      await clearLeaderboardSettings(guildId);
      return interaction.reply({ embeds: [successEmbed('Đã gỡ BXH khỏi kênh riêng. Lệnh `/leaderboard show` vẫn xem được.')], ephemeral: true });
    }
  },
};
