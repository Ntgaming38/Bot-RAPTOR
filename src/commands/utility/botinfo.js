const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embeds');

function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d) parts.push(`${d} ngày`);
  if (h) parts.push(`${h} giờ`);
  if (m) parts.push(`${m} phút`);
  parts.push(`${sec} giây`);
  return parts.join(' ');
}

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Thông tin chi tiết về bot'),
  async execute(interaction, client) {
    const pkg = require('../../../package.json');
    const mem = process.memoryUsage().heapUsed / 1024 / 1024;
    const guilds = client.guilds.cache;
    let users = 0;
    for (const g of guilds.values()) users += g.memberCount ?? 0;
    await interaction.reply({
      embeds: [embed({
        title: `🤖 ${client.user.username}`,
        thumbnail: client.user.displayAvatarURL({ size: 256 }),
        description: [
          `**ID:** \`${client.user.id}\``,
          `**Version:** \`${pkg.version || '1.0.0'}\``,
          `**discord.js:** \`${pkg.dependencies?.['discord.js'] || require('discord.js').version}\``,
          `**Node.js:** \`${process.version}\``,
          `**Uptime:** ${fmtUptime(process.uptime() * 1000)}`,
          `**Ping:** WS \`${Math.round(client.ws.ping)}ms\``,
          `**RAM:** \`${mem.toFixed(1)} MB\``,
          `**Server:** \`${guilds.size}\` • **Users:** \`~${users}\` • **Lệnh:** \`${client.commands.size}\``,
        ].join('\n'),
      })],
    });
  },
};
