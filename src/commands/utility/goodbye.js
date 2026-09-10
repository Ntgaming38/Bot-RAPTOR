const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { getGoodbye, saveGoodbye, clearGoodbye, buildGoodbye } = require('../../utils/goodbyeSettings');

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
    .setName('goodbye')
    .setDescription('Tin nhắn tạm biệt khi member rời (chỉ Admin)')
    .addSubcommand(s => s
      .setName('setup')
      .setDescription('Cài kênh + nội dung tạm biệt')
      .addChannelOption(o => o.setName('channel').setDescription('Kênh gửi tin tạm biệt').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
      .addStringOption(o => o.setName('text').setDescription('Nội dung (biến {user} {tag} {server} {members})').setMaxLength(2000))
      .addStringOption(o => o.setName('title').setDescription('Tiêu đề').setMaxLength(100))
      .addStringOption(o => o.setName('image').setDescription('Link ảnh (trống = avatar người rời)'))
      .addStringOption(o => o.setName('color').setDescription('Màu viền, VD: #ED4245')))
    .addSubcommand(s => s.setName('test').setDescription('Gửi thử với chính bạn'))
    .addSubcommand(s => s.setName('status').setDescription('Xem cấu hình hiện tại'))
    .addSubcommand(s => s.setName('disable').setDescription('Tắt tin tạm biệt')),
  async execute(interaction) {
    if (!needAdmin(interaction)) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true }).catch(() => {});

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      await saveGoodbye(guildId, {
        channelId: channel.id,
        ...(interaction.options.getString('text') ? { text: interaction.options.getString('text') } : {}),
        ...(interaction.options.getString('title') ? { title: interaction.options.getString('title') } : {}),
        ...(interaction.options.getString('image') ? { imageUrl: interaction.options.getString('image') } : {}),
        ...(interaction.options.getString('color') ? { color: interaction.options.getString('color') } : {}),
      });
      const s = await getGoodbye(guildId);
      await channel.send({ embeds: [buildGoodbye(interaction.member, s)] }).catch(() => null);
      return interaction.editReply({ embeds: [successEmbed(`Đã bật tin tạm biệt ở ${channel} (xem thử ở trên).`)] });
    }
    if (sub === 'test') {
      const s = await getGoodbye(guildId);
      if (!s.channelId) return interaction.editReply({ embeds: [errorEmbed('Chưa setup. Chạy `/goodbye setup` trước.')] });
      const ch = await interaction.guild.channels.fetch(s.channelId).catch(() => null);
      if (!ch?.isTextBased()) return interaction.editReply({ embeds: [errorEmbed('Không tìm thấy kênh đã setup.')] });
      await ch.send({ embeds: [buildGoodbye(interaction.member, s)] });
      return interaction.editReply({ embeds: [successEmbed(`Đã gửi thử vào ${ch}.`)] });
    }
    if (sub === 'status') {
      const s = await getGoodbye(guildId);
      if (!s.channelId) return interaction.editReply({ embeds: [errorEmbed('Chưa setup. Chạy `/goodbye setup` trước.')] });
      return interaction.editReply({ content: `**Kênh:** <#${s.channelId}>\n**Tiêu đề:** ${s.title || '(mặc định)'}\n**Nội dung:**\n${s.text || '(mặc định)'}`.slice(0, 2000) });
    }
    if (sub === 'disable') {
      await clearGoodbye(guildId);
      return interaction.editReply({ embeds: [successEmbed('Đã tắt tin tạm biệt.')] });
    }
  },
};
