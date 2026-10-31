const path = require('node:path');
const fs = require('node:fs');
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

// Session store ghi xuống file: phiên đăng nhập dashboard sống qua các lần restart bot
// (store mặc định của express-session giữ trong RAM — restart là mất hết phiên).
class FileSessionStore extends session.Store {
  constructor(file) {
    super();
    this.file = file;
    this.data = {};
    this._lastFlush = 0;
    this.data = require('../utils/jsonStore').readJson(file, {}) || {};
  }
  _flush(force) {
    const now = Date.now();
    if (!force && now - this._lastFlush < 1000) return;
    this._lastFlush = now;
    try {
      // Ghi nguyên tử như mọi store khác: crash giữa lúc ghi không làm hỏng sessions.json.
      require('../utils/jsonStore').writeJsonAtomic(this.file, this.data);
    } catch {}
  }
  get(sid, cb) {
    const s = this.data[sid];
    if (!s) return cb(null, null);
    if (s.cookie && s.cookie.expires && new Date(s.cookie.expires).getTime() < Date.now()) {
      delete this.data[sid];
      this._flush(true);
      return cb(null, null);
    }
    cb(null, s);
  }
  set(sid, sess, cb) {
    this.data[sid] = sess;
    this._flush(false);
    if (cb) cb(null);
  }
  destroy(sid, cb) {
    delete this.data[sid];
    this._flush(true);
    if (cb) cb(null);
  }
  touch(sid, sess, cb) {
    if (this.data[sid]) { this.data[sid] = sess; this._flush(false); }
    if (cb) cb(null);
  }
}

