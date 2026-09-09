const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { getStats, saveStats, clearStats, updateStatsChannel, setupMultiChannels, DEFAULT_TEMPLATE } = require('../../utils/statsSettings');

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
    .setName('stats')
    .setDescription('Kênh trạng thái server tự cập nhật (chỉ Admin)')
    .addSubcommand(s => s
      .setName('setup')
      .setDescription('Bật kênh trạng thái (để trống kênh = tự tạo)')
      .addChannelOption(o => o.setName('voice-channel').setDescription('Kênh voice làm bảng trạng thái').addChannelTypes(ChannelType.GuildVoice))
      .addStringOption(o => o.setName('template').setDescription('Mẫu tên (biến {members} {online} {voice} {server})').setMaxLength(100)))
    .addSubcommand(s => s.setName('status').setDescription('Xem + cập nhật ngay'))
    .addSubcommand(s => s
      .setName('setup-multi')
      .setDescription('Dựng 5 kênh riêng: All Members/Members/Bots/Channels/Roles')
      .addStringOption(o => o.setName('category-name').setDescription('Tên category (mặc định: _Info Server_)').setMaxLength(100)))
    .addSubcommand(s => s.setName('disable').setDescription('Tắt kênh trạng thái')),
  async execute(interaction) {
    if (!needAdmin(interaction)) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true }).catch(() => {});

    if (sub === 'setup') {
      let ch = interaction.options.getChannel('voice-channel');
      const template = interaction.options.getString('template') || null;
      if (!ch) {
        ch = await interaction.guild.channels.create({ name: '📊・trạng-thái', type: ChannelType.GuildVoice }).catch(() => null);
        if (!ch) return interaction.editReply({ embeds: [errorEmbed('Không tạo được kênh voice. Kiểm tra bot có quyền Manage Channels không.')] });
      }
      await saveStats(guildId, { voiceChannelId: ch.id, ...(template ? { template } : {}) });
      const name = await updateStatsChannel(interaction.client, guildId);
      if (!name) return interaction.editReply({ embeds: [errorEmbed('Không cập nhật được kênh.')] });
      return interaction.editReply({ embeds: [successEmbed(`Đã bật trạng thái ở ${ch}\nMẫu: \`${template || DEFAULT_TEMPLATE}\`\nTự cập nhật mỗi 15 phút.\n⚠️ Muốn đếm số người đang online thì bật thêm **Presence Intent** trong Developer Portal. `)] });
    }
    if (sub === 'status') {
      const s = await getStats(guildId);
      const multiOn = s.mode === 'multi' && s.multi?.all;
      if (!s.voiceChannelId && !multiOn) return interaction.editReply({ embeds: [errorEmbed('Chưa setup. Chạy `/stats setup` hoặc `/stats setup-multi` trước.')] });
      const name = await updateStatsChannel(interaction.client, guildId);
      return interaction.editReply({
        content: multiOn
          ? `Chế độ: **5 kênh riêng** (${name || '?'})\nKênh đơn: ${s.voiceChannelId ? `<#${s.voiceChannelId}>` : '—'}`
          : `Kênh: ${s.voiceChannelId ? `<#${s.voiceChannelId}>` : '—'}\nHiện tại: \`${name || '?'}\``,
      });
    }
    if (sub === 'setup-multi') {
      await interaction.editReply({ content: '⏳ Đang dựng 5 kênh...' });
      try {
        const line = await setupMultiChannels(interaction.client, guildId, interaction.options.getString('category-name'));
        return interaction.editReply({ embeds: [successEmbed(`Đã dựng 5 kênh trạng thái (${line}). Tự cập nhật mỗi 15 phút.`)] });
      } catch (e) {
        const msg = e?.message === 'no-perm'
          ? 'Bot cần quyền **Manage Channels** để tạo category + kênh.'
          : `Không dựng được: ${e?.message || e}`;
        return interaction.editReply({ embeds: [errorEmbed(msg)] });
      }
    }
    if (sub === 'disable') {
      await clearStats(guildId);
      return interaction.editReply({ embeds: [successEmbed('Đã tắt kênh trạng thái (kênh voice cũ vẫn giữ, xóa tay nếu không cần).')] });
    }
  },
};
