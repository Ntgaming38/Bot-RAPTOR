// Theo dõi video/bài mới qua RSS (mặc định: TikTok của chủ kênh qua RSSHub).
// Cấu hình mỗi server (guildSettings.socialFeedCfg): { enabled, feedUrl, channelId }.
// Chống đăng trùng bằng FeedState (Mongo) hoặc data/feed-state.json. Lần chạy đầu chỉ
// ghi nhận các mục hiện có, không đăng dồn — tránh spam video cũ.
const fs = require('node:fs');
const path = require('node:path');
const { writeJsonAtomic, readJson } = require('./jsonStore');

const FILE = path.join(__dirname, '..', '..', 'data', 'feed-state.json');
const DEFAULT_FEED = 'https://rsshub.app/tiktok/user/phimhayplus38';

function useMongo() {
  try { return require('../db').isMongo(); } catch { return false; }
}
function loadAll() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return readJson(FILE, {});
  } catch { return {}; }
}

function parseFeed(xml) {
  const items = [];
  const s = String(xml || '');
  const blocks = s.split(/<item[\s>]/).slice(1);
  if (!blocks.length) {
    // Atom
    for (const b of s.split(/<entry[\s>]/).slice(1)) {
      const link = (b.match(/<link[^>]*href="([^"]+)"/) || [])[1];
      const id = (b.match(/<id>([^<]+)<\/id>/) || [])[1] || link;
      const title = (b.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '';
      if (link) items.push({ id: id || link, link, title: cleanTitle(title) });
    }
    return items;
  }
  for (const b of blocks) {
    const link = (b.match(/<link>([^<]+)<\/link>/) || [])[1];
    const guid = (b.match(/<guid[^>]*>([^<]+)<\/guid>/) || [])[1];
    const title = (b.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    if (link) items.push({ id: guid || link, link: link.trim(), title: cleanTitle(title) });
  }
  return items;
}
function cleanTitle(t) {
  return String(t || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim().slice(0, 200);
}

async function getSeen(guildId) {
  if (useMongo()) {
    const { FeedState } = require('../db');
    const doc = await FeedState.findOne({ guildId }).lean().catch(() => null);
    return doc?.seen || null; // null = chưa từng chạy
  }
  const db = loadAll();
  return Object.prototype.hasOwnProperty.call(db, guildId) ? db[guildId] : null;
}
async function setSeen(guildId, seen) {
  const capped = [...new Set(seen)].slice(0, 60);
  if (useMongo()) {
    const { FeedState } = require('../db');
    await FeedState.updateOne({ guildId }, { $set: { seen: capped } }, { upsert: true });
    return;
  }
  const db = loadAll();
  db[guildId] = capped;
  writeJsonAtomic(FILE, db);
}

async function fetchFeed(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RAPTORBot/1.0)', Accept: 'application/rss+xml, application/atom+xml, text/xml' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}

async function checkGuild(client, guildId) {
  const st = await require('./guildSettings').getGuildSettings(guildId).catch(() => null);
  const cfg = st?.socialFeedCfg || {};
  if (!cfg.enabled || !cfg.channelId) return;
  const url = /^https?:\/\//.test(cfg.feedUrl || '') ? cfg.feedUrl : DEFAULT_FEED;
  const xml = await fetchFeed(url);
  const items = parseFeed(xml).slice(0, 20);
  if (!items.length) return;
  const seen = await getSeen(guildId);
  if (seen === null) {
    await setSeen(guildId, items.map((i) => i.id));
    console.log(`[socialFeed] ${guildId}: ghi nhận ${items.length} mục hiện có (lần đầu, không đăng)`);
    return;
  }
  const seenSet = new Set(seen);
  const fresh = items.filter((i) => !seenSet.has(i.id)).slice(0, 3).reverse();
  await setSeen(guildId, [...items.map((i) => i.id), ...seen]);
  if (!fresh.length) return;
  const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
  const ch = guild ? await guild.channels.fetch(cfg.channelId).catch(() => null) : null;
  if (!ch?.isTextBased()) return;
  for (const it of fresh) {
    await ch.send({ content: `🎬 **Video mới trên TikTok!**\n${it.title ? it.title + '\n' : ''}${it.link}`, allowedMentions: { parse: [] } }).catch(() => {});
    require('./activity').record(guildId, 'feed', `Đăng thông báo video TikTok mới: ${it.title || it.link}`).catch(() => {});
  }
  console.log(`[socialFeed] ${guildId}: đã đăng ${fresh.length} video mới`);
}

async function tick(client) {
  for (const guild of client.guilds.cache.values()) {
    try { await checkGuild(client, guild.id); } catch (e) { console.warn('[socialFeed]', guild.id, e?.message); }
  }
}

let started = false;
function startWatcher(client) {
  if (started) return;
  started = true;
  setTimeout(() => tick(client).catch(() => {}), 3 * 60_000);
  setInterval(() => tick(client).catch(() => {}), 10 * 60_000);
  console.log('📣 Đã bật theo dõi video mới (TikTok/RSS, mỗi 10 phút)');
}

module.exports = { parseFeed, checkGuild, tick, startWatcher, DEFAULT_FEED };
