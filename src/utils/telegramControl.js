'use strict';

// ============================================================
// Bot Telegram điều khiển Bot-RAPTOR từ xa — CHỈ chủ bot dùng.
//   TELEGRAM_BOT_TOKEN : token từ @BotFather (thiếu -> module tự tắt, bot Discord chạy bình thường)
//   TELEGRAM_OWNER_ID  : ID Telegram của chủ bot (thiếu -> chế độ ghép nối:
//                        /start sẽ trả lại ID của người nhắn để dán vào env)
// Không thêm thư viện nào — gọi thẳng Telegram Bot API bằng fetch + long polling.
// Lệnh: /status /online /toggle /say + menu nút bấm (inline keyboard).
// ============================================================

const fs = require('node:fs');
const path = require('node:path');
const gs = require('./guildSettings');
const config = require('../config');

// Nhịp tim ghi xuống đĩa mỗi phút: lần boot sau đọc lại sẽ biết bot đã
// gián đoạn bao lâu (để báo "vừa quay lại sau ~X" thay vì tin online thường).
const STATE_FILE = path.join(__dirname, '..', '..', 'data', 'telegram-state.json');
function readLastBeat() {
  try {
    const j = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return Number(j?.lastBeat) || 0;
  } catch { return 0; }
}
function writeBeat() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify({ lastBeat: Date.now() }));
  } catch {}
}

const TOGGLES = [
  { key: 'leveling', label: 'Leveling — XP khi chat' },
  { key: 'voicexp', label: 'XP thoại — khi ở kênh voice' },
  { key: 'aichat', label: 'AI Chat' },
  { key: 'starboard', label: 'Starboard — tin nổi bật' },
  { key: 'antiraid', label: 'Anti-raid — chặn acc mới vào ồ ạt' },
];

function toggleState(key, st) {
  if (!st) return false;
  if (key === 'leveling') return st.levelEnabled !== false;
  if (key === 'voicexp') return st.voiceXpEnabled !== false;
  if (key === 'aichat') return !!st.aiChatCfg?.enabled;
  if (key === 'starboard') return !!st.starboard?.enabled;
  if (key === 'antiraid') return !!st.antiraid?.enabled;
  return false;
}

// Patch đúng ngữ nghĩa như dashboard /overview/toggles và lệnh /ai.
function togglePatch(key, st, v) {
  if (key === 'leveling') return { levelEnabled: v };
  if (key === 'voicexp') return { voiceXpEnabled: v };
  if (key === 'aichat') return { aiChatCfg: { ...(st.aiChatCfg || {}), enabled: v } };
  if (key === 'starboard') return { starboard: { ...(st.starboard || {}), enabled: v } };
  if (key === 'antiraid') return { antiraid: { ...(st.antiraid || {}), enabled: v } };
  return null;
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isOwner(fromId, ownerId) {
  return !!ownerId && String(fromId) === String(ownerId);
}

// Tách "/say@BotName nội dung" -> { cmd:'say', args:'nội dung' }
function parseCommand(text) {
  const m = /^\s*\/([a-zA-Z0-9_]+)(?:@\S+)?(?:\s+([\s\S]*))?$/.exec(String(text || ''));
  if (!m) return null;
  return { cmd: m[1].toLowerCase(), args: (m[2] || '').trim() };
}

function mainGuild(client) {
  const guilds = [...(client?.guilds?.cache?.values() || [])];
  if (!guilds.length) return null;
  if (config.guildId) {
    const g = guilds.find((x) => x.id === config.guildId);
    if (g) return g;
  }
  return guilds.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))[0];
}

function fmtUptime(ms) {
  const s = Math.floor((ms || 0) / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return `${d} ngày ${h} giờ`;
  if (h) return `${h} giờ ${m} phút`;
  return `${m} phút`;
}

let running = false;
let offset = 0;
const pendingSay = new Map(); // chatId -> { channelId, at }

async function tg(token, method, body, timeoutMs = 65000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body || {}),
      signal: ctl.signal,
    });
    const j = await r.json().catch(() => null);
    if (!j?.ok) throw new Error(`Telegram ${method}: ${j?.description || r.status}`);
    return j.result;
  } finally {
    clearTimeout(t);
  }
}

function menuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📊 Trạng thái', callback_data: 'm:status' }, { text: '👥 Ai online', callback_data: 'm:online' }],
      [{ text: '🎛 Bật / tắt module', callback_data: 'm:toggles' }, { text: '✉️ Nhắn vào Discord', callback_data: 'm:say' }],
    ],
  };
}

async function statusText(client) {
  const g = mainGuild(client);
  const mem = Math.round(process.memoryUsage().rss / 1048576);
  let lines = [
    `🤖 <b>${esc(client.user?.tag || 'RAPTOR')}</b> — đang online`,
    `⏱ Uptime: ${fmtUptime(client.uptime)} · Ping: ${Math.round(client.ws?.ping || 0)} ms · RAM: ${mem} MB`,
    `🌐 Đang phục vụ: ${client.guilds.cache.size} server`,
  ];
  if (g) {
    const members = [...(g.members?.cache?.values() || [])];
    const humans = members.filter((m) => !m.user?.bot);
    const online = humans.filter((m) => (m.presence?.status || 'offline') !== 'offline').length;
    const voice = members.filter((m) => m.voice?.channelId).length;
    lines.push(`🏠 Server chính: <b>${esc(g.name)}</b> — ${g.memberCount} thành viên · ${online} đang online · ${voice} trong voice`);
  }
  return lines.join('\n');
}

async function onlineText(client) {
  const g = mainGuild(client);
  if (!g) return 'Bot chưa vào server nào.';
  const members = [...(g.members?.cache?.values() || [])];
  const humans = members.filter((m) => !m.user?.bot);
  const online = humans.filter((m) => (m.presence?.status || 'offline') !== 'offline');
  const label = { online: '🟢', idle: '🌙', dnd: '⛔' };
  const lines = [`👥 <b>${esc(g.name)}</b> — ${online.length} người đang online:`];
  if (online.length) {
    lines.push(online.slice(0, 40).map((m) => `${label[m.presence?.status] || '🟢'} ${esc(m.displayName || m.user?.username)}`).join('\n'));
    if (online.length > 40) lines.push(`… và ${online.length - 40} người nữa`);
  }
  const inVoice = members.filter((m) => m.voice?.channelId);
  if (inVoice.length) {
    lines.push(`\n🔊 Đang trong voice (${inVoice.length}):`);
    lines.push(inVoice.slice(0, 40).map((m) => {
      const ch = g.channels?.cache?.get(m.voice.channelId);
      return `• ${esc(m.displayName || m.user?.username)} — #${esc(ch?.name || 'voice')}`;
    }).join('\n'));
  }
  return lines.join('\n').slice(0, 4000);
}

async function togglesView(client) {
  const g = mainGuild(client);
  if (!g) return { text: 'Bot chưa vào server nào.', keyboard: null };
  const st = await gs.getGuildSettings(g.id);
  const rows = TOGGLES.map((t) => [{
    text: `${toggleState(t.key, st) ? '✅' : '❌'} ${t.label}`,
    callback_data: `t:${t.key}`,
  }]);
  rows.push([{ text: '⬅️ Menu chính', callback_data: 'm:menu' }]);
  return {
    text: `🎛 <b>Bật / tắt module</b> — server <b>${esc(g.name)}</b>\nBấm vào module để đảo trạng thái (áp dụng ngay cho bot):`,
    keyboard: { inline_keyboard: rows },
  };
}

async function sayChannelsView(client) {
  const g = mainGuild(client);
  if (!g) return { text: 'Bot chưa vào server nào.', keyboard: null };
  const me = g.members?.me;
  const chans = [...(g.channels?.cache?.values() || [])]
    .filter((c) => c.type === 0 || c.type === 5)
    .filter((c) => {
      try { return !me || c.permissionsFor(me)?.has('SendMessages'); } catch { return true; }
    })
    .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0))
    .slice(0, 15);
  if (!chans.length) return { text: 'Không thấy kênh chữ nào bot gửi được.', keyboard: null };
  const rows = chans.map((c) => [{ text: `# ${c.name}`, callback_data: `s:${c.id}` }]);
  rows.push([{ text: '⬅️ Menu chính', callback_data: 'm:menu' }]);
  return { text: `✉️ Chọn kênh Discord trong <b>${esc(g.name)}</b> để nhắn tới:`, keyboard: { inline_keyboard: rows } };
}

