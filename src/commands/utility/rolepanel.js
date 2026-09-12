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
      .addStringOption(o => o.setName('display').setDescription('Kiểu hiển thị').addChoices(
        { name: 'Nút bấm', value: 'buttons' },
        { name: 'Menu chọn', value: 'select' },
        { name: 'Thả reaction', value: 'reactions' },
      ))
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
      .setDescription('Sửa bảng (kênh, kiểu hiện, giới hạn...)')
      .addStringOption(o => o.setName('panel').setDescription('Tên bảng (trống = bảng duy nhất)').setMaxLength(50))
      .addChannelOption(o => o.setName('channel').setDescription('Chuyển sang kênh khác').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addStringOption(o => o.setName('title').setDescription('Tiêu đề mới').setMaxLength(100))
      .addStringOption(o => o.setName('description').setDescription('Mô tả mới (biến {roles} {server} {members})').setMaxLength(1000))
      .addStringOption(o => o.setName('footer').setDescription('Dòng chân mới').setMaxLength(100))
      .addStringOption(o => o.setName('thumbnail').setDescription('Link ảnh góc phải'))
      .addStringOption(o => o.setName('placeholder').setDescription('Chữ trong menu chọn').setMaxLength(150))
      .addBooleanOption(o => o.setName('rainbow').setDescription('Gạch cầu vồng dưới bảng'))
      .addStringOption(o => o.setName('display').setDescription('Kiểu hiển thị').addChoices(
        { name: 'Nút bấm', value: 'buttons' },
        { name: 'Menu chọn', value: 'select' },
        { name: 'Thả reaction', value: 'reactions' },
      ))
      .addBooleanOption(o => o.setName('exclusive').setDescription('Chọn 1 bỏ các role khác cùng bảng'))
      .addIntegerOption(o => o.setName('max').setDescription('Tối đa mấy role/người (0 = không giới hạn)').setMinValue(0).setMaxValue(25))
      .addRoleOption(o => o.setName('requires').setDescription('Role verify bắt buộc phải có trước')))
    .addSubcommand(s => s
      .setName('temp')
      .setDescription('Cấp role tạm thời, hết hạn tự gỡ')
      .addUserOption(o => o.setName('user').setDescription('Người nhận').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role cần cấp').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('VD: 10m, 2h, 1d').setRequired(true).setMaxLength(20)))
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
        const display = interaction.options.getString('display') || 'buttons';
        const board = await createBoard(guildId, {
          name: interaction.options.getString('name', true),
          channelId: interaction.options.getChannel('channel', true).id,
          title: interaction.options.getString('title'),
          description: interaction.options.getString('description'),
        });
        await saveBoard(guildId, bidOf(board), { display });
        return interaction.editReply({ embeds: [successEmbed(`Đã tạo bảng **${board.name}** (kiểu ${display}). Thêm role bằng \`/rolepanel add\`.`)] });
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
      if (interaction.options.getString('footer') !== null) patch.footer = interaction.options.getString('footer');
      if (interaction.options.getString('thumbnail') !== null) patch.thumbnailUrl = interaction.options.getString('thumbnail');
      if (interaction.options.getString('placeholder') !== null) patch.placeholder = interaction.options.getString('placeholder');
      if (interaction.options.getBoolean('rainbow') !== null) patch.rainbowBar = interaction.options.getBoolean('rainbow');
      if (interaction.options.getString('display') !== null) patch.display = interaction.options.getString('display');
      if (interaction.options.getBoolean('exclusive') !== null) patch.exclusive = interaction.options.getBoolean('exclusive');
      if (interaction.options.getInteger('max') !== null) patch.maxPicks = interaction.options.getInteger('max');
      const req = interaction.options.getRole('requires');
      if (req !== null) patch.requiredRoleId = req?.id || null;
      await saveBoard(guildId, bidOf(board), patch);
      await renderBoard(interaction.client, guildId, bidOf(board));
      return interaction.editReply({ embeds: [successEmbed(`Đã sửa bảng **${board.name}**.`)] });
    }

    if (sub === 'temp') {
      const user = interaction.options.getUser('user', true);
      const role = interaction.options.getRole('role', true);
      const { parseDuration } = require('../../utils/giveaways');
      const ms = parseDuration(interaction.options.getString('duration', true));
      if (!ms) return interaction.editReply({ embeds: [errorEmbed('Thời gian không hợp lệ. VD: `30m`, `2h`, `1d`.')] });
      if (role.managed || role.id === guildId) {
        return interaction.editReply({ embeds: [errorEmbed('Role này không cấp được.')] });
      }
      const me = interaction.guild.members.me;
      if (!me?.permissions.has('ManageRoles') || role.position >= me.roles.highest.position) {
        return interaction.editReply({ embeds: [errorEmbed('Bot không gắn được role này (thiếu quyền hoặc role cao hơn bot).')] });
      }
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.editReply({ embeds: [errorEmbed('Không tìm thấy người này trong server.')] });
      await member.roles.add(role).catch(() => null);
      await require('../../utils/tempRoles').grantTempRole(guildId, user.id, role.id, ms, interaction.user.tag);
      return interaction.editReply({ embeds: [successEmbed(`Đã cấp ${role} cho ${user} trong ${interaction.options.getString('duration', true)} (tự gỡ khi hết hạn).`)] });
    }

    if (sub === 'list') {
      const boards = await listBoards(guildId);
      if (!boards.length) return interaction.editReply({ embeds: [errorEmbed('Chưa có bảng nào. Tạo bằng `/rolepanel create`.')] });
      const { getBoard } = require('../../utils/roleBoards');
      const lines = [];
      for (const b of boards) {
        const full = await getBoard(guildId, b.id);
        const cfg = [];
        if (full?.display && full.display !== 'buttons') cfg.push(full.display);
        if (full?.exclusive) cfg.push('chọn 1');
        if (full?.maxPicks > 0) cfg.push(`tối đa ${full.maxPicks}`);
        lines.push(`**${b.name}** (${b.itemCount} role${cfg.length ? ' • ' + cfg.join(' • ') : ''}) → ${b.channelId ? `<#${b.channelId}>` : 'chưa đặt kênh'}\n${(full?.items || []).map((i) => `• <@&${i.roleId}> ${i.emoji || ''} — ${i.label}`).join('\n') || '_trống_'}`);
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
