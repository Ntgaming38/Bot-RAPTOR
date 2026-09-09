const { PermissionFlagsBits } = require('discord.js');
const { useQueue, useMainPlayer } = require('discord-player');
const { errorEmbed } = require('../utils/embeds');

// Kiểm tra: user trong voice chưa + bot có quyền Connect/Speak không.
// Trả về voice channel, hoặc null (đã tự reply lỗi).
async function requireVoice(interaction) {
  const channel = interaction.member?.voice?.channel;
  if (!channel) {
    await interaction.reply({ embeds: [errorEmbed('Bạn phải vào kênh voice trước đã!')], ephemeral: true }).catch(() => {});
    return null;
  }
  const me = interaction.guild.members.me;
  if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.Connect)) {
    await interaction.reply({ embeds: [errorEmbed('Bot không có quyền vào kênh voice này.')], ephemeral: true }).catch(() => {});
    return null;
  }
  if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.Speak)) {
    await interaction.reply({ embeds: [errorEmbed('Bot không có quyền nói trong kênh voice này.')], ephemeral: true }).catch(() => {});
    return null;
  }
  return channel;
}

function getQueue(interaction, client) {
  try {
    const q = useQueue(interaction.guildId);
    if (q) return q;
  } catch {}
  try {
    return client?.player?.nodes?.get(interaction.guildId) || null;
  } catch {
    return null;
  }
}

function currentOf(queue) {
  return queue?.currentTrack || queue?.current || null;
}

function upcomingOf(queue) {
  try {
    const t = queue?.tracks;
    if (!t) return [];
    if (Array.isArray(t)) return t;
    if (typeof t.toArray === 'function') return t.toArray();
    return t.data || [];
  } catch {
    return [];
  }
}

function trackTitle(t) {
  return t?.cleanTitle || t?.title || 'Không rõ tên';
}

// Dịch lỗi kỹ thuật thành tiếng Việt dễ hiểu
function friendlyPlayError(e) {
  const msg = e?.message || String(e || '');
  if (e?.code === 'YOUTUBE_DISABLED') return msg;
  if (/No results|Empty|Noresult/i.test(msg)) {
    return 'Không tìm thấy bài này. Thử link trực tiếp, thêm `sc` ở đầu để tìm SoundCloud (VD: `sc tên bài`), hoặc từ khóa khác.';
  }
  if (/Sign in to confirm|confirm.*not a bot|403|429/i.test(msg)) {
    return 'YouTube đang chặn bot (IP host bị chặn). Hãy dùng link SoundCloud hoặc mp3 trực tiếp, hoặc báo admin thêm YOUTUBE_COOKIE.';
  }
  if (/ffmpeg|FFmpeg|opus|encode/i.test(msg)) {
    return 'Lỗi giải mã audio. Thử bài khác hoặc báo admin kiểm tra ffmpeg.';
  }
  return `Không phát được: ${msg}`.slice(0, 500);
}

function playerOf(client) {
  try {
    return useMainPlayer();
  } catch {
    return client?.player || null;
  }
}

module.exports = { requireVoice, getQueue, currentOf, upcomingOf, trackTitle, friendlyPlayError, playerOf };
