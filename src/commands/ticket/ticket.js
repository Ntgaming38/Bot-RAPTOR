const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const tickets = require('../../utils/tickets');

module.exports = {
  group: 'ticket',
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Hệ thống ticket hỗ trợ')
    .addSubcommand(s => s.setName('setup').setDescription('Gửi bảng ticket + cài đặt kênh (chỉ admin)')
      .addChannelOption(o => o.setName('kenh').setDescription('Kênh đặt bảng ticket (để trống = kênh hiện tại)'))
      .addBooleanOption(o => o.setName('khoa_chat').setDescription('Khóa chat, member chỉ được bấm nút (mặc định: có)'))
      .addStringOption(o => o.setName('ten_kenh_moi').setDescription('Hoặc tạo kênh mới với tên này, VD: mo-ticket')))
    .addSubcommand(s => s.setName('channel').setDescription('Tạo kênh mở-ticket riêng đã khóa chat (chỉ admin)')
      .addStringOption(o => o.setName('ten').setDescription('Tên kênh, VD: mo-ticket (mặc định: mo-ticket)')))
    .addSubcommand(s => s.setName('close').setDescription('Đóng ticket hiện tại'))
    .addSubcommand(s => s.setName('transcript').setDescription('Xuất lịch sử chat ticket'))
    .addSubcommand(s => s.setName('add').setDescription('Thêm người vào ticket')
      .addUserOption(o => o.setName('user').setDescription('Người cần thêm').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Xóa người khỏi ticket')
      .addUserOption(o => o.setName('user').setDescription('Người cần xóa').setRequired(true)))
    .addSubcommand(s => s.setName('rename').setDescription('Đổi tên kênh ticket')
      .addStringOption(o => o.setName('ten').setDescription('Tên mới').setRequired(true))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'setup') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ embeds: [errorEmbed('⛔ Chỉ **Admin** mới được setup ticket.')], ephemeral: true });
      }
      const lock = interaction.options.getBoolean('khoa_chat') ?? true;
      const newName = interaction.options.getString('ten_kenh_moi');
      let target = interaction.options.getChannel('kenh') || interaction.channel;

      await interaction.deferReply({ ephemeral: true });

      // Tạo kênh mới nếu admin nhập tên
      if (newName) {
        target = await tickets.createPanelChannel(interaction.guild, newName);
      }
      if (!target?.isTextBased()) {
        return interaction.editReply({ embeds: [errorEmbed('Kênh phải là kênh text.') ] });
      }
      if (lock) await tickets.lockPanelChannel(target, interaction.guild);
      await target.send({
        embeds: [tickets.setupEmbed()],
        components: tickets.setupComponents(),
      });
      return interaction.editReply({ embeds: [successEmbed(`✅ Đã gửi bảng ticket vào ${target}!${lock ? '\n🔒 Đã khóa chat — member chỉ xem + bấm chọn, không nhắn được.' : ''}${newName ? '\nXóa panel cũ ở kênh khác (nếu có) để tránh loạn.' : ''}`)] });
    }
    if (sub === 'channel') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ embeds: [errorEmbed('⛔ Chỉ **Admin** mới được tạo kênh ticket.')], ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const ch = await tickets.createPanelChannel(interaction.guild, interaction.options.getString('ten') || 'mo-ticket');
      await ch.send({ embeds: [tickets.setupEmbed()], components: tickets.setupComponents() });
      return interaction.editReply({ embeds: [successEmbed(`✅ Đã tạo kênh ${ch}!\n🔒 Kênh đã khóa chat — member chỉ được chọn loại ticket, không nhắn linh tinh.\nXóa panel cũ ở kênh khác (nếu có) để tránh loạn.`)] });
    }
    if (sub === 'close') return tickets.handleClose(interaction);
    if (sub === 'transcript') return tickets.handleTranscript(interaction);
    if (sub === 'add') return tickets.handleAdd(interaction, interaction.options.getUser('user', true));
    if (sub === 'remove') return tickets.handleRemove(interaction, interaction.options.getUser('user', true));
    if (sub === 'rename') return tickets.handleRename(interaction, interaction.options.getString('ten', true));
  },
};
