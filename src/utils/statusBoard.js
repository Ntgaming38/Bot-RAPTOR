// Bảng trạng thái server kiểu SDVN: MỘT tin nhắn embed trong kênh text, bot tự
// sửa nội dung theo chu kỳ (tổng thành viên / online / offline / bot / voice).
// Khác kênh counter /stats (đổi tên kênh voice): bảng này là message thường,
// cấu hình lưu chung trong StatsSettings (boardChannelId/boardMessageId/
// boardIntervalSec). Đếm online cần Presence Intent — index.js đã khai báo
// GuildPresences và bot đăng nhập được ở production nên portal đã bật.
const { embed } = require('./embeds');
const { getStats, saveStats } = require('./statsSettings');

const MIN_INTERVAL_SEC = 30;
const MAX_INTERVAL_SEC = 3600;
const DEFAULT_INTERVAL_SEC = 60;
const TICK_MS = 20_000; // nhịp quét vòng lặp; mỗi guild có hạn cập nhật riêng

function clampInterval(sec) {
  const n = Math.round(Number(sec) || DEFAULT_INTERVAL_SEC);
  return Math.min(MAX_INTERVAL_SEC, Math.max(MIN_INTERVAL_SEC, n));
}

function intervalText(sec) {
  if (sec < 60) return `${sec} giây`;
  if (sec % 60 === 0) return `${sec / 60} phút`;
  return `${sec} giây`;
}

// Thanh tiến trình kiểu ■□ như ảnh mẫu (12 ô).
function bar(value, max, width = 12) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const filled = Math.round(ratio * width);
  return '■'.repeat(filled) + '□'.repeat(width - filled);
}

// Đếm số liệu từ danh sách thành viên đầy đủ (presence chỉ đúng khi có intent).
async function countStats(guild) {
  const total = guild.memberCount ?? 0;
  let members = null;
  try {
    members = await guild.members.fetch();
  } catch (e) {
    console.warn('[statusboard] fetch members lỗi:', e?.message);
    members = guild.members.cache;
  }
  const arr = [...members.values()];
  const bots = arr.filter((m) => m.user.bot).length;
  const humansArr = arr.filter((m) => !m.user.bot);
  const humans = humansArr.length;
  const statusOf = (m) => m.presence?.status || 'offline';
  const online = humansArr.filter((m) => statusOf(m) === 'online').length;
  const idle = humansArr.filter((m) => statusOf(m) === 'idle').length;
  const dnd = humansArr.filter((m) => statusOf(m) === 'dnd').length;
  const active = online + idle + dnd; // invisible bị Discord báo là offline
  const offline = Math.max(0, humans - active);
  const voice = guild.voiceStates?.cache?.size ?? 0;
  return { total, humans, bots, online, idle, dnd, active, offline, voice };
}

function buildBoardEmbed(guild, c, intervalSec) {
  const desc = [
    `👥 **${c.total} thành viên trong server**`,
    '',
    `🟢 **Đang online · ${c.active} / ${c.humans}**`,
    bar(c.active, c.humans),
    `Online ${c.online} · Treo máy ${c.idle} · Bận ${c.dnd}`,
    '',
    `⚪ **Đang offline · ${c.offline}**`,
    bar(c.offline, c.humans),
    '',
    `🤖 **Bot · ${c.bots}**`,
    `🎙️ **Đang trong voice · ${c.voice}**`,
    '',
    `Cập nhật <t:${Math.floor(Date.now() / 1000)}:R> · tự động mỗi ${intervalText(intervalSec)}`,
  ].join('\n');
  return embed({
    title: `📊 Trạng thái server ${guild.name}`,
    description: desc,
    thumbnail: guild.iconURL?.() || null,
    footer: '🟢 Online · ⚪ Offline · 🤖 Bot · 🎙️ Voice',
  });
}

