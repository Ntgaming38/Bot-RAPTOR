const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embeds');

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Xem bot đã online bao lâu'),
  async execute(interaction) {
    const ms = process.uptime() * 1000;
    const s = Math.floor(ms / 1000);
    const parts = [];
    const d = Math.floor(s / 86400);
    if (d) parts.push(`${d} ngày`);
    const h = Math.floor((s % 86400) / 3600);
    if (h) parts.push(`${h} giờ`);
    const m = Math.floor((s % 3600) / 60);
    if (m) parts.push(`${m} phút`);
    parts.push(`${s % 60} giây`);
    await interaction.reply({
      embeds: [embed({
        title: '⏱️ Uptime',
        description: `Bot đã online **${parts.join(' ')}**\nChạy từ: <t:${Math.floor((Date.now() - ms) / 1000)}:F>`,
      })],
    });
  },
};
