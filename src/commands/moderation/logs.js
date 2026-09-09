const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, embed } = require('../../utils/embeds');
const { LOG_TYPES, getLogSettings, saveLogSettings } = require('../../utils/logSettings');

function needAdmin(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    interaction.reply({ embeds: [errorEmbed('Chỉ Admin (Manage Server) mới dùng được lệnh này.')], ephemeral: true }).catch(() => {});
    return false;
  }
  return true;
}

const typeChoices = LOG_TYPES.map(([v, label]) => ({ name: label, value: v }));

module.exports = {
  group: 'moderation',
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Cấu hình log kiểu ProBot (chỉ Admin)')
    .addSubcommand(s => s
      .setName('setup')
      .setDescription('Chọn kênh nhận log')
      .addChannelOption(o => o.setName('channel').setDescription('Kênh log').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(s => s
      .setName('enable')
      .setDescription('Bật 1 loại log (hoặc tất cả)')
      .addStringOption(o => o.setName('type').setDescription('Loại log').setRequired(true)
        .addChoices({ name: 'Tất cả', value: 'all' }, ...typeChoices)))
    .addSubcommand(s => s
      .setName('disable')
      .setDescription('Tắt 1 loại log (hoặc tất cả)')
      .addStringOption(o => o.setName('type').setDescription('Loại log').setRequired(true)
        .addChoices({ name: 'Tất cả', value: 'all' }, ...typeChoices)))
    .addSubcommand(s => s.setName('config').setDescription('Xem cấu hình log hiện tại')),
  async execute(interaction) {
    if (!needAdmin(interaction)) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true }).catch(() => {});

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      await saveLogSettings(guildId, { channelId: channel.id });
      return interaction.editReply({ embeds: [successEmbed(`Đã đặt kênh log là ${channel}.\nMặc định bật hết 20 loại — tắt bớt bằng \`/logs disable\`.`)] });
    }
    if (sub === 'enable' || sub === 'disable') {
      const type = interaction.options.getString('type', true);
      const on = sub === 'enable';
      const toggles = {};
      if (type === 'all') {
        for (const [k] of LOG_TYPES) toggles[k] = on;
      } else {
        toggles[type] = on;
      }
      await saveLogSettings(guildId, { toggles });
      const label = type === 'all' ? 'tất cả' : (LOG_TYPES.find(([k]) => k === type)?.[1] || type);
      return interaction.editReply({ embeds: [successEmbed(`${on ? 'Đã bật' : 'Đã tắt'} log **${label}**.`)] });
    }
    if (sub === 'config') {
      const s = await getLogSettings(guildId);
      if (!s.channelId) return interaction.editReply({ embeds: [errorEmbed('Chưa setup kênh log. Chạy `/logs setup` trước.')] });
      const on = LOG_TYPES.filter(([k]) => s.toggles[k] !== false).map(([, l]) => `✅ ${l}`);
      const off = LOG_TYPES.filter(([k]) => s.toggles[k] === false).map(([, l]) => `❌ ${l}`);
      return interaction.editReply({
        embeds: [embed({
          title: '⚙️ Cấu hình log',
          description: `**Kênh:** <#${s.channelId}>\n\n**Đang bật (${on.length}):**\n${on.join(' • ') || '—'}${off.length ? `\n\n**Đang tắt (${off.length}):**\n${off.join(' • ')}` : ''}`,
        })],
      });
    }
  },
};
