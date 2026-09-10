const session = require('express-session');
const config = require('../config');
const views = require('./views');

const API = 'https://discord.com/api/v10';
const MANAGE_GUILD = 0x20n;

let client = null;
function setClient(c) { client = c; }

function redirectUri(req) {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0];
  return `${proto}://${req.get('host')}/dashboard/callback`;
}

async function tokenExchange(code, req) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(req),
  });
  const r = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) throw new Error('OAuth token failed: ' + r.status);
  return r.json();
}

async function apiGet(token, path) {
  const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401) throw new Error('unauthorized');
  if (!r.ok) throw new Error('Discord API ' + r.status);
  return r.json();
}

function canManage(g) {
  try {
    return (BigInt(g.permissions) & MANAGE_GUILD) === MANAGE_GUILD;
  } catch { return false; }
}

async function botInGuild(gid) {
  if (!client) return false;
  if (client.guilds.cache.has(gid)) return true;
  return !!(await client.guilds.fetch(gid).catch(() => null));
}

// Chặn: đã login + là admin server + bot đang trong server đó
async function guard(req, res, next) {
  const u = req.session?.user;
  if (!u) return res.status(401).json({ error: 'login' });
  const g = (u.guilds || []).find((x) => x.id === req.params.gid);
  if (!g || !canManage(g)) return res.status(403).json({ error: 'forbidden' });
  if (!(await botInGuild(req.params.gid))) return res.status(404).json({ error: 'bot-not-in-guild' });
  req.guildMeta = g;
  next();
}

