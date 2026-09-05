const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { embed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'nhạc',
  data: new SlashCommandBuilder().setName('queue').setDescription('Xem hàng chờ nhạc'),
  async execute(interaction, client) {
    let queue = null;
    try { queue = useQueue(); } catch {}
    queue = queue || client?.player?.nodes?.get(interaction.guildId);
    const current = queue?.currentTrack || queue?.current;
    if (!queue || !current) return interaction.reply({ embeds: [errorEmbed('Hàng chờ trống.')], ephemeral: true });

    let tracks = [];
    try {
      const t = queue.tracks;
      tracks = Array.isArray(t) ? t : (t?.toArray ? t.toArray() : (t?.data || []));
    } catch {}
    const list = tracks.slice(0, 10).map((tr, i) => `${i + 1}. **${tr.cleanTitle || tr.title}** — ${tr.requestedBy || ''}`).join('\n') || '_Hết, chỉ còn bài đang phát_';

    await interaction.reply({
      embeds: [embed({
        title: '🎵 Hàng chờ',
        description: `▶️ Đang phát: **${current.cleanTitle || current.title}**\n\n📜 Tiếp theo:\n${list}`,
        footer: `Tổng: ${tracks.length + 1} bài`,
      })],
    });
  },
};
