const { addWarn } = require('./warns');

// Bộ nhớ chống spam (theo guild:user, tự xóa cũ)
const buckets = new Map();

function getAutomod(st) {
  const a = (st && st.automod) || {};
  return {
    words: a.words !== false,
    invites: !!a.invites,
    links: !!a.links,
    spam: !!a.spam,
    spamCount: Math.min(20, Math.max(2, parseInt(a.spamCount, 10) || 5)),
    spamSecs: Math.min(60, Math.max(2, parseInt(a.spamSecs, 10) || 5)),
    action: ['delete', 'warn', 'timeout'].includes(a.action) ? a.action : 'delete',
    timeoutMin: Math.min(40320, Math.max(1, parseInt(a.timeoutMin, 10) || 10)),
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

// Trả về null nếu sạch, hoặc { rule, matched }
async function checkAutomod(message, st, bannedWords) {
  const am = getAutomod(st);
  if (isExempt(message, am)) return null;
  const content = message.content || '';

  if (am.words && bannedWords?.length) {
    const low = content.toLowerCase();
    const found = bannedWords.find((w) => w && low.includes(w));
    if (found) return { rule: 'words', matched: found };
  }
  if (am.invites && /discord(?:\.gg|\.com\/invite)\/\S+/i.test(content)) {
    return { rule: 'invites', matched: 'link invite Discord' };
  }
  if (am.links && /https?:\/\//i.test(content)) {
    return { rule: 'links', matched: 'link' };
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
  return null;
}

const RULE_LABEL = { words: 'từ cấm', invites: 'gửi invite', links: 'gửi link', spam: 'spam' };

async function punishAutomod(message, st, violation) {
  const am = getAutomod(st);
  await message.delete().catch(() => {});
  const label = RULE_LABEL[violation.rule] || violation.rule;
  if (am.action === 'warn') {
    try {
      await addWarn(message.guildId, message.author.id, 'automod', 'AutoMod', `Vi phạm: ${label}`);
    } catch {}
  } else if (am.action === 'timeout') {
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
      `🤖 AutoMod xóa tin của ${message.author.tag} trong ${message.channel} (vi phạm: ${label}${am.action !== 'delete' ? `, phạt: ${am.action}` : ''})`,
      (message.content || '').slice(0, 1000)
    );
  } catch {}
}

module.exports = { getAutomod, checkAutomod, punishAutomod };