async function start(client) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const ownerId = (process.env.TELEGRAM_OWNER_ID || '').trim();
  if (!token) {
    console.log('[telegram] TELEGRAM_BOT_TOKEN chưa đặt — bot điều khiển Telegram tắt.');
    return false;
  }
  if (running) return true;
  running = true;

  const send = (chatId, text, keyboard) => tg(token, 'sendMessage', {
    chat_id: chatId, text: String(text).slice(0, 4000), parse_mode: 'HTML',
    ...(keyboard ? { reply_markup: keyboard } : {}),
  }).catch((e) => console.warn('[telegram] sendMessage:', e.message));

  const handleMessage = async (msg) => {
    const chatId = msg.chat?.id;
    const fromId = msg.from?.id;
    const text = msg.text || '';
    if (!chatId || !fromId) return;

    // Chế độ ghép nối: chưa có OWNER_ID -> /start trả lại ID để chủ bot dán vào env.
    if (!ownerId) {
      if (parseCommand(text)?.cmd === 'start') {
        console.log(`[telegram] Ghép nối: Telegram ID ${fromId} (${msg.from?.username || '?'})`);
        await send(chatId, `👋 ID Telegram của bạn là: <code>${fromId}</code>\nDán ID này vào biến <code>TELEGRAM_OWNER_ID</code> trong Botkeep Environment rồi restart bot — xong là điều khiển được.`);
      }
      return;
    }
    if (!isOwner(fromId, ownerId)) return; // người lạ: im lặng tuyệt đối

    const parsed = parseCommand(text);

    // Đang chờ nội dung cho /say
    const pend = pendingSay.get(chatId);
    if (pend && !parsed) {
      if (Date.now() - pend.at > 5 * 60 * 1000) { pendingSay.delete(chatId); }
      else {
        pendingSay.delete(chatId);
        try {
          const g = mainGuild(client);
          const ch = g?.channels?.cache?.get(pend.channelId);
          if (!ch) { await send(chatId, '⚠️ Không tìm thấy kênh đó nữa.'); return; }
          await ch.send(text.slice(0, 2000));
          await send(chatId, `✅ Đã gửi vào #${esc(ch.name)}`);
        } catch (e) {
          await send(chatId, `⚠️ Gửi không được: ${esc(e.message)}`);
        }
        return;
      }
    }

    if (!parsed) return;
    const { cmd } = parsed;
    if (cmd === 'start' || cmd === 'menu') {
      await send(chatId, '🦖 <b>RAPTOR — điều khiển từ xa</b>\nChọn việc cần làm:', menuKeyboard());
    } else if (cmd === 'status') {
      await send(chatId, await statusText(client));
    } else if (cmd === 'online') {
      await send(chatId, await onlineText(client));
    } else if (cmd === 'toggle') {
      const v = await togglesView(client);
      await send(chatId, v.text, v.keyboard || undefined);
    } else if (cmd === 'say') {
      const v = await sayChannelsView(client);
      await send(chatId, v.text, v.keyboard || undefined);
    } else if (cmd === 'cancel') {
      pendingSay.delete(chatId);
      await send(chatId, 'Đã hủy.');
    }
  };

  const handleCallback = async (cq) => {
    const chatId = cq.message?.chat?.id;
    const msgId = cq.message?.message_id;
    const data = String(cq.data || '');
    if (!isOwner(cq.from?.id, ownerId)) {
      await tg(token, 'answerCallbackQuery', { callback_query_id: cq.id }).catch(() => {});
      return;
    }
    await tg(token, 'answerCallbackQuery', { callback_query_id: cq.id }).catch(() => {});
    if (!chatId) return;
    const edit = async (text, keyboard) => {
      if (!msgId) { await send(chatId, text, keyboard); return; }
      await tg(token, 'editMessageText', {
        chat_id: chatId, message_id: msgId, text: String(text).slice(0, 4000), parse_mode: 'HTML',
        ...(keyboard ? { reply_markup: keyboard } : {}),
      }).catch(() => send(chatId, text, keyboard));
    };

    if (data === 'm:menu') {
      await edit('🦖 <b>RAPTOR — điều khiển từ xa</b>\nChọn việc cần làm:', menuKeyboard());
    } else if (data === 'm:status') {
      await edit(await statusText(client), menuKeyboard());
    } else if (data === 'm:online') {
      await edit(await onlineText(client), menuKeyboard());
    } else if (data === 'm:toggles') {
      const v = await togglesView(client);
      await edit(v.text, v.keyboard || menuKeyboard());
    } else if (data === 'm:say') {
      const v = await sayChannelsView(client);
      await edit(v.text, v.keyboard || menuKeyboard());
    } else if (data.startsWith('t:')) {
      const key = data.slice(2);
      const g = mainGuild(client);
      if (!g || !TOGGLES.some((t) => t.key === key)) return;
      const st = await gs.getGuildSettings(g.id);
      const next = !toggleState(key, st);
      const patch = togglePatch(key, st, next);
      if (patch) await gs.saveGuildSettings(g.id, patch);
      const v = await togglesView(client);
      await edit(v.text, v.keyboard || menuKeyboard());
    } else if (data.startsWith('s:')) {
      const channelId = data.slice(2);
      const g = mainGuild(client);
      const ch = g?.channels?.cache?.get(channelId);
      if (!ch) { await edit('⚠️ Không tìm thấy kênh đó nữa.', menuKeyboard()); return; }
      pendingSay.set(chatId, { channelId, at: Date.now() });
      await edit(`✉️ Gõ nội dung muốn gửi vào #<b>${esc(ch.name)}</b> (tin nhắn tiếp theo của bạn sẽ được gửi đi, /cancel để hủy):`);
    }
  };

  // Vòng long polling — lỗi mạng thì nghỉ 5s thử lại, không bao giờ làm sập bot.
  (async () => {
    const lastBeat = readLastBeat();
    const gapMs = Date.now() - lastBeat;
    writeBeat();
    const beatTimer = setInterval(writeBeat, 60 * 1000);
    beatTimer.unref?.();
    try {
      const me = await tg(token, 'getMe', {}, 15000);
      console.log(`[telegram] Bot điều khiển @${me.username} đã bật${ownerId ? '' : ' (chế độ ghép nối — chưa có TELEGRAM_OWNER_ID)'}.`);
      if (ownerId) {
        if (lastBeat && gapMs > 30 * 60 * 1000) {
          const gap = gapMs >= 3600000 ? `~${Math.round(gapMs / 360000) / 10} giờ` : `~${Math.round(gapMs / 60000)} phút`;
          await send(ownerId, `🔴 <b>RAPTOR vừa quay lại</b> — lần hoạt động cuối cách đây ${gap}. Bot đã online trở lại, gõ /menu để kiểm tra.`);
        } else {
          await send(ownerId, '🟢 RAPTOR đã online — gõ /menu để điều khiển.');
        }
      }
    } catch (e) {
      console.warn('[telegram] Không kết nối được Telegram:', e.message);
    }
    while (running) {
      try {
        const updates = await tg(token, 'getUpdates', {
          offset, timeout: 50, allowed_updates: ['message', 'callback_query'],
        });
        for (const u of updates || []) {
          offset = Math.max(offset, u.update_id + 1);
          try {
            if (u.message) await handleMessage(u.message);
            else if (u.callback_query) await handleCallback(u.callback_query);
          } catch (e) {
            console.warn('[telegram] lỗi xử lý update:', e.message);
          }
        }
      } catch (e) {
        if (running) await new Promise((r) => setTimeout(r, 5000));
      }
    }
  })();

  return true;
}

function stop() { running = false; }

// Gửi thông báo 1 chiều tới chủ bot (dùng cho các giai đoạn sau).
async function notify(text) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const ownerId = (process.env.TELEGRAM_OWNER_ID || '').trim();
  if (!token || !ownerId) return false;
  try {
    await tg(token, 'sendMessage', { chat_id: ownerId, text: String(text).slice(0, 4000), parse_mode: 'HTML' });
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  start, stop, notify, esc,
  _test: { isOwner, parseCommand, toggleState, togglePatch, fmtUptime, TOGGLES, readLastBeat },
};
