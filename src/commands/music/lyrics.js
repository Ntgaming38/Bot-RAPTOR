const { SlashCommandBuilder } = require('discord.js');
const { embed, errorEmbed } = require('../../utils/embeds');
const { playerOf, currentOf, trackTitle } = require('../../music/helpers');

function cleanTitle(raw) {
  return String(raw || '')
    .replace(/\((official|lyrics?|audio|video|mv|hd|4k|remaster)[^)]*\)/gi, '')
    .replace(/\[(official|lyrics?|audio|video|mv|hd|4k|remaster)[^\]]*\]/gi, '')
    .replace(/\b(official (music )?video|lyrics? video|audio)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

module.exports = {
  group: 'music',
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Xem lời bài hát đang phát (hoặc tìm theo tên bài)')
    .addStringOption((o) => o.setName('query').setDescription('Tên bài dạng "Ca sĩ - Tên bài" (trống = bài đang phát)').setMaxLength(120)),
  async execute(interaction) {
    let query = interaction.options.getString('query');
    if (!query) {
      const player = playerOf(interaction.client);
      const queue = player?.nodes?.get?.(interaction.guildId);
      const cur = queue ? currentOf(queue) : null;
      if (!cur) return interaction.reply({ embeds: [errorEmbed('Chưa có bài nào đang phát. Gõ `/lyrics query:"Ca sĩ - Tên bài"` để tìm theo tên.')], ephemeral: true });
      query = cleanTitle(trackTitle(cur) || cur.title || '');
    }
    await interaction.deferReply();
    let artist = '', title = query;
    if (query.includes(' - ')) {
      const parts = query.split(' - ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }
    try {
      if (!artist) {
        const sug = await fetch('https://api.lyrics.ovh/suggest/' + encodeURIComponent(title), { signal: AbortSignal.timeout(10_000) }).then((r) => r.json()).catch(() => null);
        const first = sug?.data?.[0];
        if (first) { artist = first.artist?.name || ''; title = first.title || title; }
      }
      if (!artist) throw new Error('no-artist');
      const data = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, { signal: AbortSignal.timeout(10_000) }).then((r) => r.json()).catch(() => null);
      const lyrics = data?.lyrics?.trim();
      if (!lyrics) throw new Error('not-found');
      const trimmed = lyrics.length > 1900 ? lyrics.slice(0, 1900) + '\n…' : lyrics;
      await interaction.editReply({ embeds: [embed({ title: `🎤 ${artist} — ${title}`, description: trimmed, footer: 'Lời bài hát từ lyrics.ovh' })] });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed(`Không tìm thấy lời cho **${query}**. Thử lại với định dạng "Ca sĩ - Tên bài" nhé.`)] });
    }
  },
};
