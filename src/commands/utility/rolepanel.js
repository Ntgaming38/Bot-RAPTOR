const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { listBoards, resolveBoard, createBoard, saveBoard, deleteBoard, renderBoard, MAX_ITEMS, MAX_BOARDS } = require('../../utils/roleBoards');

function needAdmin(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    interaction.reply({ embeds: [errorEmbed('Chỉ Admin (Manage Server) mới dùng được lệnh này.')], ephemeral: true }).catch(() => {});
    return false;
  }
  return true;
}

async function pickBoard(interaction, guildId) {
  const name = interaction.options.getString('panel');
  const found = await resolveBoard(guildId, name);
  if (!found) {
    await interaction.editReply({ embeds: [errorEmbed(name ? `Không thấy bảng **${name}**.` : 'Chưa có bảng nào. Tạo bằng `/rolepanel create` trước.')] });
    return null;
  }
  if (found === 'MANY') {
    const boards = await listBoards(guildId);
    await interaction.editReply({ embeds: [errorEmbed(`Có nhiều bảng — ghi rõ tên: ${boards.map((b) => `**${b.name}**`).join(', ')}`)] });
    return null;
  }
  return found;
}

const bidOf = (b) => String(b._id || b.id);

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('rolepanel')
    .setDescription('Nhiều bảng chọn role kiểu ProBot (chỉ Admin)')
    .addSubcommand(s => s
      .setName('create')
      .setDescription('Tạo bảng mới (VD: Game, Màu sắc, Thông báo)')
      .addStringOption(o => o.setName('name').setDescription('Tên bảng').setRequired(true).setMaxLength(50))
      .addChannelOption(o => o.setName('channel').setDescription('Kênh đặt bảng').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('Tiêu đề embed').setMaxLength(100))
      .addStringOption(o => o.setName('description').setDescription('Dòng hướng dẫn').setMaxLength(1000)))
    .addSubcommand(s => s
      .setName('add')
      .setDescription('Thêm role vào bảng')
      .addRoleOption(o => o.setName('role').setDescription('Role cần thêm').setRequired(true))
      .addStringOption(o => o.setName('panel').setDescription('Tên bảng (trống = bảng duy nhất)').setMaxLength(50))
      .addStringOption(o => o.setName('label').setDescription('Chữ trên nút').setMaxLength(80))
      .addStringOption(o => o.setName('emoji').setDescription('Emoji trên nút').setMaxLength(50)))
    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Xóa role khỏi bảng')
      .addRoleOption(o => o.setName('role').setDescription('Role cần xóa').setRequired(true))
      .addStringOption(o => o.setName('panel').setDescription('Tên bảng').setMaxLength(50)))
    .addSubcommand(s => s
      .setName('edit')
      .setDescription('Sửa tiêu đề/mô tả/kênh của bảng')
      .addStringOption(o => o.setName('panel').setDescription('Tên bảng (trống = bảng duy nhất)').setMaxLength(50))
      .addChannelOption(o => o.setName('channel').setDescription('Chuyển sang kênh khác').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addStringOption(o => o.setName('title').setDescription('Tiêu đề mới').setMaxLength(100))
      .addStringOption(o => o.setName('description').setDescription('Mô tả mới').setMaxLength(1000)))
    .addSubcommand(s => s.setName('list').setDescription('Liệt kê các bảng'))
    .addSubcommand(s => s
      .setName('delete')
      .setDescription('Xóa cả bảng (kèm tin nhắn)')
      .addStringOption(o => o.setName('panel').setDescription('Tên bảng').setRequired(true).setMaxLength(50))),
  async execute(interaction) {
    if (!needAdmin(interaction)) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true }).catch(() => {});

    if (sub === 'create') {
      try {
        const board = await createBoard(guildId, {
          name: interaction.options.getString('name', true),
          channelId: interaction.options.getChannel('channel', true).id,
          title: interaction.options.getString('title'),
          description: interaction.options.getString('description'),
        });
        return interaction.editReply({ embeds: [successEmbed(`Đã tạo bảng **${board.name}**. Thêm role bằng \`/rolepanel add\`.`)] });
      } catch (e) {
        const msg = e?.message === 'exists' ? 'Tên này đã có rồi, đặt tên khác.'
          : e?.message === 'limit' ? `Tối đa ${MAX_BOARDS} bảng.` : 'Không tạo được bảng.';
        return interaction.editReply({ embeds: [errorEmbed(msg)] });
      }
    }

    if (sub === 'add') {
      const board = await pickBoard(interaction, guildId);
      if (!board) return;
      const role = interaction.options.getRole('role');
      if (role.managed || role.id === guildId) {
        return interaction.editReply({ embeds: [errorEmbed('Role này không thể cho tự nhận.')] });
      }
      const items = board.items || [];
      if (items.some((i) => i.roleId === role.id)) {
        return interaction.editReply({ embeds: [errorEmbed(`Role ${role} đã có trong bảng **${board.name}** rồi.`)] });
      }
      if (items.length >= MAX_ITEMS) {
        return interaction.editReply({ embeds: [errorEmbed(`Bảng tối đa ${MAX_ITEMS} role.`)] });
      }
      items.push({
        roleId: role.id,
        label: interaction.options.getString('label') || role.name,
        emoji: interaction.options.getString('emoji') || null,
      });
      await saveBoard(guildId, bidOf(board), { items });
      await renderBoard(interaction.client, guildId, bidOf(board));
      return interaction.editReply({ embeds: [successEmbed(`Đã thêm ${role} vào bảng **${board.name}** (${items.length}/${MAX_ITEMS}).`)] });
    }

    if (sub === 'remove') {
      const board = await pickBoard(interaction, guildId);
      if (!board) return;
      const role = interaction.options.getRole('role');
      const items = (board.items || []).filter((i) => i.roleId !== role.id);
      await saveBoard(guildId, bidOf(board), { items });
      await renderBoard(interaction.client, guildId, bidOf(board));
      return interaction.editReply({ embeds: [successEmbed(`Đã xóa ${role} khỏi bảng **${board.name}**.`)] });
    }

    if (sub === 'edit') {
      const board = await pickBoard(interaction, guildId);
      if (!board) return;
      const patch = {};
      const ch = interaction.options.getChannel('channel');
      if (ch) { patch.channelId = ch.id; patch.messageId = null; }
      if (interaction.options.getString('title') !== null) patch.title = interaction.options.getString('title');
      if (interaction.options.getString('description') !== null) patch.description = interaction.options.getString('description');
      await saveBoard(guildId, bidOf(board), patch);
      await renderBoard(interaction.client, guildId, bidOf(board));
      return interaction.editReply({ embeds: [successEmbed(`Đã sửa bảng **${board.name}**.`)] });
    }

    if (sub === 'list') {
      const boards = await listBoards(guildId);
      if (!boards.length) return interaction.editReply({ embeds: [errorEmbed('Chưa có bảng nào. Tạo bằng `/rolepanel create`.')] });
      const { getBoard } = require('../../utils/roleBoards');
      const lines = [];
      for (const b of boards) {
        const full = await getBoard(guildId, b.id);
        lines.push(`**${b.name}** (${b.itemCount} role) → ${b.channelId ? `<#${b.channelId}>` : 'chưa đặt kênh'}\n${(full?.items || []).map((i) => `• <@&${i.roleId}> ${i.emoji || ''} — ${i.label}`).join('\n') || '_trống_'}`);
      }
      return interaction.editReply({ content: lines.join('\n\n').slice(0, 2000) });
    }

    if (sub === 'delete') {
      const boards = await listBoards(guildId);
      const name = interaction.options.getString('panel', true);
      const found = boards.find((b) => b.name.toLowerCase() === name.toLowerCase());
      if (!found) return interaction.editReply({ embeds: [errorEmbed(`Không thấy bảng **${name}**.`)] });
      const board = await deleteBoard(guildId, found.id);
      // Xóa luôn tin nhắn bảng cho gọn
      try {
        if (board?.channelId && board?.messageId) {
          const ch = await interaction.guild.channels.fetch(board.channelId).catch(() => null);
          const msg = ch && await ch.messages.fetch(board.messageId).catch(() => null);
          if (msg) await msg.delete().catch(() => {});
        }
      } catch {}
      return interaction.editReply({ embeds: [successEmbed(`Đã xóa bảng **${found.name}** (role của member giữ nguyên).`)] });
    }
  },
};
