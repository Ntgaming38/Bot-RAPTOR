const { addWarn } = require('./warns');

// Bộ nhớ chống spam (theo guild:user, tự xóa cũ)
const buckets = new Map();

const ACTIONS = ['delete', 'warn', 'timeout'];
const RULES = ['words', 'invites', 'links', 'spam', 'caps', 'mentions'];

function getAutomod(st) {
  const a = (st && st.automod) || {};
  const actions = {};
  for (const r of RULES) {
    const v = a.actions?.[r];
    actions[r] = ACTIONS.includes(v) ? v : (ACTIONS.includes(a.action) ? a.action : 'delete');
  }
  return {
    words: a.words !== false,
    wholeWord: !!a.wholeWord,
    invites: !!a.invites,
    links: !!a.links,
    spam: !!a.spam,
    spamCount: Math.min(20, Math.max(2, parseInt(a.spamCount, 10) || 5)),
    spamSecs: Math.min(60, Math.max(2, parseInt(a.spamSecs, 10) || 5)),
    caps: !!a.caps,
    capsPercent: Math.min(100, Math.max(30, parseInt(a.capsPercent, 10) || 70)),
    capsMinLen: Math.min(200, Math.max(4, parseInt(a.capsMinLen, 10) || 10)),
    mentions: !!a.mentions,
    mentionCount: Math.min(50, Math.max(2, parseInt(a.mentionCount, 10) || 5)),
    action: ACTIONS.includes(a.action) ? a.action : 'delete',
    actions,
    timeoutMin: Math.min(40320, Math.max(1, parseInt(a.timeoutMin, 10) || 10)),
    urlWhitelist: Array.isArray(a.urlWhitelist) ? a.urlWhitelist : [],
    urlBlacklist: Array.isArray(a.urlBlacklist) ? a.urlBlacklist : [],
    onlyImageChannels: Array.isArray(a.onlyImageChannels) ? a.onlyImageChannels : [],
    onlyYoutubeChannels: Array.isArray(a.onlyYoutubeChannels) ? a.onlyYoutubeChannels : [],
    exemptChannels: Array.isArray(a.exemptChannels) ? a.exemptChannels : [],
    exemptRoles: Array.isArray(a.exemptRoles) ? a.exemptRoles : [],
  };
}

function isExempt(message, am) {
  if (am.exemptChannels.includes(message.channelId)) return true;
  try {
    for (const r of am.exemptRoles) {
      if (message.member?.roles?.cache?.has(r)) return true;
    }
  } catch {}
  return false;
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function urlMatches(content, entry) {
  const e = String(entry || '').trim().toLowerCase();
  if (!e) return false;
  return content.toLowerCase().includes(e);
}

function hasYoutubeLink(content) {
  return /(?:youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts\/)/i.test(content || '');
}

function hasMedia(message) {
  if (message.attachments?.size > 0) return true;
  const embeds = message.embeds || [];
  return embeds.some((e) => e && (e.image || e.video || e.thumbnail));
}

// Trả về null nếu sạch, hoặc { rule, matched }
async function checkAutomod(message, st, bannedWords) {
  const am = getAutomod(st);
  if (isExempt(message, am)) return null;
  const content = message.content || '';

  // URL đen: chặn theo danh sách riêng
  if (am.urlBlacklist.length && am.urlBlacklist.some((e) => urlMatches(content, e))) {
    return { rule: 'links', matched: 'URL bị chặn' };
  }
  if (am.words && bannedWords?.length) {
    const low = content.toLowerCase();
    const found = bannedWords.find((w) => {
      if (!w) return false;
      if (am.wholeWord) return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(w)}([^\\p{L}\\p{N}]|$)`, 'iu').test(low);
      return low.includes(w);
    });
    if (found) return { rule: 'words', matched: found };
  }
  if (am.invites && /discord(?:\.gg|\.com\/invite)\/\S+/i.test(content)) {
    return { rule: 'invites', matched: 'link invite Discord' };
  }
  if (am.links && /https?:\/\//i.test(content)) {
    const whitelisted = am.urlWhitelist.length && am.urlWhitelist.some((e) => urlMatches(content, e));
    // Trong kênh chỉ-YouTube, link YouTube là nội dung hợp lệ
    const ytOk = am.onlyYoutubeChannels.includes(message.channelId) && hasYoutubeLink(content);
    if (!whitelisted && !ytOk) return { rule: 'links', matched: 'link' };
  }
  if (am.caps) {
    const letters = content.replace(/[^A-Za-zÀ-ỹ]/g, '');
    if (letters.length >= am.capsMinLen) {
      const upper = letters.replace(/[^A-ZÀ-Ỹ]/g, '').length;
      if (upper / letters.length * 100 >= am.capsPercent) {
        return { rule: 'caps', matched: `${Math.round(upper / letters.length * 100)}% viết hoa` };
      }
    }
  }
  if (am.mentions) {
    const count = message.mentions?.users?.size ?? (content.match(/<@!?\d+>/g) || []).length;
    if (count >= am.mentionCount) return { rule: 'mentions', matched: `tag ${count} người` };
  }
  if (am.spam) {
    const key = `${message.guildId}:${message.author.id}`;
    const now = Date.now();
    const arr = (buckets.get(key) || []).filter((t) => now - t < am.spamSecs * 1000);
    arr.push(now);
    buckets.set(key, arr);
    if (arr.length > am.spamCount) {
      buckets.set(key, []);
      return { rule: 'spam', matched: `${arr.length} tin/${am.spamSecs}s` };
    }
  }
  // Kênh chuyên biệt: chỉ ảnh / chỉ YouTube
  if (am.onlyImageChannels.includes(message.channelId) && !hasMedia(message)) {
    return { rule: 'media', matched: 'kênh chỉ đăng ảnh/video' };
  }
  if (am.onlyYoutubeChannels.includes(message.channelId) && !hasYoutubeLink(content)) {
    return { rule: 'media', matched: 'kênh chỉ đăng link YouTube' };
  }
  return null;
}

const RULE_LABEL = {
  words: 'từ cấm',
  invites: 'gửi invite',
  links: 'gửi link',
  spam: 'spam',
  caps: 'viết hoa quá mức',
  mentions: 'tag quá nhiều người',
  media: 'sai loại nội dung của kênh',
};

async function punishAutomod(message, st, violation) {
  const am = getAutomod(st);
  await message.delete().catch(() => {});
  const label = RULE_LABEL[violation.rule] || violation.rule;
  // Vi phạm loại kênh (media) chỉ xóa, không warn/timeout
  const action = violation.rule === 'media' ? 'delete' : (am.actions[violation.rule] || am.action);
  if (action === 'warn') {
    try {
      await addWarn(message.guildId, message.author.id, 'automod', 'AutoMod', `Vi phạm: ${label}`);
    } catch {}
  } else if (action === 'timeout') {
    try {
      if (message.member?.moderatable) {
        await message.member.timeout(am.timeoutMin * 60 * 1000, `AutoMod: ${label}`);
      }
    } catch {}
  }
  const warn = await message.channel.send(
    `⚠️ ${message.author}, tin nhắn của bạn bị xóa (vi phạm: **${label}**).`
  ).catch(() => null);
  if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);
  try {
    require('./logger').logMod(
      message.guild,
      `🤖 AutoMod xóa tin của ${message.author.tag} trong ${message.channel} (vi phạm: ${label}${action !== 'delete' ? `, phạt: ${action}` : ''})`,
      (message.content || '').slice(0, 1000)
    );
  } catch {}
}

module.exports = { getAutomod, checkAutomod, punishAutomod };
