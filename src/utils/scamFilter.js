// Lọc link lừa đảo: nhận diện domain giả mạo Discord / Steam / Nitro trong tin nhắn.
// Domain hợp lệ (discord.com, steamcommunity.com...) không bao giờ bị chặn.
const LEGIT = ['discord.com', 'discord.gg', 'discordapp.com', 'discordapp.net', 'discordcdn.com', 'steamcommunity.com', 'steampowered.com', 'store.steampowered.com', 'youtube.com', 'youtu.be', 'google.com', 'facebook.com', 'tiktok.com', 'twitch.tv', 'github.com'];

// Mảnh chữ ký của domain giả mạo (typosquat / ghép chữ dụ bấm)
const BAD_PARTS = [
  'dliscord', 'discrod', 'disocrd', 'dicsord', 'discorb', 'discodr',
  'discord-nitro', 'nitro-discord', 'discordnitro', 'nitrodiscord', 'freenitro', 'nitro-free',
  'discord-gift', 'discordgift', 'gift-discord', 'discordgifts', 'discord-airdrop', 'airdrop-discord',
  'steamcommunlty', 'steacommunity', 'steamcomunity', 'steamcommunitv', 'steamcommunitu',
  'steam-gift', 'steamgift', 'csgo-free', 'free-skins', 'discordbonus', 'bonus-discord',
];

function extractDomains(text) {
  const out = [];
  const re = /(?:https?:\/\/)?(?:www\.)?([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)/gi;
  let m;
  const s = String(text || '').toLowerCase();
  while ((m = re.exec(s)) !== null) {
    const d = m[1].replace(/\.+$/, '');
    if (d.includes('.')) out.push(d);
  }
  return out;
}

function isLegit(domain) {
  return LEGIT.some((l) => domain === l || domain.endsWith('.' + l));
}

// Trả về domain đáng ngờ đầu tiên tìm thấy, hoặc null.
function findScam(text, extraDomains = []) {
  const extras = (extraDomains || []).map((d) => String(d).toLowerCase().trim()).filter(Boolean);
  for (const domain of extractDomains(text)) {
    if (extras.some((x) => domain === x || domain.endsWith('.' + x))) return domain;
    if (isLegit(domain)) continue;
    if (BAD_PARTS.some((p) => domain.includes(p))) return domain;
    // Mẫu "discord" hoặc "nitro" hoặc "steam" xuất hiện trong domain lạ (không thuộc legit)
    if (/(discord|nitro|steam)/.test(domain) && /(free|gift|bonus|claim|drop|promo|giveaway|skin)/.test(domain)) return domain;
  }
  return null;
}

module.exports = { findScam, extractDomains, isLegit, LEGIT, BAD_PARTS };