function mount(app) {
  if (!process.env.SESSION_SECRET) {
    console.warn('[dashboard] chưa có SESSION_SECRET — login sẽ mất khi restart. Thêm SESSION_SECRET vào env.');
  }
  app.set('trust proxy', 1);
  app.use(session({
    secret: process.env.SESSION_SECRET || ('dev-' + Math.random().toString(36).slice(2)),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto', maxAge: 7 * 24 * 3600 * 1000 },
  }));
  app.use(require('express').json({ limit: '256kb' }));

  // --- Auth ---
  app.get('/dashboard/login', (req, res) => {
    if (!config.clientSecret) {
      return res.status(500).send('Thiếu DISCORD_CLIENT_SECRET trong env. Lấy ở Discord Developer Portal → General Information → Client Secret.');
    }
    const url = 'https://discord.com/oauth2/authorize?client_id=' + config.clientId
      + '&response_type=code&redirect_uri=' + encodeURIComponent(redirectUri(req))
      + '&scope=' + encodeURIComponent('identify guilds');
    res.redirect(url);
  });

  app.get('/dashboard/callback', async (req, res) => {
    try {
      if (!req.query.code) return res.redirect('/dashboard');
      const tok = await tokenExchange(req.query.code, req);
      const [me, guilds] = await Promise.all([
        apiGet(tok.access_token, '/users/@me'),
        apiGet(tok.access_token, '/users/@me/guilds'),
      ]);
      req.session.user = {
        id: me.id,
        username: me.username,
        avatar: me.avatar,
        guilds: guilds.filter(canManage).map((g) => ({ id: g.id, name: g.name, icon: g.icon, permissions: String(g.permissions) })),
      };
      res.redirect('/dashboard');
    } catch (e) {
      console.error('[dashboard] login lỗi:', e?.message);
      res.status(500).send('Đăng nhập thất bại. Kiểm tra CLIENT_SECRET và Redirect URL đã thêm trong Discord Portal chưa.');
    }
  });

  app.get('/dashboard/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/dashboard'));
  });

  // --- API ---
  app.get('/dashboard/api/me', async (req, res) => {
    const u = req.session?.user;
    if (!u) return res.status(401).json({ error: 'login' });
    const guilds = [];
    for (const g of u.guilds) guilds.push({ ...g, bot: await botInGuild(g.id) });
    res.json({ user: { id: u.id, username: u.username, avatar: u.avatar }, guilds });
  });

  app.get('/dashboard/api/guilds/:gid/meta', guard, async (req, res) => {
    const guild = await client.guilds.fetch(req.params.gid).catch(() => null);
    if (!guild) return res.status(404).json({ error: 'bot-not-in-guild' });
    const channels = await guild.channels.fetch().catch(() => guild.channels.cache);
    const list = [];
    const cats = [];
    const voice = [];
    for (const ch of channels.values()) {
      if (!ch) continue;
      if (ch.type === 0 || ch.type === 5) list.push({ id: ch.id, name: ch.name, type: ch.type });
      else if (ch.type === 4) cats.push({ id: ch.id, name: ch.name });
      else if (ch.type === 2) voice.push({ id: ch.id, name: ch.name });
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    cats.sort((a, b) => a.name.localeCompare(b.name));
    voice.sort((a, b) => a.name.localeCompare(b.name));
    const roles = (await guild.roles.fetch().catch(() => null)) || guild.roles.cache;
    const roleList = [];
    for (const r of roles.values()) {
      if (!r || r.id === guild.id) continue; // bỏ @everyone
      roleList.push({ id: r.id, name: r.name });
    }
    res.json({ guild: { id: guild.id, name: guild.name }, channels: list, categories: cats, voice, roles: roleList });
  });

  // Cài đặt chung theo server: Level/XP, kiểm duyệt, log, ticket
  app.get('/dashboard/api/guilds/:gid/settings', guard, async (req, res) => {
    const s = await require('../utils/guildSettings').getGuildSettings(req.params.gid);
    res.json({ ...s, bannedWords: (s.bannedWords || []).join(', ') });
  });

  app.put('/dashboard/api/guilds/:gid/settings', guard, async (req, res) => {
    const b = req.body || {};
    const patch = {};
    const num = (v, min, max) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined;
    };
    const idOrNull = (v) => (v === undefined ? undefined : (String(v || '') || null));
    const xmin = num(b.xpMin, 1, 100);
    const xmax = num(b.xpMax, 1, 100);
    if (xmin !== undefined) patch.xpMin = xmin;
    if (xmax !== undefined) patch.xpMax = xmax;
    if (patch.xpMin !== undefined && patch.xpMax !== undefined && patch.xpMin > patch.xpMax) {
      return res.status(400).json({ error: 'xp-min-max' });
    }
    const cd = num(b.xpCooldownSec, 0, 3600);
    if (cd !== undefined) patch.xpCooldownSec = cd;
    if (b.levelUpMessage !== undefined) patch.levelUpMessage = !!b.levelUpMessage;
    if (b.bannedWords !== undefined) {
      patch.bannedWords = String(b.bannedWords || '').split(/[,\\n]/).map((w) => w.trim().toLowerCase()).filter(Boolean);
    }
    for (const k of ['logChannelId', 'ticketCategoryId', 'ticketStaffRoleId']) patch[k] = idOrNull(b[k]);
    if (b.ticketPanelImageUrl !== undefined) patch.ticketPanelImageUrl = String(b.ticketPanelImageUrl || '') || null;
    if (b.giveawayChannelId !== undefined) patch.giveawayChannelId = String(b.giveawayChannelId || '') || null;
    if (b.giveawayWinners !== undefined) {
      const n = parseInt(b.giveawayWinners, 10);
      if (Number.isFinite(n)) patch.giveawayWinners = Math.min(20, Math.max(1, n));
    }
    if (b.giveawayDuration !== undefined) patch.giveawayDuration = String(b.giveawayDuration || '').slice(0, 20) || null;
    // Bỏ key undefined (giữ giá trị cũ)
    for (const k of Object.keys(patch)) if (patch[k] === undefined) delete patch[k];
    const s = await require('../utils/guildSettings').saveGuildSettings(req.params.gid, patch);
    res.json({ ok: true, settings: s });
  });

  app.get('/dashboard/api/guilds/:gid/welcome', guard, async (req, res) => {
    const s = await require('../utils/welcomeSettings').getWelcomeSettings(req.params.gid);
    res.json(s);
  });

  app.put('/dashboard/api/guilds/:gid/welcome', guard, async (req, res) => {
    const b = req.body || {};
    const patch = {};
    for (const k of ['channelId', 'title', 'roleChannelId', 'rulesChannelId', 'announceChannelId', 'chatChannelId', 'imageUrl', 'color', 'autoRoleId']) {
      if (b[k] !== undefined) patch[k] = String(b[k] || '') || null;
    }
    if (b.bannerUrl !== undefined) patch.bannerUrl = String(b.bannerUrl || '') || null;
    if (b.bannerRainbow !== undefined) patch.bannerRainbow = !!b.bannerRainbow;
    if (b.color !== undefined) {
      patch.color = /^#[0-9a-fA-F]{6}$/.test(String(b.color || '')) ? b.color : null;
    }
    if (b.reactions !== undefined) {
      patch.reactions = String(b.reactions || '').split(',').map((e) => e.trim()).filter(Boolean).slice(0, 5);
    }
    const s = await require('../utils/welcomeSettings').saveWelcomeSettings(req.params.gid, patch);
    res.json({ ok: true, settings: s });
  });

  app.post('/dashboard/api/guilds/:gid/welcome/test', guard, async (req, res) => {
    const s = await require('../utils/welcomeSettings').getWelcomeSettings(req.params.gid);
    if (!s.channelId) return res.status(400).json({ error: 'no-channel' });
    const guild = await client.guilds.fetch(req.params.gid).catch(() => null);
    const ch = guild && (await guild.channels.fetch(s.channelId).catch(() => null));
    if (!ch?.isTextBased()) return res.status(400).json({ error: 'no-channel' });
    const member = await guild.members.fetch(req.session.user.id).catch(() => null);
    if (!member) return res.status(400).json({ error: 'not-member' });
    const { buildWelcome } = require('../utils/welcome');
    const { embed: em, files } = buildWelcome(member, s);
    const msg = await ch.send({ embeds: [em], files }).catch((e) => ({ error: e?.message }));
    if (msg?.error) return res.status(500).json({ error: msg.error });
    for (const e of (s.reactions || []).slice(0, 5)) await msg.react(e).catch(() => {});
    res.json({ ok: true, url: `https://discord.com/channels/${guild.id}/${ch.id}/${msg.id}` });
  });

  app.get('/dashboard/api/guilds/:gid/leaderboard', guard, async (req, res) => {
    const s = await require('../utils/leaderboardSettings').getLeaderboardSettings(req.params.gid);
    res.json(s);
  });

  app.put('/dashboard/api/guilds/:gid/leaderboard', guard, async (req, res) => {
    const b = req.body || {};
    const patch = {};
    if (b.channelId !== undefined) patch.channelId = String(b.channelId || '') || null;
    if (b.limit !== undefined) {
      const n = parseInt(b.limit, 10);
      if (Number.isFinite(n)) patch.limit = Math.min(25, Math.max(3, n));
    }
    const s = await require('../utils/leaderboardSettings').saveLeaderboardSettings(req.params.gid, patch);
    res.json({ ok: true, settings: s });
  });

  app.post('/dashboard/api/guilds/:gid/leaderboard/refresh', guard, async (req, res) => {
    const { updateLeaderboardChannel } = require('../utils/leaderboardSettings');
    const msg = await updateLeaderboardChannel(client, req.params.gid);
    if (!msg) return res.status(400).json({ error: 'no-channel' });
    res.json({ ok: true });
  });

  // Bảng thông báo (ticker)
  app.get('/dashboard/api/guilds/:gid/announce', guard, async (req, res) => {
    res.json(await require('../utils/announceSettings').getAnnounce(req.params.gid));
  });

  app.put('/dashboard/api/guilds/:gid/announce', guard, async (req, res) => {
    const b = req.body || {};
    const patch = {
      channelId: b.channelId !== undefined ? (String(b.channelId || '') || null) : undefined,
      title: b.title !== undefined ? (String(b.title || '') || null) : undefined,
      text: b.text !== undefined ? String(b.text || '').slice(0, 2000) : undefined,
    };
    if (b.intervalMin !== undefined) {
      const n = parseInt(b.intervalMin, 10);
      patch.intervalMin = Number.isFinite(n) ? Math.min(1440, Math.max(0, n)) : 0;
    }
    for (const k of Object.keys(patch)) if (patch[k] === undefined) delete patch[k];
    patch.lastRotated = Date.now();
    const s = await require('../utils/announceSettings').saveAnnounce(req.params.gid, patch);
    res.json({ ok: true, settings: s });
  });

  app.post('/dashboard/api/guilds/:gid/announce/test', guard, async (req, res) => {
    const { updateBoard } = require('../utils/announceSettings');
    const msg = await updateBoard(client, req.params.gid, 0);
    if (!msg) return res.status(400).json({ error: 'no-channel' });
    res.json({ ok: true, url: `https://discord.com/channels/${req.params.gid}/${msg.channelId}/${msg.id}` });
  });

  // Kênh trạng thái server
  app.get('/dashboard/api/guilds/:gid/stats', guard, async (req, res) => {
    res.json(await require('../utils/statsSettings').getStats(req.params.gid));
  });

  app.put('/dashboard/api/guilds/:gid/stats', guard, async (req, res) => {
    const b = req.body || {};
    const patch = {};
    if (b.voiceChannelId !== undefined) patch.voiceChannelId = String(b.voiceChannelId || '') || null;
    if (b.template !== undefined) patch.template = String(b.template || '').slice(0, 100) || null;
    if (b.multiNames !== undefined && b.multiNames && typeof b.multiNames === 'object') {
      const mn = {};
      for (const k of ['all', 'members', 'bots', 'channels', 'roles']) {
        if (b.multiNames[k] !== undefined) mn[k] = String(b.multiNames[k] || '').slice(0, 100) || null;
      }
      patch.multiNames = mn;
    }
    const s = await require('../utils/statsSettings').saveStats(req.params.gid, patch);
    res.json({ ok: true, settings: s });
  });

  app.post('/dashboard/api/guilds/:gid/stats/refresh', guard, async (req, res) => {
    const { updateStatsChannel } = require('../utils/statsSettings');
    const name = await updateStatsChannel(client, req.params.gid);
    if (!name) return res.status(400).json({ error: 'no-channel' });
    res.json({ ok: true, name });
  });

  app.post('/dashboard/api/guilds/:gid/stats/setup-multi', guard, async (req, res) => {
    try {
      const { setupMultiChannels } = require('../utils/statsSettings');
      const line = await setupMultiChannels(client, req.params.gid, (req.body || {}).categoryName);
      res.json({ ok: true, line });
    } catch (e) {
      res.status(400).json({ error: e?.message === 'no-perm' ? 'Bot cần quyền Manage Channels.' : (e?.message || 'failed') });
    }
  });

  // Bảng chọn role (button role)
  app.get('/dashboard/api/guilds/:gid/roles', guard, async (req, res) => {
    res.json(await require('../utils/rolePanels').getPanel(req.params.gid));
  });

  app.put('/dashboard/api/guilds/:gid/roles', guard, async (req, res) => {
    const b = req.body || {};
    const patch = {};
    if (b.channelId !== undefined) patch.channelId = String(b.channelId || '') || null;
    if (b.title !== undefined) patch.title = String(b.title || '').slice(0, 100) || null;
    if (b.description !== undefined) patch.description = String(b.description || '').slice(0, 1000) || null;
    if (b.items !== undefined) {
      if (!Array.isArray(b.items) || b.items.length > 25) return res.status(400).json({ error: 'items' });
      patch.items = b.items
        .filter((i) => i && i.roleId)
        .slice(0, 25)
        .map((i) => ({ roleId: String(i.roleId), label: String(i.label || '').slice(0, 80) || 'Role', emoji: String(i.emoji || '') || null }));
    }
    const s = await require('../utils/rolePanels').savePanel(req.params.gid, patch);
    res.json({ ok: true, settings: s });
  });

  app.post('/dashboard/api/guilds/:gid/roles/refresh', guard, async (req, res) => {
    const { renderPanel } = require('../utils/rolePanels');
    const msg = await renderPanel(client, req.params.gid);
    if (!msg) return res.status(400).json({ error: 'no-items' });
    res.json({ ok: true, url: `https://discord.com/channels/${req.params.gid}/${msg.channelId}/${msg.id}` });
  });

  // Tin nhắn tạm biệt
  app.get('/dashboard/api/guilds/:gid/goodbye', guard, async (req, res) => {
    res.json(await require('../utils/goodbyeSettings').getGoodbye(req.params.gid));
  });

  app.put('/dashboard/api/guilds/:gid/goodbye', guard, async (req, res) => {
    const b = req.body || {};
    const patch = {};
    if (b.channelId !== undefined) patch.channelId = String(b.channelId || '') || null;
    if (b.title !== undefined) patch.title = String(b.title || '').slice(0, 100) || null;
    if (b.text !== undefined) patch.text = String(b.text || '').slice(0, 2000) || null;
    if (b.imageUrl !== undefined) patch.imageUrl = String(b.imageUrl || '') || null;
    const s = await require('../utils/goodbyeSettings').saveGoodbye(req.params.gid, patch);
    res.json({ ok: true, settings: s });
  });

  // Log kiểu ProBot: kênh + bật/tắt từng loại
  const { LOG_TYPES } = require('../utils/logSettings');
  app.get('/dashboard/api/guilds/:gid/logs', guard, async (req, res) => {
    res.json({ types: LOG_TYPES, ...(await require('../utils/logSettings').getLogSettings(req.params.gid)) });
  });

  app.put('/dashboard/api/guilds/:gid/logs', guard, async (req, res) => {
    const b = req.body || {};
    const patch = {};
    if (b.channelId !== undefined) patch.channelId = String(b.channelId || '') || null;
    if (b.toggles && typeof b.toggles === 'object') {
      patch.toggles = {};
      for (const [k] of LOG_TYPES) {
        if (b.toggles[k] !== undefined) patch.toggles[k] = !!b.toggles[k];
      }
    }
    const s = await require('../utils/logSettings').saveLogSettings(req.params.gid, patch);
    res.json({ ok: true, settings: s });
  });

  // Nhiều bảng chọn role kiểu ProBot
  const roleBoards = require('../utils/roleBoards');
  app.get('/dashboard/api/guilds/:gid/roleboards', guard, async (req, res) => {
    res.json(await roleBoards.listBoards(req.params.gid));
  });
  app.post('/dashboard/api/guilds/:gid/roleboards', guard, async (req, res) => {
    try {
      const b = req.body || {};
      const board = await roleBoards.createBoard(req.params.gid, {
        name: b.name, channelId: b.channelId || null, title: b.title || null, description: b.description || null,
      });
      res.json({ ok: true, board: { id: String(board._id || board.id), name: board.name } });
    } catch (e) {
      const msg = e?.message === 'exists' ? 'Tên này đã có rồi.' : e?.message === 'limit' ? 'Tối đa 10 bảng.' : (e?.message === 'no-name' ? 'Nhập tên bảng.' : 'failed');
      res.status(400).json({ error: msg });
    }
  });
  // Nhập bảng đơn cũ (/roles) thành board mới
  app.post('/dashboard/api/guilds/:gid/roleboards/import', guard, async (req, res) => {
    const legacy = await require('../utils/rolePanels').getPanel(req.params.gid);
    if (!legacy.items?.length) return res.status(400).json({ error: 'empty' });
    try {
      const board = await roleBoards.createBoard(req.params.gid, {
        name: 'Bảng chính', channelId: legacy.channelId, title: legacy.title, description: legacy.description,
      });
      const { saveBoard } = roleBoards;
      const bid = String(board._id || board.id);
      await saveBoard(req.params.gid, bid, { items: legacy.items });
      res.json({ ok: true, id: bid });
    } catch (e) {
      res.status(400).json({ error: e?.message || 'failed' });
    }
  });
  app.get('/dashboard/api/guilds/:gid/roleboards/:bid', guard, async (req, res) => {
    const b = await roleBoards.getBoard(req.params.gid, req.params.bid);
    if (!b) return res.status(404).json({ error: 'not-found' });
    res.json({ id: String(b._id || b.id), name: b.name, channelId: b.channelId, title: b.title, description: b.description, items: b.items || [] });
  });
  app.put('/dashboard/api/guilds/:gid/roleboards/:bid', guard, async (req, res) => {
    const b = req.body || {};
    const patch = {};
    if (b.channelId !== undefined) patch.channelId = String(b.channelId || '') || null;
    if (b.title !== undefined) patch.title = String(b.title || '').slice(0, 100) || null;
    if (b.description !== undefined) patch.description = String(b.description || '').slice(0, 1000) || null;
    if (b.items !== undefined) {
      if (!Array.isArray(b.items) || b.items.length > 25) return res.status(400).json({ error: 'items' });
      patch.items = b.items.filter((i) => i && i.roleId).slice(0, 25)
        .map((i) => ({ roleId: String(i.roleId), label: String(i.label || '').slice(0, 80) || 'Role', emoji: String(i.emoji || '') || null }));
    }
    await roleBoards.saveBoard(req.params.gid, req.params.bid, patch);
    res.json({ ok: true });
  });
  app.delete('/dashboard/api/guilds/:gid/roleboards/:bid', guard, async (req, res) => {
    const board = await roleBoards.deleteBoard(req.params.gid, req.params.bid);
    try {
      if (board?.channelId && board?.messageId) {
        const guild = await client.guilds.fetch(req.params.gid).catch(() => null);
        const ch = guild && await guild.channels.fetch(board.channelId).catch(() => null);
        const msg = ch && await ch.messages.fetch(board.messageId).catch(() => null);
        if (msg) await msg.delete().catch(() => {});
      }
    } catch {}
    res.json({ ok: true });
  });
  app.post('/dashboard/api/guilds/:gid/roleboards/:bid/refresh', guard, async (req, res) => {
    const msg = await roleBoards.renderBoard(client, req.params.gid, req.params.bid);
    if (!msg) return res.status(400).json({ error: 'no-items' });
    res.json({ ok: true, url: `https://discord.com/channels/${req.params.gid}/${msg.channelId}/${msg.id}` });
  });

  // Music: xem trạng thái + điều khiển (không lưu setting)
  function musicState(gid) {
    const queue = client?.player?.nodes?.get(gid);
    if (!queue) return { playing: false };
    const cur = queue.currentTrack || queue.current || null;
    let upcoming = [];
    try {
      const t = queue.tracks;
      upcoming = Array.isArray(t) ? t : (typeof t?.toArray === 'function' ? t.toArray() : (t?.data || []));
    } catch {}
    let paused = false;
    try { paused = typeof queue.node?.isPaused === 'function' ? queue.node.isPaused() : !!queue.node?.paused; } catch {}
    let volume = null;
    try { volume = queue.node?.volume ?? queue.volume ?? null; } catch {}
    return {
      playing: !!cur,
      voice: queue.channel?.name || null,
      current: cur ? { title: cur.cleanTitle || cur.title, author: cur.author, duration: cur.duration, thumbnail: cur.thumbnail } : null,
      queue: upcoming.slice(0, 10).map((t) => ({ title: t.cleanTitle || t.title, author: t.author })),
      queueCount: upcoming.length,
      volume, paused,
    };
  }
  app.get('/dashboard/api/guilds/:gid/music', guard, async (req, res) => {
    res.json(musicState(req.params.gid));
  });
  app.post('/dashboard/api/guilds/:gid/music/:action', guard, async (req, res) => {
    const queue = client?.player?.nodes?.get(req.params.gid);
    if (!queue) return res.status(400).json({ error: 'nothing' });
    const a = req.params.action;
    try {
      if (a === 'pause') queue.node?.setPaused ? queue.node.setPaused(true) : queue.node?.pause?.();
      else if (a === 'resume') queue.node?.setPaused ? queue.node.setPaused(false) : queue.node?.resume?.();
      else if (a === 'skip') queue.node?.skip?.();
      else if (a === 'stop') {
        try { queue.node?.stop?.(); } catch {}
        try { queue.tracks?.clear?.(); } catch {}
      } else if (a === 'volume') {
        const v = Math.min(100, Math.max(0, parseInt((req.body || {}).volume, 10)));
        if (!Number.isFinite(v)) return res.status(400).json({ error: 'volume' });
        queue.node?.setVolume ? queue.node.setVolume(v) : queue.node?.setVolume?.(v);
      } else return res.status(400).json({ error: 'action' });
      res.json({ ok: true, state: musicState(req.params.gid) });
    } catch (e) {
      res.status(500).json({ error: e?.message || 'failed' });
    }
  });

  // --- Pages ---
  app.get('/dashboard', (req, res) => {
    if (!req.session?.user) return res.send(views.login());
    res.send(views.home(req.session.user));
  });
  app.get('/dashboard/:gid', (req, res) => {
    if (!req.session?.user) return res.redirect('/dashboard');
    res.send(views.guild(req.params.gid));
  });

  console.log('📊 Dashboard: /dashboard (cần DISCORD_CLIENT_SECRET để login Discord)');
}

module.exports = { mount, setClient };