// Sửa tin bảng hiện có; tin bị xóa thì đăng lại và lưu id mới. Trả về messageId.
async function updateBoard(client, guildId) {
  const s = await getStats(guildId);
  if (!s.boardChannelId) return null;
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return null;
  const channel = await guild.channels.fetch(s.boardChannelId).catch(() => null);
  if (!channel?.isTextBased()) return null;
  const counts = await countStats(guild);
  const boardEmbed = buildBoardEmbed(guild, counts, clampInterval(s.boardIntervalSec));
  if (s.boardMessageId) {
    const msg = await channel.messages.fetch(s.boardMessageId).catch(() => null);
    if (msg) {
      await msg.edit({ embeds: [boardEmbed] });
      return msg.id;
    }
  }
  const sent = await channel.send({ embeds: [boardEmbed] });
  await saveStats(guildId, { boardMessageId: sent.id });
  return sent.id;
}

// Bật bảng trong kênh chỉ định: lưu cấu hình rồi đăng tin đầu tiên.
async function startBoard(client, guildId, channelId, intervalSec) {
  const sec = clampInterval(intervalSec);
  await saveStats(guildId, { boardChannelId: channelId, boardMessageId: null, boardIntervalSec: sec });
  const id = await updateBoard(client, guildId);
  if (!id) throw new Error('post-failed');
  return { messageId: id, intervalSec: sec };
}

// Tắt bảng: xóa tin (nếu còn) và dọn cấu hình.
async function stopBoard(client, guildId) {
  const s = await getStats(guildId);
  if (s.boardChannelId && s.boardMessageId) {
    try {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      const channel = guild ? await guild.channels.fetch(s.boardChannelId).catch(() => null) : null;
      const msg = channel ? await channel.messages.fetch(s.boardMessageId).catch(() => null) : null;
      if (msg) await msg.delete().catch(() => {});
    } catch {}
  }
  await saveStats(guildId, { boardChannelId: null, boardMessageId: null });
}

// ===== Vòng lặp tự cập nhật =====
const nextDue = new Map(); // guildId -> epoch ms lần cập nhật kế tiếp
let loopStarted = false;

async function boardTick(client) {
  const { listBoardGuilds } = require('./statsSettings');
  const guildIds = await listBoardGuilds().catch(() => []);
  const alive = new Set(guildIds);
  for (const gid of [...nextDue.keys()]) if (!alive.has(gid)) nextDue.delete(gid);
  for (const gid of guildIds) {
    const now = Date.now();
    if (!nextDue.has(gid)) {
      // Lần đầu gặp guild: hẹn sau 45s để bot ổn định sau boot/restart
      nextDue.set(gid, now + 45_000);
      continue;
    }
    if (now < nextDue.get(gid)) continue;
    const s = await getStats(gid).catch(() => null);
    const sec = clampInterval(s?.boardIntervalSec);
    nextDue.set(gid, now + sec * 1000);
    try {
      await updateBoard(client, gid);
    } catch (e) {
      // 429 rate-limit: lùi thêm theo retryAfter nếu Discord trả về
      const retryMs = Number(e?.retryAfter) ? Number(e.retryAfter) * 1000 : 0;
      if (retryMs) nextDue.set(gid, Date.now() + Math.max(retryMs, sec * 1000));
      console.warn(`[statusboard] cập nhật guild ${gid} lỗi:`, e?.message || e);
    }
  }
}

function startStatusBoardLoop(client) {
  if (loopStarted) return;
  loopStarted = true;
  const t = setInterval(() => { boardTick(client).catch(() => {}); }, TICK_MS);
  if (t.unref) t.unref();
  console.log('📊 Đã bật vòng lặp bảng trạng thái server (quét mỗi 20 giây)');
}

module.exports = {
  countStats, buildBoardEmbed, bar, clampInterval, intervalText,
  updateBoard, startBoard, stopBoard, startStatusBoardLoop,
  MIN_INTERVAL_SEC, MAX_INTERVAL_SEC, DEFAULT_INTERVAL_SEC,
};
