const { SlashCommandBuilder } = require('discord.js');
const { embed, errorEmbed } = require('../../utils/embeds');
const { requireVoice, friendlyPlayError, playerOf } = require('../../music/helpers');
const { resolvePlayable } = require('../../music/sources');

module.exports = {
  group: 'nhạc',
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Phát nhạc (YouTube / SoundCloud / link)')
    .addStringOption(o => o.setName('song').setDescription('Tên bài hát, link YouTube/SoundCloud/mp3 (thêm "sc " ở đầu để tìm SoundCloud)').setRequired(true)),
  async execute(interaction, client) {
    const channel = await requireVoice(interaction);
    if (!channel) return;
    const player = playerOf(client);
    if (!player) return interaction.reply({ embeds: [errorEmbed('Player nhạc chưa khởi tạo.')], ephemeral: true });

    const raw = interaction.options.getString('song', true);
    let resolved;
    try {
      resolved = resolvePlayable(raw);
    } catch (e) {
      return interaction.reply({ embeds: [errorEmbed(friendlyPlayError(e))], ephemeral: true });
    }

    await interaction.deferReply();
    const wasActive = (() => {
      try {
        const q0 = player.nodes?.get?.(interaction.guildId);
        return !!(q0?.currentTrack || q0?.current);
      } catch { return false; }
    })();
    try {
      const res = await player.play(channel, resolved.query, {
        nodeOptions: { metadata: { channel: interaction.channel } },
        requestedBy: interaction.user,
        searchEngine: resolved.searchEngine,
      });
      const track = res?.track;
      // Volume mặc định theo server (dashboard tab Music) khi bắt đầu phiên mới
      try {
        const st = await require('../../utils/guildSettings').getGuildSettings(interaction.guildId).catch(() => null);
        const dv = st?.musicDefaultVolume;
        if (!wasActive && Number.isFinite(dv)) {
          const q = res?.queue || player.nodes?.get?.(interaction.guildId);
          if (q?.node?.setVolume) q.node.setVolume(Math.min(100, Math.max(0, dv)));
        }
      } catch {}
      const lines = [
        `**${track.cleanTitle || track.title}**`,
        `Tác giả: ${track.author || '?'}`,
        `Thời lượng: ${track.duration || '?'}`,
        `Nguồn: ${resolved.label}`,
      ];
      if (resolved.note) lines.push(`_${resolved.note}_`);
      await interaction.followUp({
        embeds: [embed({
          title: '🎶 Đã thêm vào hàng chờ',
          description: lines.join('\n'),
          thumbnail: track.thumbnail,
          footer: `Yêu cầu bởi ${interaction.user.tag}`,
        })],
      });
    } catch (e) {
      console.error('[play]', e?.message);
      // Extractor chính không ra kết quả (hay gặp ở SoundCloud) → thử yt-dlp lấy link trực tiếp
      const noResult = /No results|Empty|Noresult/i.test(e?.message || '');
      if (noResult && (resolved.adapter === 'soundcloud' || resolved.adapter === 'youtube')) {
        try {
          console.log('[play] thử đường dự phòng yt-dlp...');
          const { resolveDirectUrl } = require('../../music/fallback');
          const direct = await resolveDirectUrl(resolved.query);
          const { QueryType } = require('discord-player');
          const res2 = await player.play(channel, direct.url, {
            nodeOptions: { metadata: { channel: interaction.channel } },
            requestedBy: interaction.user,
            searchEngine: QueryType.AUTO,
          });
          const track2 = res2?.track;
          return interaction.followUp({
            embeds: [embed({
              title: '🎶 Đã thêm vào hàng chờ',
              description: [
                `**${track2?.cleanTitle || track2?.title || direct.title || 'Bài hát'}**`,
                `Tác giả: ${track2?.author || direct.author || '?'}`,
                `Thời lượng: ${track2?.duration || direct.duration || '?'}`,
                `Nguồn: ${resolved.label} (dự phòng)`,
              ].join('\n'),
              thumbnail: track2?.thumbnail || direct.thumbnail,
              footer: `Yêu cầu bởi ${interaction.user.tag}`,
            })],
          });
        } catch (e2) {
          console.error('[play-fallback]', e2?.message);
        }
      }
      const msg = friendlyPlayError(e);
      if (interaction.deferred) await interaction.followUp({ embeds: [errorEmbed(msg)] }).catch(() => {});
      else await interaction.reply({ embeds: [errorEmbed(msg)], ephemeral: true }).catch(() => {});
    }
  },
};
