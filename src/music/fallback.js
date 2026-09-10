// Đường dự phòng khi extractor chính trả về 0 kết quả (VD: SoundCloud đổi API).
// Dùng yt-dlp (youtube-dl-exec, đã có sẵn, không cần node-gyp) lấy link audio trực tiếp
// rồi để discord-player phát như link mp3 thường.

const ytdl = require('youtube-dl-exec');

const TIMEOUT_MS = 25000;

function pickAudioUrl(info) {
  if (info?.url) return info.url;
  const fmts = info?.formats || info?.requested_formats || [];
  const audio = fmts.filter((f) => f?.url && f.acodec && f.acodec !== 'none');
  if (!audio.length) return null;
  // Ưu tiên progressive (mp3 thường) hơn HLS cho ổn định
  const prog = audio.find((f) => f.url && !/\.m3u8(\?|$)/i.test(f.url) && /\.(mp3|m4a|aac|ogg|opus|wav)(\?|$)/i.test(f.url));
  return (prog || audio[audio.length - 1]).url;
}

async function resolveDirectUrl(query) {
  const job = (async () => {
    const info = await ytdl(String(query).trim(), {
      dumpSingleJson: true,
      noWarnings: true,
      noPlaylist: true,
    });
    const url = pickAudioUrl(info);
    if (!url) throw new Error('No results');
    return {
      url,
      title: info.title || null,
      author: info.artist || info.uploader || null,
      duration: info.duration_string || (info.duration ? `${Math.floor(info.duration / 60)}:${String(Math.floor(info.duration % 60)).padStart(2, '0')}` : null),
      thumbnail: info.thumbnail || null,
    };
  })();
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('fallback timeout')), TIMEOUT_MS));
  return Promise.race([job, timeout]);
}

module.exports = { resolveDirectUrl };