function mount(app) {
  if (!process.env.SESSION_SECRET) {
    console.warn('[dashboard] chưa có SESSION_SECRET — login sẽ mất khi restart. Thêm SESSION_SECRET vào env.');
  }
  app.set('trust proxy', 1);
  app.use(session({
    store: new FileSessionStore(path.join(__dirname, '..', '..', 'data', 'sessions.json')),
    secret: process.env.SESSION_SECRET || ('dev-' + Math.random().toString(36).slice(2)),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto', maxAge: 30 * 24 * 3600 * 1000 },
  }));
  app.use(require('express').json({ limit: '256kb' }));
  // Trang HTML của dashboard không cache — tránh điện thoại dùng lại trang cũ sau khi bot cập nhật.
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/dashboard/api') && !/\.(jpg|jpeg|png|gif|css|js|ico|svg)$/i.test(req.path)) {
      res.set('Cache-Control', 'no-store');
    }
    next();
  });

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
    const me = guild.members.me;
    const canWrite = (ch) => {
      try {
        const p = ch.permissionsFor(me);
        return !!(p?.has('ViewChannel') && p?.has('SendMessages'));
      } catch { return false; }
    };
    const list = [];
    const cats = [];
    const voice = [];
    const KIND = { 0: 'text', 2: 'voice', 4: 'category', 5: 'thông báo', 10: 'thread', 11: 'thread', 12: 'thread', 13: 'stage', 15: 'forum' };
    for (const ch of channels.values()) {
      if (!ch) continue;
      // Hiện mọi loại kênh để không bao giờ thiếu (ghi rõ loại, chọn sai sẽ báo)
      // Kênh bot thiếu quyền Xem/Gửi thì gắn cờ 🔒 để admin biết mà cấp
      if (ch.type === 0 || ch.type === 5) list.push({ id: ch.id, name: ch.name, type: ch.type, lock: !canWrite(ch) });
      else if (ch.type === 4) cats.push({ id: ch.id, name: ch.name });
      else if (ch.type === 2) { voice.push({ id: ch.id, name: ch.name }); list.push({ id: ch.id, name: `${ch.name} (voice)`, type: ch.type, lock: !canWrite(ch) }); }
      else if (ch.type === 13 || ch.type === 15) list.push({ id: ch.id, name: `${ch.name} (${KIND[ch.type]})`, type: ch.type, lock: !canWrite(ch) });
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
    if (b.voiceXpEnabled !== undefined) patch.voiceXpEnabled = !!b.voiceXpEnabled;
    if (b.voiceXpPerMin !== undefined) {
      const n = parseInt(b.voiceXpPerMin, 10);
      if (Number.isFinite(n)) patch.voiceXpPerMin = Math.min(1000, Math.max(0, n));
    }
    if (b.levelRoles !== undefined && Array.isArray(b.levelRoles)) {
      patch.levelRoles = b.levelRoles.slice(0, 25)
        .filter((r) => r && r.roleId && Number.isFinite(parseInt(r.level, 10)))
        .map((r) => ({ level: Math.min(999, Math.max(1, parseInt(r.level, 10))), roleId: String(r.roleId) }))
        .sort((a, b2) => a.level - b2.level);
    }
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
      const strList = (v, max, len) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => x.slice(0, len || 200)).slice(0, max) : []);
      const perRule = {};
      for (const r of ['words', 'invites', 'links', 'spam', 'caps', 'mentions']) {
        const v = a.actions?.[r];
        perRule[r] = ['delete', 'warn', 'timeout'].includes(v) ? v : (['delete', 'warn', 'timeout'].includes(a.action) ? a.action : 'delete');
      }
      patch.automod = {
        words: a.words !== false,
        wholeWord: !!a.wholeWord,
        invites: !!a.invites,
        links: !!a.links,
        spam: !!a.spam,
        spamCount: num(a.spamCount, 2, 20, 5),
        spamSecs: num(a.spamSecs, 2, 60, 5),
        caps: !!a.caps,
        capsPercent: num(a.capsPercent, 30, 100, 70),
        capsMinLen: num(a.capsMinLen, 4, 200, 10),
        mentions: !!a.mentions,
        mentionCount: num(a.mentionCount, 2, 50, 5),
        action: ['delete', 'warn', 'timeout'].includes(a.action) ? a.action : 'delete',
        actions: perRule,
        timeoutMin: num(a.timeoutMin, 1, 40320, 10),
        urlWhitelist: strList(a.urlWhitelist, 50),
        urlBlacklist: strList(a.urlBlacklist, 50),
        onlyImageChannels: strList(a.onlyImageChannels, 25, 30),
        onlyYoutubeChannels: strList(a.onlyYoutubeChannels, 25, 30),
        exemptChannels: strList(a.exemptChannels, 25, 30),
        exemptRoles: strList(a.exemptRoles, 25, 30),
      };
    }
    if (b.antiraid !== undefined && b.antiraid && typeof b.antiraid === 'object') {
      const r = b.antiraid;
      const n2 = (v, min, max, fb) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb; };
      patch.antiraid = {
        enabled: !!r.enabled,
        ageDays: [0, 7, 30, 90].includes(parseInt(r.ageDays, 10)) ? parseInt(r.ageDays, 10) : 7,
        count: n2(r.count, 3, 100, 5),
        windowSecs: n2(r.windowSecs, 5, 600, 30),
        action: ['timeout', 'kick', 'ban'].includes(r.action) ? r.action : 'timeout',
        timeoutMin: n2(r.timeoutMin, 1, 40320, 60),
      };
    }
    if (b.starboard !== undefined && b.starboard && typeof b.starboard === 'object') {
      const sb = b.starboard;
      const n3 = parseInt(sb.threshold, 10);
      patch.starboard = {
        enabled: !!sb.enabled,
        channelId: String(sb.channelId || '') || null,
        emoji: String(sb.emoji || '⭐').slice(0, 10),
        threshold: Number.isFinite(n3) ? Math.min(50, Math.max(1, n3)) : 3,
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
    if (patch.channelId) {
      const err = await checkTextChannel(req.params.gid, patch.channelId);
      if (err) return res.status(400).json({ error: err });
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

  // Kiểm tra kênh text dùng chung: tồn tại + gửi được, báo rõ nếu không
  async function checkTextChannel(gid, id) {
    if (!id) return null;
    const guild = await client.guilds.fetch(gid).catch(() => null);
    if (!guild) return 'Bot không còn trong server.';
    const ch = await guild.channels.fetch(id).catch(() => null);
    if (!ch?.isTextBased()) return 'Kênh này không phải kênh text/thông báo (voice/forum/stage không gửi tin được).';
    const me = guild.members.me;
    if (!ch.permissionsFor(me)?.has('ViewChannel') || !ch.permissionsFor(me)?.has('SendMessages')) {
      return 'Bot thiếu quyền Xem/Gửi trong kênh này.';
    }
    return null;
  }

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
    if (patch.channelId) {
      const err = await checkTextChannel(req.params.gid, patch.channelId);
      if (err) return res.status(400).json({ error: err });
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
    if (b.boardChannelId !== undefined) patch.boardChannelId = String(b.boardChannelId || '') || null;
    if (b.boardIntervalSec !== undefined) patch.boardIntervalSec = require('../utils/statusBoard').clampInterval(b.boardIntervalSec);
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

  // Bảng trạng thái embed tự sửa tin (utils/statusBoard.js): đăng/cập nhật ngay
  app.post('/dashboard/api/guilds/:gid/stats/board/post', guard, async (req, res) => {
    try {
      const s = await require('../utils/statsSettings').getStats(req.params.gid);
      if (!s.boardChannelId) return res.status(400).json({ error: 'no-channel' });
      const { startBoard } = require('../utils/statusBoard');
      const r = await startBoard(client, req.params.gid, s.boardChannelId, s.boardIntervalSec);
      res.json({ ok: true, url: `https://discord.com/channels/${req.params.gid}/${s.boardChannelId}/${r.messageId}` });
    } catch (e) {
      res.status(400).json({ error: e?.message || 'failed' });
    }
  });

  app.post('/dashboard/api/guilds/:gid/stats/board/off', guard, async (req, res) => {
    try {
      await require('../utils/statusBoard').stopBoard(client, req.params.gid);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: e?.message || 'failed' });
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
    if (patch.channelId) {
      const err = await checkTextChannel(req.params.gid, patch.channelId);
      if (err) return res.status(400).json({ error: err });
    }
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
    if (b.channelId !== undefined) {
      const id = String(b.channelId || '') || null;
      if (id) {
        // Kiểm tra luôn: kênh tồn tại + gửi được, báo rõ nếu không
        const guild = await client.guilds.fetch(req.params.gid).catch(() => null);
        const ch = guild && await guild.channels.fetch(id).catch(() => null);
        if (!ch?.isTextBased()) return res.status(400).json({ error: 'Kênh không tồn tại hoặc không phải kênh text.' });
        const me = guild.members.me;
        if (!ch.permissionsFor(me)?.has('SendMessages') || !ch.permissionsFor(me)?.has('ViewChannel')) {
          return res.status(400).json({ error: 'Bot không có quyền Xem/Gửi trong kênh này. Vào setting kênh cấp quyền cho role bot.' });
        }
      }
      patch.channelId = id;
    }
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
    res.json({ id: String(b._id || b.id), name: b.name, channelId: b.channelId, title: b.title, description: b.description, items: b.items || [], display: b.display || 'buttons', exclusive: !!b.exclusive, maxPicks: b.maxPicks || 0, requiredRoleId: b.requiredRoleId || null, footer: b.footer || null, thumbnailUrl: b.thumbnailUrl || null, placeholder: b.placeholder || null, rainbowBar: b.rainbowBar !== false });
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
    if (b.footer !== undefined) patch.footer = String(b.footer || '').slice(0, 100) || null;
    if (b.thumbnailUrl !== undefined) {
      const u = String(b.thumbnailUrl || '').trim();
      patch.thumbnailUrl = /^https?:\/\//i.test(u) ? u.slice(0, 500) : null;
    }
    if (b.placeholder !== undefined) patch.placeholder = String(b.placeholder || '').slice(0, 150) || null;
    if (b.rainbowBar !== undefined) patch.rainbowBar = !!b.rainbowBar;
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
      openTickets = Object.values(await require('../utils/tickets').listTickets())
        .filter((t) => t.guildId === req.params.gid && !t.closed).length;
    } catch {}
    let boards = 0;
    try {
      boards = (await require('../utils/roleBoards').listBoards(req.params.gid)).length;
    } catch {}
    let top = [];
    try {
      const levels = require('../utils/levels');
      const lb = await levels.getLeaderboard(req.params.gid, 5);
      top = await Promise.all(lb.map(async (e) => {
        let name = e.userId, avatar = null;
        try { const u = await client.users.fetch(e.userId); name = u.username; avatar = u.displayAvatarURL({ size: 64 }); } catch {}
        let pct = 0;
        try { const need = levels.xpNeeded(e.level); pct = need > 0 ? Math.min(100, Math.round((e.xp / need) * 100)) : 0; } catch {}
        return { userId: e.userId, name, avatar, level: e.level, xp: e.xp, pct };
      }));
    } catch {}
    let toggles = null, activity = [];
    try {
      const st = await require('../utils/guildSettings').getGuildSettings(req.params.gid);
      toggles = { leveling: st.levelEnabled !== false, voicexp: st.voiceXpEnabled !== false, starboard: !!st.starboard?.enabled, antiraid: !!st.antiraid?.enabled };
    } catch {}
    try { activity = await require('../utils/activity').list(req.params.gid, 7); } catch {}
    res.json({
      guild: { id: guild.id, name: guild.name, icon: guild.icon, created: guild.createdTimestamp, premiumTier: guild.premiumTier },
      members: guild.memberCount,
      channels: channels?.size ?? 0,
      roles: roles?.size ?? 0,
      openTickets, boards, top, toggles, activity,
      bot: { tag: client.user?.tag || null, uptime: client.uptime || 0, ping: Math.round(client.ws?.ping ?? -1), memMB: Math.round(process.memoryUsage().rss / 1048576), guilds: client.guilds.cache.size },
      botPerms: (() => {
        try {
          const p = guild.members.me?.permissions;
          if (!p) return null;
          const want = ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'ViewChannel', 'SendMessages', 'ManageMessages', 'KickMembers', 'BanMembers', 'ModerateMembers', 'ViewAuditLog', 'Connect', 'Speak'];
          const has = {};
          for (const k of want) { try { has[k] = p.has(k); } catch { has[k] = false; } }
          return has;
        } catch { return null; }
      })(),
    });
  });

  // Bật/tắt nhanh trên Overview — nối thẳng vào cài đặt thật của từng module
  app.post('/dashboard/api/guilds/:gid/overview/toggles', guard, async (req, res) => {
    const { key, value } = req.body || {};
    const gs = require('../utils/guildSettings');
    const st = await gs.getGuildSettings(req.params.gid);
    const v = !!value;
    const patch = {};
    if (key === 'leveling') patch.levelEnabled = v;
    else if (key === 'voicexp') patch.voiceXpEnabled = v;
    else if (key === 'starboard') patch.starboard = { ...(st.starboard || {}), enabled: v };
    else if (key === 'antiraid') patch.antiraid = { ...(st.antiraid || {}), enabled: v };
    else return res.status(400).json({ error: 'bad-key' });
    await gs.saveGuildSettings(req.params.gid, patch);
    const now = await gs.getGuildSettings(req.params.gid);
    res.json({ ok: true, toggles: { leveling: now.levelEnabled !== false, voicexp: now.voiceXpEnabled !== false, starboard: !!now.starboard?.enabled, antiraid: !!now.antiraid?.enabled } });
  });

  // Trình tạo Embed: gửi vào kênh + lưu mẫu dùng lại
  const cleanEmbed = (b) => ({
    title: String(b?.title || '').slice(0, 256),
    description: String(b?.description || '').slice(0, 4000),
    color: /^#[0-9a-fA-F]{6}$/.test(b?.color || '') ? b.color : '#e0322d',
    image: /^https?:\/\//.test(b?.image || '') ? String(b.image).slice(0, 1000) : '',
    thumbnail: /^https?:\/\//.test(b?.thumbnail || '') ? String(b.thumbnail).slice(0, 1000) : '',
    footer: String(b?.footer || '').slice(0, 200),
    btnLabel: String(b?.btnLabel || '').slice(0, 80),
    btnUrl: /^https?:\/\//.test(b?.btnUrl || '') ? String(b.btnUrl).slice(0, 500) : '',
  });
  app.post('/dashboard/api/guilds/:gid/embed/send', guard, async (req, res) => {
    try {
      const guild = await client.guilds.fetch(req.params.gid).catch(() => null);
      if (!guild) return res.status(404).json({ error: 'bot-not-in-guild' });
      const ch = await guild.channels.fetch(String(req.body?.channelId || '')).catch(() => null);
      if (!ch?.isTextBased()) return res.status(400).json({ error: 'bad-channel' });
      const d = cleanEmbed(req.body?.embed || {});
      if (!d.title && !d.description && !d.image) return res.status(400).json({ error: 'empty-embed' });
      const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const em = new EmbedBuilder().setColor(d.color).setTimestamp();
      if (d.title) em.setTitle(d.title);
      if (d.description) em.setDescription(d.description);
      if (d.image) em.setImage(d.image);
      if (d.thumbnail) em.setThumbnail(d.thumbnail);
      if (d.footer) em.setFooter({ text: d.footer });
      const payload = { embeds: [em] };
      if (d.btnLabel && d.btnUrl) {
        payload.components = [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel(d.btnLabel).setStyle(ButtonStyle.Link).setURL(d.btnUrl))];
      }
      await ch.send(payload);
      require('../utils/activity').record(req.params.gid, 'embed', `Gửi embed “${(d.title || 'không tiêu đề').slice(0, 60)}” vào #${ch.name}`).catch(() => {});
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e?.message || 'send-failed' }); }
  });
  app.get('/dashboard/api/guilds/:gid/embed/templates', guard, async (req, res) => {
    const st = await require('../utils/guildSettings').getGuildSettings(req.params.gid);
    res.json({ templates: Array.isArray(st.embedTemplates) ? st.embedTemplates : [] });
  });
  app.post('/dashboard/api/guilds/:gid/embed/templates', guard, async (req, res) => {
    const gs = require('../utils/guildSettings');
    const st = await gs.getGuildSettings(req.params.gid);
    const name = String(req.body?.name || '').slice(0, 60).trim();
    if (!name) return res.status(400).json({ error: 'no-name' });
    let templates = Array.isArray(st.embedTemplates) ? [...st.embedTemplates] : [];
    const item = { name, data: cleanEmbed(req.body?.data || {}) };
    const idx = templates.findIndex((t) => t.name === name);
    if (idx >= 0) templates[idx] = item; else templates.push(item);
    templates = templates.slice(-30);
    await gs.saveGuildSettings(req.params.gid, { embedTemplates: templates });
    res.json({ ok: true, templates });
  });
  app.post('/dashboard/api/guilds/:gid/embed/templates/delete', guard, async (req, res) => {
    const gs = require('../utils/guildSettings');
    const st = await gs.getGuildSettings(req.params.gid);
    const templates = (Array.isArray(st.embedTemplates) ? st.embedTemplates : []).filter((t) => t.name !== String(req.body?.name || ''));
    await gs.saveGuildSettings(req.params.gid, { embedTemplates: templates });
    res.json({ ok: true, templates });
  });

  // Role theo link mời: cấu hình + thống kê người mời
  app.get('/dashboard/api/guilds/:gid/invites', guard, async (req, res) => {
    const guild = await client.guilds.fetch(req.params.gid).catch(() => null);
    if (!guild) return res.status(404).json({ error: 'bot-not-in-guild' });
    const st = await require('../utils/guildSettings').getGuildSettings(req.params.gid);
    const cfg = st.inviteCfg || { enabled: false, rules: [] };
    let invites = [];
    try {
      const inv = await guild.invites.fetch();
      invites = [...inv.values()].map((i) => ({ code: i.code, uses: i.uses || 0, inviter: i.inviter?.username || null }));
    } catch {}
    const stats = await require('../utils/inviteRoles').getStats(req.params.gid);
    const enriched = await Promise.all([...stats].sort((a, b) => b.total - a.total).slice(0, 10).map(async (s) => {
      let name = s.userId;
      try { name = (await client.users.fetch(s.userId)).username; } catch {}
      return { ...s, name };
    }));
    res.json({ cfg, invites, stats: enriched });
  });
  app.put('/dashboard/api/guilds/:gid/invites', guard, async (req, res) => {
    const b = req.body || {};
    const rules = (Array.isArray(b.rules) ? b.rules : []).slice(0, 20)
      .map((r) => ({ code: String(r.code || '').trim(), roleId: String(r.roleId || '') || null }))
      .filter((r) => r.code && r.roleId);
    await require('../utils/guildSettings').saveGuildSettings(req.params.gid, { inviteCfg: { enabled: !!b.enabled, rules } });
    res.json({ ok: true, count: rules.length });
  });

  // Shop bằng credits (hiển thị bằng /shop, mua bằng /shop buy)
  const cleanShop = (list) => (Array.isArray(list) ? list : []).slice(0, 30).map((it, i) => ({
    id: String(it.id || `item${i + 1}`).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || `item${i + 1}`,
    name: String(it.name || 'Mặt hàng').slice(0, 60),
    price: Math.min(1000000, Math.max(1, parseInt(it.price, 10) || 1)),
    roleId: String(it.roleId || '') || null,
    desc: String(it.desc || '').slice(0, 200),
  })).filter((it) => it.name);
  app.get('/dashboard/api/guilds/:gid/shop', guard, async (req, res) => {
    const st = await require('../utils/guildSettings').getGuildSettings(req.params.gid);
    res.json({ items: Array.isArray(st.shopItems) ? st.shopItems : [] });
  });
  app.put('/dashboard/api/guilds/:gid/shop', guard, async (req, res) => {
    const items = cleanShop(req.body?.items);
    await require('../utils/guildSettings').saveGuildSettings(req.params.gid, { shopItems: items });
    res.json({ ok: true, count: items.length });
  });

  // Xuất / nhập cấu hình server (sao lưu & khôi phục)
  app.get('/dashboard/api/guilds/:gid/config/export', guard, async (req, res) => {
    const gid = req.params.gid;
    const data = { app: 'Bot-RAPTOR', version: 1, guildId: gid, exportedAt: new Date().toISOString() };
    try { data.settings = await require('../utils/guildSettings').getGuildSettings(gid); } catch {}
    try { data.welcome = await require('../utils/welcomeSettings').getWelcomeSettings(gid); } catch {}
    try { data.goodbye = await require('../utils/goodbyeSettings').getGoodbye(gid); } catch {}
    try { data.leaderboard = await require('../utils/leaderboardSettings').getLeaderboardSettings(gid); } catch {}
    try { data.logs = await require('../utils/logSettings').getLogSettings(gid); } catch {}
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="raptor-config-${gid}.json"`);
    res.send(JSON.stringify(data, null, 2));
  });
  app.post('/dashboard/api/guilds/:gid/config/import', guard, async (req, res) => {
    const gid = req.params.gid;
    const d = req.body?.data;
    if (!d || d.app !== 'Bot-RAPTOR') return res.status(400).json({ error: 'bad-file' });
    const done = [];
    const pick = (obj, keys) => {
      const out = {};
      if (obj) for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
      return out;
    };
    try {
      if (d.settings) {
        const keys = ['xpMin', 'xpMax', 'xpCooldownSec', 'levelUpMessage', 'bannedWords', 'logChannelId', 'ticketCategoryId', 'ticketStaffRoleId', 'ticketPanelImageUrl', 'ticketTypes', 'panelTitle', 'panelDescription', 'showClaim', 'showTranscript', 'showRating', 'closeDelaySec', 'archiveCategoryId', 'closeMode', 'autoCloseHours', 'defaultPriority', 'musicDefaultVolume', 'giveawayChannelId', 'giveawayWinners', 'giveawayDuration', 'language', 'timezone', 'prefix', 'levelEnabled', 'voiceXpEnabled', 'voiceXpPerMin', 'levelRoles', 'automod', 'antiraid', 'starboard', 'disabledCommands', 'shopItems', 'inviteCfg', 'embedTemplates'];
        await require('../utils/guildSettings').saveGuildSettings(gid, pick(d.settings, keys));
        done.push('cài đặt chung');
      }
    } catch {}
    try {
      if (d.welcome) {
        const keys = ['channelId', 'message', 'subheading', 'cardEnabled', 'autoRoleId', 'reactions', 'dmEnabled', 'imageUrl', 'color'];
        await require('../utils/welcomeSettings').saveWelcomeSettings(gid, pick(d.welcome, keys));
        done.push('chào mừng');
      }
    } catch {}
    try {
      if (d.goodbye) {
        const keys = ['channelId', 'message'];
        await require('../utils/goodbyeSettings').saveGoodbye(gid, pick(d.goodbye, keys));
        done.push('tạm biệt');
      }
    } catch {}
    try {
      const lb = require('../utils/leaderboardSettings');
      if (d.leaderboard && typeof lb.saveLeaderboardSettings === 'function') {
        await lb.saveLeaderboardSettings(gid, d.leaderboard);
        done.push('bảng xếp hạng');
      }
    } catch {}
    try {
      if (d.logs) {
        const keys = ['channelId', 'toggles'];
        await require('../utils/logSettings').saveLogSettings(gid, pick(d.logs, keys));
        done.push('nhật ký');
      }
    } catch {}
    if (!done.length) return res.status(400).json({ error: 'nothing-imported' });
    require('../utils/activity').record(gid, 'config', `Nhập cấu hình từ bản sao lưu (${done.join(', ')})`).catch(() => {});
    res.json({ ok: true, done });
  });

  // ===== Kênh voice tạm (kiểu VoiceMaster) =====
  app.get('/dashboard/api/guilds/:gid/tempvoice', guard, async (req, res) => {
    const st = await require('../utils/guildSettings').getGuildSettings(req.params.gid);
    const cfg = st.tempVoiceCfg || {};
    res.json({
      enabled: !!cfg.enabled,
      generatorId: cfg.generatorId || null,
      categoryId: cfg.categoryId || null,
      nameTpl: cfg.nameTpl || '🎧 Phòng của {user}',
      defaultLimit: Math.max(0, Math.min(99, parseInt(cfg.defaultLimit, 10) || 0)),
      maxPerUser: Math.max(1, Math.min(10, parseInt(cfg.maxPerUser, 10) || 1)),
    });
  });

  app.put('/dashboard/api/guilds/:gid/tempvoice', guard, async (req, res) => {
    const g = req.params.gid;
    const cfg = {
      enabled: !!req.body?.enabled,
      generatorId: req.body?.generatorId ? String(req.body.generatorId) : null,
      categoryId: req.body?.categoryId ? String(req.body.categoryId) : null,
      nameTpl: String(req.body?.nameTpl || '🎧 Phòng của {user}').trim().slice(0, 60) || '🎧 Phòng của {user}',
      defaultLimit: Math.max(0, Math.min(99, parseInt(req.body?.defaultLimit, 10) || 0)),
      maxPerUser: Math.max(1, Math.min(10, parseInt(req.body?.maxPerUser, 10) || 1)),
    };
    await require('../utils/guildSettings').saveGuildSettings(g, { tempVoiceCfg: cfg });
    res.json({ ok: true, ...cfg });
  });

  // ===== Hộp gacha =====
  app.get('/dashboard/api/guilds/:gid/gacha', guard, async (req, res) => {
    const st = await require('../utils/guildSettings').getGuildSettings(req.params.gid);
    const cfg = st.gachaCfg || {};
    res.json({ cost: Math.max(1, parseInt(cfg.cost, 10) || 100), prizes: Array.isArray(cfg.prizes) ? cfg.prizes : [] });
  });

  app.put('/dashboard/api/guilds/:gid/gacha', guard, async (req, res) => {
    const g = req.params.gid;
    const cost = Math.max(1, Math.min(1e6, parseInt(req.body?.cost, 10) || 100));
    const prizes = (Array.isArray(req.body?.prizes) ? req.body.prizes : []).slice(0, 20)
      .map((p) => ({ name: String(p?.name ?? '').trim().slice(0, 60), roleId: p?.roleId ? String(p.roleId) : null, weight: Math.max(1, Math.min(1000, parseInt(p?.weight, 10) || 10)) }))
      .filter((p) => p.name);
    await require('../utils/guildSettings').saveGuildSettings(g, { gachaCfg: { cost, prizes } });
    res.json({ ok: true, cost, prizes });
  });

  // ===== Thông báo video TikTok mới qua RSS =====
  app.get('/dashboard/api/guilds/:gid/socialfeed', guard, async (req, res) => {
    const st = await require('../utils/guildSettings').getGuildSettings(req.params.gid);
    const cfg = st.socialFeedCfg || {};
    res.json({ enabled: !!cfg.enabled, feedUrl: cfg.feedUrl || 'https://rsshub.app/tiktok/user/phimhayplus38', channelId: cfg.channelId || null });
  });

  app.put('/dashboard/api/guilds/:gid/socialfeed', guard, async (req, res) => {
    const g = req.params.gid;
    const feedUrl = String(req.body?.feedUrl || '').trim().slice(0, 400);
    const cfg = {
      enabled: !!req.body?.enabled,
      feedUrl: /^https?:\/\//i.test(feedUrl) ? feedUrl : 'https://rsshub.app/tiktok/user/phimhayplus38',
      channelId: req.body?.channelId ? String(req.body.channelId) : null,
    };
    await require('../utils/guildSettings').saveGuildSettings(g, { socialFeedCfg: cfg });
    res.json({ ok: true, ...cfg });
  });

  // ===== Lọc link lừa đảo =====
  app.get('/dashboard/api/guilds/:gid/scamfilter', guard, async (req, res) => {
    const st = await require('../utils/guildSettings').getGuildSettings(req.params.gid);
    const cfg = st.scamCfg || {};
    res.json({ enabled: cfg.enabled !== false, extraDomains: Array.isArray(cfg.extraDomains) ? cfg.extraDomains : [] });
  });

  app.put('/dashboard/api/guilds/:gid/scamfilter', guard, async (req, res) => {
    const g = req.params.gid;
    const extraDomains = (Array.isArray(req.body?.extraDomains) ? req.body.extraDomains : [])
      .map((d) => String(d).toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')).filter(Boolean).slice(0, 100);
    const cfg = { enabled: req.body?.enabled !== false, extraDomains };
    await require('../utils/guildSettings').saveGuildSettings(g, { scamCfg: cfg });
    res.json({ ok: true, ...cfg });
  });

  // ===== AI Chat (Gemini qua endpoint tương thích OpenAI; key chỉ ở env) =====
  app.get('/dashboard/api/guilds/:gid/aichat', guard, async (req, res) => {
    const aiChat = require('../utils/aiChat');
    const st = await require('../utils/guildSettings').getGuildSettings(req.params.gid);
    const cfg = aiChat.cfgOf(st);
    res.json({ ...cfg, keySet: aiChat.keyConfigured() });
  });

  app.put('/dashboard/api/guilds/:gid/aichat', guard, async (req, res) => {
    const b = req.body || {};
    const cfg = {
      enabled: b.enabled === true,
      channelId: String(b.channelId || '') || null,
      persona: String(b.persona || '').trim().slice(0, 1000) || null,
      model: String(b.model || '').trim().slice(0, 60) || null,
    };
    await require('../utils/guildSettings').saveGuildSettings(req.params.gid, { aiChatCfg: cfg });
    res.json({ ok: true, ...cfg });
  });

  // ===== Khởi động lại bot (từ dashboard) =====
  app.post('/dashboard/api/guilds/:gid/bot/restart', guard, async (req, res) => {
    require('../utils/restartSignal').request();
    console.log(`[ dashboard ] ${req.session.user?.username || '?'} yêu cầu khởi động lại bot từ dashboard.`);
    res.json({ ok: true });
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
      // Thứ bậc: người thao tác trên web cũng không phạt được người có role >= mình / chủ server
      const actor = await guild.members.fetch(req.session.user.id).catch(() => null);
      const hierErr = require('../utils/moderation').checkHierarchy(actor, member, guild, { blockBotTarget: action === 'warn' || action === 'timeout' });
      if (hierErr) return res.status(403).json({ error: 'hierarchy', message: hierErr });
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
    if (!req.session?.user) {
      const cfg = require('../config');
      const invite = cfg.clientId ? `https://discord.com/oauth2/authorize?client_id=${cfg.clientId}&permissions=8&scope=bot%20applications.commands` : null;
      return res.send(views.landing(invite));
    }
    res.send(views.home(req.session.user));
  });
  app.get('/dashboard/logo.jpg', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'assets', 'raptor-logo.jpg'));
  });
  app.get('/dashboard/:gid', (req, res) => {
    if (!req.session?.user) return res.redirect('/dashboard');
    res.send(views.guild(req.params.gid, req.session.user));
  });

  console.log('📊 Dashboard: /dashboard (cần DISCORD_CLIENT_SECRET để login Discord)');
}

module.exports = { mount, setClient };
