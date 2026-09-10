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
      .addStringOption(o => o.setName('ten').setDescription('Tên mới').setRequired(true)))
    .addSubcommand(s => s.setName('priority').setDescription('Đặt mức ưu tiên')
      .addStringOption(o => o.setName('muc').setDescription('Mức').setRequired(true)
        .addChoices(
          { name: '🟢 Low', value: 'low' },
          { name: '🟡 Medium', value: 'medium' },
          { name: '🔴 High', value: 'high' },
          { name: '⛔ Urgent', value: 'urgent' },
        )))
    .addSubcommand(s => s.setName('lock').setDescription('Khóa ticket (chủ ticket chỉ xem)'))
    .addSubcommand(s => s.setName('unlock').setDescription('Mở khóa ticket'))
    .addSubcommand(s => s.setName('unclaim').setDescription('Bỏ nhận ticket (staff)'))
    .addSubcommand(s => s.setName('reopen').setDescription('Mở lại ticket đã lưu trữ'))
    .addSubcommandGroup(g => g.setName('blacklist').setDescription('Chặn/mở chặn tạo ticket')
      .addSubcommand(s => s.setName('add').setDescription('Chặn 1 người tạo ticket')
        .addUserOption(o => o.setName('user').setDescription('Người cần chặn').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Lý do').setMaxLength(300)))
      .addSubcommand(s => s.setName('remove').setDescription('Gỡ chặn')
        .addUserOption(o => o.setName('user').setDescription('Người cần gỡ').setRequired(true)))
      .addSubcommand(s => s.setName('list').setDescription('Xem danh sách chặn')))
    .addSubcommand(s => s.setName('stats').setDescription('Thống kê ticket/staff/đánh giá')),
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
      const st = await require('../../utils/guildSettings').getGuildSettings(interaction.guildId).catch(() => null);
      await target.send({
        embeds: [tickets.setupEmbed(st)],
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
      const st = await require('../../utils/guildSettings').getGuildSettings(interaction.guildId).catch(() => null);
      await ch.send({ embeds: [tickets.setupEmbed(st)], components: tickets.setupComponents() });
      return interaction.editReply({ embeds: [successEmbed(`✅ Đã tạo kênh ${ch}!\n🔒 Kênh đã khóa chat — member chỉ được chọn loại ticket, không nhắn linh tinh.\nXóa panel cũ ở kênh khác (nếu có) để tránh loạn.`)] });
    }
    if (sub === 'close') return tickets.handleClose(interaction);
    if (sub === 'transcript') return tickets.handleTranscript(interaction);
    if (sub === 'add') return tickets.handleAdd(interaction, interaction.options.getUser('user', true));
    if (sub === 'remove') return tickets.handleRemove(interaction, interaction.options.getUser('user', true));
    if (sub === 'rename') return tickets.handleRename(interaction, interaction.options.getString('ten', true));
    const pro = require('../../utils/ticketsPro');
    if (interaction.options.getSubcommandGroup(false) === 'blacklist') {
      const bsub = interaction.options.getSubcommand();
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ embeds: [errorEmbed('⛔ Chỉ **Admin** mới quản lý blacklist.')], ephemeral: true });
      }
      if (bsub === 'add') {
        const user = interaction.options.getUser('user', true);
        await pro.blacklistAdd(interaction.guildId, user.id, interaction.options.getString('reason') || '', interaction.user.tag);
        return interaction.reply({ embeds: [successEmbed(`⛔ Đã chặn ${user.tag} tạo ticket.`)] });
      }
      if (bsub === 'remove') {
        const user = interaction.options.getUser('user', true);
        await pro.blacklistRemove(interaction.guildId, user.id);
        return interaction.reply({ embeds: [successEmbed(`✅ Đã gỡ chặn ${user.tag}.`)] });
      }
      const list = await pro.blacklistList(interaction.guildId);
      if (!list.length) return interaction.reply({ content: 'Danh sách chặn trống.', ephemeral: true });
      return interaction.reply({
        content: list.map((e) => `• <@${e.userId}> — ${e.reason || 'không lý do'} _(bởi ${e.by || '?'})_`).join('\n').slice(0, 2000),
        ephemeral: true,
      });
    }
    if (sub === 'priority') {
      const level = interaction.options.getString('muc', true);
      const db = tickets.load();
      const t = db[interaction.channelId];
      if (!t) return interaction.reply({ embeds: [errorEmbed('Kênh này không phải ticket.')], ephemeral: true });
      if (!(await tickets.canManageTicket(interaction, t))) {
        return interaction.reply({ embeds: [errorEmbed('Chỉ chủ ticket hoặc staff mới đổi priority.')], ephemeral: true });
      }
      t.priority = level;
      db[interaction.channelId] = t;
      tickets.save(db);
      try {
        if (t.openingMessageId) {
          const msg = await interaction.channel.messages.fetch(t.openingMessageId).catch(() => null);
          if (msg) await msg.edit({ embeds: [pro.ticketInfoEmbed(t)] }).catch(() => {});
        }
      } catch {}
      return interaction.reply({ content: `⚡ Priority → **${pro.prioText(level)}**` });
    }
    if (sub === 'lock') return pro.handleLock(interaction, true);
    if (sub === 'unlock') return pro.handleLock(interaction, false);
    if (sub === 'unclaim') return pro.handleUnclaim(interaction);
    if (sub === 'reopen') return pro.handleReopen(interaction);
    if (sub === 'stats') {
      if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true }).catch(() => {});
      const s = await pro.computeTicketStats(interaction.guildId);
      const typeLines = Object.entries(s.byType).map(([k, v]) => `• ${k}: **${v}**`).join('\n') || '—';
      const staffLines = s.staff.map((x) => `• **${x.tag}** — nhận ${x.claimed}, đóng ${x.closed}`).join('\n') || '—';
      const dist = (s.ratingDist || []).map((n, i) => `${i + 1}⭐: ${n}`).join(' • ');
      return interaction.editReply({
        embeds: [require('../../utils/embeds').embed({
          title: `📊 Thống kê ticket — ${interaction.guild.name}`,
          description: [
            `**Đang mở:** ${s.open} • **Đã đóng:** ${s.closedTotal}`,
            s.avgMin !== null ? `**Thời gian xử lý TB:** ~${s.avgMin} phút` : '**Thời gian xử lý TB:** chưa đủ dữ liệu',
            `**Đánh giá:** ${s.ratingAvg ? `${s.ratingAvg}⭐ (${s.ratingCount} lượt)` : 'chưa có'}`,
            dist ? `\n${dist}` : '',
            `\n**Theo loại:**\n${typeLines}`,
            `\n**Top staff:**\n${staffLines}`,
          ].join('\n'),
        })],
      });
    }
  },
};
