const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { embed, errorEmbed } = require('../../utils/embeds');

const TYPE_LABEL = {
  [ChannelType.GuildText]: 'kênh text',
  [ChannelType.GuildVoice]: 'kênh voice',
  [ChannelType.GuildCategory]: 'category',
  [ChannelType.GuildAnnouncement]: 'kênh thông báo',
  [ChannelType.GuildForum]: 'forum',
  [ChannelType.GuildStageVoice]: 'stage',
};

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Xem thông tin kênh (mặc định: kênh hiện tại)')
    .addChannelOption(o => o.setName('channel').setDescription('Kênh cần xem')),
  async execute(interaction) {
    const ch = interaction.options.getChannel('channel') || interaction.channel;
    const full = await interaction.guild.channels.fetch(ch.id).catch(() => ch);
    if (!full) return interaction.reply({ embeds: [errorEmbed('Không tìm thấy kênh.')], ephemeral: true });
    const lines = [
      `**Tên:** ${full} (\`${full.name}\`)`,
      `**ID:** \`${full.id}\``,
      `**Loại:** ${TYPE_LABEL[full.type] || full.type}`,
      `**Category:** ${full.parent ? `${full.parent} (\`${full.parent.name}\`)` : '—'}`,
    ];
    if (full.topic) lines.push(`**Chủ đề:** ${full.topic.slice(0, 500)}`);
    if (typeof full.nsfw === 'boolean') lines.push(`**NSFW:** ${full.nsfw ? 'có' : 'không'}`);
    if (full.rateLimitPerUser) lines.push(`**Chậm:** ${full.rateLimitPerUser}s/tin`);
    if (full.bitrate) lines.push(`**Bitrate:** ${Math.round(full.bitrate / 1000)}kbps • **Giới hạn:** ${full.userLimit || '∞'} người`);
    lines.push(`**Tạo lúc:** <t:${Math.floor(full.createdTimestamp / 1000)}:F>`);
    await interaction.reply({
      embeds: [embed({ title: `📺 Thông tin kênh`, description: lines.join('\n') })],
    });
  },
};
