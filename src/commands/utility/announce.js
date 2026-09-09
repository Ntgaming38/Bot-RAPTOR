const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { getAnnounce, saveAnnounce, clearAnnounce, parseLines, updateBoard } = require('../../utils/announceSettings');

function needAdmin(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    interaction.reply({ embeds: [errorEmbed('Chỉ Admin (Manage Server) mới dùng được lệnh này.')], ephemeral: true }).catch(() => {});
    return false;
  }
  return true;
}

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Bảng thông báo ghim tự cập nhật (chỉ Admin)')
    .addSubcommand(s => s
      .setName('setup')
      .setDescription('Ghim bảng thông báo vào 1 kênh')
      .addChannelOption(o => o.setName('channel').setDescription('Kênh đăng bảng').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
      .addStringOption(o => o.setName('text').setDescription('Nội dung (biến {server} {members}; nhiều tin cách nhau bằng dòng ---)').setRequired(true).setMaxLength(2000))
      .addStringOption(o => o.setName('title').setDescription('Tiêu đề, VD: 📢 THÔNG BÁO'))
      .addIntegerOption(o => o.setName('minutes').setDescription('Mấy phút xoay 1 tin (0 = tĩnh, mặc định 0)').setMinValue(0).setMaxValue(1440)))
    .addSubcommand(s => s.setName('test').setDescription('Đăng/cập nhật bảng ngay'))
    .addSubcommand(s => s.setName('status').setDescription('Xem cấu hình bảng tin'))
    .addSubcommand(s => s.setName('disable').setDescription('Gỡ bảng thông báo')),
  async execute(interaction) {
    if (!needAdmin(interaction)) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true }).catch(() => {});

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      const patch = {
        channelId: channel.id,
        title: interaction.options.getString('title') || null,
        text: interaction.options.getString('text', true),
        intervalMin: interaction.options.getInteger('minutes') ?? 0,
        lastRotated: Date.now(),
      };
      await saveAnnounce(guildId, patch);
      const msg = await updateBoard(interaction.client, guildId, 0);
      if (!msg) return interaction.editReply({ embeds: [errorEmbed('Không gửi được vào kênh đó. Kiểm tra bot có quyền Xem + Gửi tin không.')] });
      const n = parseLines(patch.text).length;
      return interaction.editReply({ embeds: [successEmbed(`Đã ghim bảng tin vào ${channel}${n > 1 && patch.intervalMin > 0 ? `, xoay ${n} tin mỗi ${patch.intervalMin} phút` : ''}.`)] });
    }
    if (sub === 'test') {
      const msg = await updateBoard(interaction.client, guildId);
      if (!msg) return interaction.editReply({ embeds: [errorEmbed('Chưa setup. Chạy `/announce setup` trước.')] });
      return interaction.editReply({ embeds: [successEmbed('Đã cập nhật bảng tin.')] });
    }
    if (sub === 'status') {
      const s = await getAnnounce(guildId);
      if (!s.channelId) return interaction.editReply({ embeds: [errorEmbed('Chưa setup. Chạy `/announce setup` trước.')] });
      const n = parseLines(s.text).length;
      return interaction.editReply({
        content: `**Bảng tin:** <#${s.channelId}>\n**Tiêu đề:** ${s.title || '📢 THÔNG BÁO'}\n**Số tin:** ${n}\n**Xoay:** ${s.intervalMin > 0 ? `mỗi ${s.intervalMin} phút` : 'tĩnh'}\n\n${(s.text || '').slice(0, 1000)}`,
      });
    }
    if (sub === 'disable') {
      await clearAnnounce(guildId);
      return interaction.editReply({ embeds: [successEmbed('Đã gỡ bảng thông báo.')] });
    }
  },
};
