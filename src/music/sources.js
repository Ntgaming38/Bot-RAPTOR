// Kiến trúc adapter cho nguồn nhạc.
//
// Mỗi adapter: { id, label, match(query) -> bool, resolve(query) -> { searchEngine, query, note } }
// Muốn thay nguồn phát sau này (VD: YouTube hỏng → Lavalink/Cobalt):
//   1. thêm adapter mới vào ADAPTERS (đặt TRƯỚC adapter mặc định),
//   2. hoặc tắt YouTube bằng YOUTUBE_ENABLED=false trong .env.
// Không cần sửa bất kỳ lệnh nhạc nào.

const { QueryType } = require('discord-player');
const config = require('../config');

const FILE_RE = /^https?:\/\/\S+\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm|mp4)(\?\S*)?$/i;
const SC_RE = /(soundcloud\.com|snd\.sc)/i;
const YT_RE = /(youtube\.com|youtu\.be|music\.youtube\.com)/i;
const URL_RE = /^https?:\/\//i;

function ytDisabledError() {
  const e = new Error(
    'Nguồn YouTube đang tắt trên bot này (YOUTUBE_ENABLED=false). Hãy dùng link SoundCloud hoặc link mp3 trực tiếp.'
  );
  e.code = 'YOUTUBE_DISABLED';
  return e;
}

const ADAPTERS = [
  {
    id: 'file',
    label: 'Link nhạc trực tiếp',
    match: (q) => FILE_RE.test(q.trim()),
    resolve: (q) => ({ searchEngine: QueryType.FILE, query: q.trim(), note: null }),
  },
  {
    id: 'soundcloud',
    label: 'SoundCloud',
    // Link soundcloud, hoặc gõ "sc <tên bài>" để tìm trên SoundCloud
    match: (q) => SC_RE.test(q) || /^sc\s+/i.test(q),
    resolve: (q) => {
      const query = q.replace(/^sc\s+/i, '').trim();
      return {
        searchEngine: SC_RE.test(query) ? QueryType.SOUNDCLOUD : QueryType.SOUNDCLOUD_SEARCH,
        query,
        note: null,
      };
    },
  },
  {
    id: 'youtube',
    label: 'YouTube',
    match: (q) => YT_RE.test(q),
    resolve: (q) => {
      if (!config.youtubeEnabled) throw ytDisabledError();
      return { searchEngine: QueryType.YOUTUBE, query: q.trim(), note: null };
    },
  },
  {
    id: 'search',
    label: 'Tìm kiếm',
    match: () => true, // adapter mặc định: chữ thường = tìm kiếm
    resolve: (q) => {
      const query = q.trim();
      if (config.youtubeEnabled) {
        return { searchEngine: QueryType.YOUTUBE_SEARCH, query, note: null };
      }
      // YouTube tắt → tìm trên SoundCloud thay thế
      return {
        searchEngine: QueryType.SOUNDCLOUD_SEARCH,
        query,
        note: 'YouTube đang tắt nên bot tìm trên SoundCloud thay thế.',
      };
    },
  },
];

function pickAdapter(query) {
  const q = String(query || '');
  return ADAPTERS.find((a) => {
    try {
      return a.match(q);
    } catch {
      return false;
    }
  }) || ADAPTERS[ADAPTERS.length - 1];
}

// Chuẩn hóa input của /play thành { adapter, searchEngine, query, note }
function resolvePlayable(query) {
  const adapter = pickAdapter(query);
  const out = adapter.resolve(query);
  return { adapter: adapter.id, label: adapter.label, ...out };
}

function describeSources() {
  return ADAPTERS.map((a) => `• **${a.label}** (\`${a.id}\`)`).join('\n');
}

module.exports = { ADAPTERS, resolvePlayable, describeSources, FILE_RE, URL_RE };
