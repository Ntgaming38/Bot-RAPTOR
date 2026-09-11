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
    if (b.panelTitle !== undefined) patch.panelTitle = String(b.panelTitle || '').slice(0, 100) || null;
    if (b.panelDescription !== undefined) patch.panelDescription = String(b.panelDescription || '').slice(0, 2000) || null;
    for (const k of ['showClaim', 'showTranscript', 'showRating']) {
      if (b[k] !== undefined) patch[k] = !!b[k];
    }
    if (b.closeDelaySec !== undefined) {
      const n = parseInt(b.closeDelaySec, 10);
      if (Number.isFinite(n)) patch.closeDelaySec = Math.min(600, Math.max(0, n));
    }
    if (b.archiveCategoryId !== undefined) patch.archiveCategoryId = String(b.archiveCategoryId || '') || null;
    if (b.closeMode !== undefined) patch.closeMode = b.closeMode === 'archive' ? 'archive' : 'delete';
    if (b.autoCloseHours !== undefined) {
      const n = parseInt(b.autoCloseHours, 10);
      if (Number.isFinite(n)) patch.autoCloseHours = Math.min(720, Math.max(0, n));
    }
    if (b.defaultPriority !== undefined) {
      patch.defaultPriority = ['low', 'medium', 'high', 'urgent'].includes(b.defaultPriority) ? b.defaultPriority : 'medium';
    }
    if (b.ticketTypes !== undefined && Array.isArray(b.ticketTypes)) {
      patch.ticketTypes = b.ticketTypes.slice(0, 10)
        .filter((t) => t && t.label)
        .map((t) => ({
          id: String(t.id || t.label).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'loai',
          label: String(t.label).slice(0, 25),
          description: String(t.description || '').slice(0, 100),
          emoji: String(t.emoji || '') || '🎫',
        }));
      if (!patch.ticketTypes.length) patch.ticketTypes = null;
    }
    if (b.musicDefaultVolume !== undefined) {
      if (b.musicDefaultVolume === null || b.musicDefaultVolume === '') patch.musicDefaultVolume = null;
      else {
        const n = parseInt(b.musicDefaultVolume, 10);
        if (Number.isFinite(n)) patch.musicDefaultVolume = Math.min(100, Math.max(0, n));
      }
    }
    if (b.giveawayChannelId !== undefined) patch.giveawayChannelId = String(b.giveawayChannelId || '') || null;
    if (b.giveawayWinners !== undefined) {
      const n = parseInt(b.giveawayWinners, 10);
      if (Number.isFinite(n)) patch.giveawayWinners = Math.min(20, Math.max(1, n));
    }
    if (b.giveawayDuration !== undefined) patch.giveawayDuration = String(b.giveawayDuration || '').slice(0, 20) || null;
    if (b.language !== undefined) patch.language = b.language === 'en' ? 'en' : 'vi';
    if (b.prefix !== undefined) patch.prefix = String(b.prefix || '').slice(0, 5) || '!';
    if (b.levelEnabled !== undefined) patch.levelEnabled = !!b.levelEnabled;
    if (b.timezone !== undefined) {
      try {
        Intl.DateTimeFormat('vi-VN', { timeZone: String(b.timezone) });
        patch.timezone = String(b.timezone);
      } catch {
        return res.status(400).json({ error: 'timezone' });
      }
    }
    if (b.automod !== undefined && b.automod && typeof b.automod === 'object') {
      const a = b.automod;
      const num = (v, min, max, fb) => {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
      };
      patch.automod = {
        words: a.words !== false,
        invites: !!a.invites,
        links: !!a.links,
        spam: !!a.spam,
        spamCount: num(a.spamCount, 2, 20, 5),
        spamSecs: num(a.spamSecs, 2, 60, 5),
        action: ['delete', 'warn', 'timeout'].includes(a.action) ? a.action : 'delete',
        timeoutMin: num(a.timeoutMin, 1, 40320, 10),
        exemptChannels: Array.isArray(a.exemptChannels) ? a.exemptChannels.filter((x) => typeof x === 'string').slice(0, 25) : [],
        exemptRoles: Array.isArray(a.exemptRoles) ? a.exemptRoles.filter((x) => typeof x === 'string').slice(0, 25) : [],
      };
    }
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
    if (b.welcomeText !== undefined) patch.welcomeText = String(b.welcomeText || '').slice(0, 2000) || null;
    if (b.cardEnabled !== undefined) patch.cardEnabled = !!b.cardEnabled;
    if (b.dmEnabled !== undefined) patch.dmEnabled = !!b.dmEnabled;
    if (b.acceptRoleId !== undefined) patch.acceptRoleId = String(b.acceptRoleId || '') || null;
    if (b.welcomeButtons !== undefined && Array.isArray(b.welcomeButtons)) {
      patch.welcomeButtons = b.welcomeButtons.slice(0, 4)
        .filter((x) => x && x.label && /^https?:\/\//i.test(x.url || ''))
        .map((x) => ({ label: String(x.label).slice(0, 80), url: x.url }));
      if (!patch.welcomeButtons.length) patch.welcomeButtons = null;
    }
    if (b.cardEnabled !== undefined) patch.cardEnabled = !!b.cardEnabled;
    if (b.dmEnabled !== undefined) patch.dmEnabled = !!b.dmEnabled;
    if (b.acceptRoleId !== undefined) patch.acceptRoleId = String(b.acceptRoleId || '') || null;
    if (b.welcomeButtons !== undefined && Array.isArray(b.welcomeButtons)) {
      patch.welcomeButtons = b.welcomeButtons.slice(0, 4)
        .filter((x) => x && x.label && /^https?:\/\//i.test(x.url || ''))
        .map((x) => ({ label: String(x.label).slice(0, 80), url: x.url }));
      if (!patch.welcomeButtons.length) patch.welcomeButtons = null;
    }
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
    const { embed: em, files, components } = await buildWelcome(member, s);
    const msg = await ch.send({ embeds: [em], files, components }).catch((e) => ({ error: e?.message }));
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
    // Áp dụng ngay, khỏi đợi lịch 10 phút
    require('../utils/leaderboardSettings').updateLeaderboardChannel(client, req.params.gid).catch(() => {});
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
      color: b.color !== undefined ? (/^#[0-9a-fA-F]{6}$/.test(String(b.color || '')) ? b.color : null) : undefined,
    };
    if (b.intervalMin !== undefined) {
      const n = parseInt(b.intervalMin, 10);
      patch.intervalMin = Number.isFinite(n) ? Math.min(1440, Math.max(0, n)) : 0;
    }
    for (const k of Object.keys(patch)) if (patch[k] === undefined) delete patch[k];
    patch.lastRotated = Date.now();
    const s = await require('../utils/announceSettings').saveAnnounce(req.params.gid, patch);
    require('../utils/announceSettings').updateBoard(client, req.params.gid).catch(() => {});
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
    require('../utils/statsSettings').updateStatsChannel(client, req.params.gid).catch(() => {});
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
    if (b.color !== undefined) patch.color = /^#[0-9a-fA-F]{6}$/.test(String(b.color || '')) ? b.color : null;
    const s = await require('../utils/goodbyeSettings').saveGoodbye(req.params.gid, patch);
    res.json({ ok: true, settings: s });
  });

  app.post('/dashboard/api/guilds/:gid/goodbye/test', guard, async (req, res) => {
    const { getGoodbye, buildGoodbye } = require('../utils/goodbyeSettings');
    const s = await getGoodbye(req.params.gid);
    if (!s.channelId) return res.status(400).json({ error: 'no-channel' });
    const guild = await client.guilds.fetch(req.params.gid).catch(() => null);
    const ch = guild && (await guild.channels.fetch(s.channelId).catch(() => null));
    if (!ch?.isTextBased()) return res.status(400).json({ error: 'no-channel' });
    const member = await guild.members.fetch(req.session.user.id).catch(() => null);
    if (!member) return res.status(400).json({ error: 'not-member' });
    const msg = await ch.send({ embeds: [buildGoodbye(member, s)] }).catch((e) => ({ error: e?.message }));
    if (msg?.error) return res.status(500).json({ error: msg.error });
    res.json({ ok: true, url: `https://discord.com/channels/${guild.id}/${ch.id}/${msg.id}` });
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
    if (b.display !== undefined) patch.display = ['buttons', 'select', 'reactions'].includes(b.display) ? b.display : 'buttons';
    if (b.exclusive !== undefined) patch.exclusive = !!b.exclusive;
    if (b.maxPicks !== undefined) {
      const n = parseInt(b.maxPicks, 10);
      if (Number.isFinite(n)) patch.maxPicks = Math.min(25, Math.max(0, n));
    }
    if (b.requiredRoleId !== undefined) patch.requiredRoleId = String(b.requiredRoleId || '') || null;
    if (b.items !== undefined) {
      if (!Array.isArray(b.items) || b.items.length > 25) return res.status(400).json({ error: 'items' });
      patch.items = b.items.filter((i) => i && i.roleId).slice(0, 25)
        .map((i) => ({ roleId: String(i.roleId), label: String(i.label || '').slice(0, 80) || 'Role', emoji: String(i.emoji || '') || null }));
    }
    await roleBoards.saveBoard(req.params.gid, req.params.bid, patch);
    roleBoards.renderBoard(client, req.params.gid, req.params.bid).catch(() => {});
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

  // Ticket blacklist + thống kê
  app.get('/dashboard/api/guilds/:gid/tickets/blacklist', guard, async (req, res) => {
    res.json(await require('../utils/ticketsPro').blacklistList(req.params.gid));
  });
  app.post('/dashboard/api/guilds/:gid/tickets/blacklist', guard, async (req, res) => {
    const b = req.body || {};
    if (!b.userId) return res.status(400).json({ error: 'user' });
    await require('../utils/ticketsPro').blacklistAdd(req.params.gid, String(b.userId), String(b.reason || ''), req.session.user.username);
    res.json({ ok: true });
  });
  app.delete('/dashboard/api/guilds/:gid/tickets/blacklist/:uid', guard, async (req, res) => {
    await require('../utils/ticketsPro').blacklistRemove(req.params.gid, req.params.uid);
    res.json({ ok: true });
  });
  app.get('/dashboard/api/guilds/:gid/tickets/stats', guard, async (req, res) => {
    res.json(await require('../utils/ticketsPro').computeTicketStats(req.params.gid));
  });

  // Role tạm thời
  app.get('/dashboard/api/guilds/:gid/temproles', guard, async (req, res) => {
    res.json(await require('../utils/tempRoles').listTempRoles(req.params.gid));
  });
  app.post('/dashboard/api/guilds/:gid/temproles', guard, async (req, res) => {
    const b = req.body || {};
    const { parseDuration } = require('../utils/giveaways');
    const ms = parseDuration(String(b.duration || ''));
    if (!b.userId || !b.roleId || !ms) return res.status(400).json({ error: 'input' });
    try {
      const guild = await client.guilds.fetch(req.params.gid).catch(() => null);
      const member = guild && await guild.members.fetch(String(b.userId)).catch(() => null);
      const role = guild && await guild.roles.fetch(String(b.roleId)).catch(() => null);
      if (!member || !role) return res.status(400).json({ error: 'not-found' });
      const me = guild.members.me;
      if (!me?.permissions.has('ManageRoles') || role.position >= me.roles.highest.position) {
        return res.status(400).json({ error: 'perm' });
      }
      await member.roles.add(role).catch(() => null);
      await require('../utils/tempRoles').grantTempRole(req.params.gid, member.id, role.id, ms, req.session.user.username);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e?.message || 'failed' });
    }
  });
  app.delete('/dashboard/api/guilds/:gid/temproles', guard, async (req, res) => {
    const { userId, roleId } = req.query || {};
    if (!userId || !roleId) return res.status(400).json({ error: 'input' });
    try {
      const guild = await client.guilds.fetch(req.params.gid).catch(() => null);
      const member = guild && await guild.members.fetch(String(userId)).catch(() => null);
      if (member) await member.roles.remove(String(roleId)).catch(() => {});
    } catch {}
    await require('../utils/tempRoles').revokeTempRole(req.params.gid, String(userId), String(roleId));
    res.json({ ok: true });
  });

  // Overview + thao tác moderation từ web
  app.get('/dashboard/api/guilds/:gid/overview', guard, async (req, res) => {
    const guild = await client.guilds.fetch(req.params.gid).catch(() => null);
    if (!guild) return res.status(404).json({ error: 'bot-not-in-guild' });
    const channels = await guild.channels.fetch().catch(() => guild.channels.cache);
    const roles = await guild.roles.fetch().catch(() => guild.roles.cache);
    let openTickets = 0;
    try {
      openTickets = Object.values(require('../utils/tickets').load())
        .filter((t) => t.guildId === req.params.gid && !t.closed).length;
    } catch {}
    let boards = 0;
    try {
      boards = (await require('../utils/roleBoards').listBoards(req.params.gid)).length;
    } catch {}
    res.json({
      guild: { id: guild.id, name: guild.name, icon: guild.icon, created: guild.createdTimestamp, premiumTier: guild.premiumTier },
      members: guild.memberCount,
      channels: channels?.size ?? 0,
      roles: roles?.size ?? 0,
      openTickets, boards,
    });
  });

  app.post('/dashboard/api/guilds/:gid/mod', guard, async (req, res) => {
    const b = req.body || {};
    const action = b.action;
    if (!['ban', 'kick', 'timeout', 'unban', 'warn'].includes(action)) return res.status(400).json({ error: 'action' });
    if (!b.userId) return res.status(400).json({ error: 'user' });
    try {
      const guild = await client.guilds.fetch(req.params.gid).catch(() => null);
      if (!guild) return res.status(404).json({ error: 'bot-not-in-guild' });
      const reason = `${String(b.reason || 'Không có lý do').slice(0, 400)} (web: ${req.session.user.username})`;
      if (action === 'unban') {
        await guild.bans.remove(String(b.userId), reason);
        return res.json({ ok: true });
      }
      const member = await guild.members.fetch(String(b.userId)).catch(() => null);
      if (!member) return res.status(400).json({ error: 'not-member' });
      if (action === 'ban') {
        if (!member.bannable) return res.status(400).json({ error: 'perm' });
        await member.ban({ reason });
      } else if (action === 'kick') {
        if (!member.kickable) return res.status(400).json({ error: 'perm' });
        await member.kick(reason);
      } else if (action === 'timeout') {
        const mins = Math.min(40320, Math.max(1, parseInt(b.minutes, 10) || 10));
        if (!member.moderatable) return res.status(400).json({ error: 'perm' });
        await member.timeout(mins * 60 * 1000, reason);
      } else if (action === 'warn') {
        const { addWarn } = require('../utils/warns');
        const n = await addWarn(req.params.gid, member.id, req.session.user.id, req.session.user.username + ' (web)', String(b.reason || 'Không có lý do'));
        await require('../utils/logger').log(guild, 'warn', {
          title: '⚠️ Warn',
          description: `**User:** ${member.user.tag} (<@${member.id}>)\n**Lần thứ:** ${n}\n**Lý do:** ${String(b.reason || 'Không có lý do')}`,
          color: 0xFEE75C,
          user: member.user,
          moderator: { tag: req.session.user.username + ' (web)', toString: () => req.session.user.username },
        });
      }
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e?.message || 'failed' });
    }
  });

  app.get('/dashboard/api/guilds/:gid/warns', guard, async (req, res) => {
    if (!req.query.userId) return res.status(400).json({ error: 'user' });
    res.json(await require('../utils/warns').listWarns(req.params.gid, String(req.query.userId)));
  });

  // Bật/tắt lệnh theo server (trang Commands)
  app.get('/dashboard/api/guilds/:gid/commands', guard, async (req, res) => {
    const st = await require('../utils/guildSettings').getGuildSettings(req.params.gid).catch(() => ({}));
    const off = new Set(Array.isArray(st?.disabledCommands) ? st.disabledCommands : []);
    const list = [...client.commands.values()]
      .map((c) => ({ name: c.data.name, description: c.data.description, group: c.group || 'khác', enabled: !off.has(c.data.name) }))
      .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
    res.json(list);
  });

  app.put('/dashboard/api/guilds/:gid/commands', guard, async (req, res) => {
    const valid = new Set([...client.commands.values()].map((c) => c.data.name));
    const disabled = Array.isArray(req.body?.disabled) ? req.body.disabled.filter((n) => valid.has(n)).slice(0, 100) : [];
    await require('../utils/guildSettings').saveGuildSettings(req.params.gid, { disabledCommands: disabled });
    res.json({ ok: true });
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
