const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { getPanel, savePanel, clearPanel, renderPanel, MAX_ITEMS } = require('../../utils/rolePanels');

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
    .setName('roles')
    .setDescription('Bảng nút chọn role (chỉ Admin)')
    .addSubcommand(s => s
      .setName('setup')
      .setDescription('Đặt kênh + tiêu đề bảng chọn role')
      .addChannelOption(o => o.setName('channel').setDescription('Kênh đặt bảng').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('Tiêu đề, VD: 🎮 CHỌN ROLE').setMaxLength(100))
      .addStringOption(o => o.setName('description').setDescription('Dòng hướng dẫn').setMaxLength(1000)))
    .addSubcommand(s => s
      .setName('add')
      .setDescription('Thêm 1 role vào bảng')
      .addRoleOption(o => o.setName('role').setDescription('Role cần thêm').setRequired(true))
      .addStringOption(o => o.setName('label').setDescription('Chữ trên nút (mặc định = tên role)').setMaxLength(80))
      .addStringOption(o => o.setName('emoji').setDescription('Emoji trên nút (VD: 🎮)').setMaxLength(50)))
    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Xóa 1 role khỏi bảng')
      .addRoleOption(o => o.setName('role').setDescription('Role cần xóa').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('Xem các role trong bảng'))
    .addSubcommand(s => s.setName('disable').setDescription('Gỡ bảng chọn role')),
  async execute(interaction) {
    if (!needAdmin(interaction)) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true }).catch(() => {});

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      await savePanel(guildId, {
        channelId: channel.id,
        ...(interaction.options.getString('title') ? { title: interaction.options.getString('title') } : {}),
        ...(interaction.options.getString('description') ? { description: interaction.options.getString('description') } : {}),
      });
      const msg = await renderPanel(interaction.client, guildId);
      if (!msg) return interaction.editReply({ embeds: [errorEmbed('Chưa có role nào trong bảng. Thêm bằng `/roles add` trước.')] });
      return interaction.editReply({ embeds: [successEmbed(`Đã đặt bảng chọn role ở ${channel}. Thêm role bằng \`/roles add\`.`)] });
    }

    if (sub === 'add') {
      const role = interaction.options.getRole('role');
      if (role.managed || role.id === guildId) {
        return interaction.editReply({ embeds: [errorEmbed('Role này (bot/integration/@everyone) không thể cho tự nhận.') ] });
      }
      const panel = await getPanel(guildId);
      const items = panel.items || [];
      if (items.some((i) => i.roleId === role.id)) {
        return interaction.editReply({ embeds: [errorEmbed(`Role ${role} đã có trong bảng rồi.`)] });
      }
      if (items.length >= MAX_ITEMS) {
        return interaction.editReply({ embeds: [errorEmbed(`Bảng tối đa ${MAX_ITEMS} role (giới hạn nút của Discord).`)] });
      }
      items.push({
        roleId: role.id,
        label: interaction.options.getString('label') || role.name,
        emoji: interaction.options.getString('emoji') || null,
      });
      await savePanel(guildId, { items });
      await renderPanel(interaction.client, guildId);
      return interaction.editReply({ embeds: [successEmbed(`Đã thêm ${role} vào bảng (${items.length}/${MAX_ITEMS}).`)] });
    }

    if (sub === 'remove') {
      const role = interaction.options.getRole('role');
      const panel = await getPanel(guildId);
      const items = (panel.items || []).filter((i) => i.roleId !== role.id);
      await savePanel(guildId, { items });
      await renderPanel(interaction.client, guildId);
      return interaction.editReply({ embeds: [successEmbed(`Đã xóa ${role} khỏi bảng.`)] });
    }

    if (sub === 'list') {
      const panel = await getPanel(guildId);
      const items = panel.items || [];
      if (!items.length) return interaction.editReply({ embeds: [errorEmbed('Bảng đang trống. Thêm bằng `/roles add`.')] });
      const guild = interaction.guild;
      const lines = await Promise.all(items.map(async (i, n) => {
        const r = await guild.roles.fetch(i.roleId).catch(() => null);
        return `**${n + 1}.** ${r ? `${r}` : `_(đã xóa: ${i.roleId})_`} ${i.emoji || ''} — nút: **${i.label}**`;
      }));
      return interaction.editReply({ content: `**Bảng ở:** ${panel.channelId ? `<#${panel.channelId}>` : 'chưa đặt'}\n\n${lines.join('\n')}`.slice(0, 2000) });
    }

    if (sub === 'disable') {
      await clearPanel(guildId);
      return interaction.editReply({ embeds: [successEmbed('Đã gỡ bảng chọn role.')] });
    }
  },
};
