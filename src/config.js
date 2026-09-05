require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,

  welcomeChannelId: process.env.WELCOME_CHANNEL_ID || null,
  goodbyeChannelId: process.env.GOODBYE_CHANNEL_ID || null,
  autoRoleId: process.env.AUTO_ROLE_ID || null,
  logChannelId: process.env.LOG_CHANNEL_ID || null,

  bannedWords: (process.env.BANNED_WORDS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean),

  // === CHÀO MỪNG (kiểu mẫu trong hình) ===
  welcomeTitle: process.env.WELCOME_TITLE || null, // VD: By GIN.G_VN — để trống = tên server
  welcomeRoleChannelId: process.env.WELCOME_ROLE_CHANNEL_ID || null, // kênh chọn role ✅
  welcomeRulesChannelId: process.env.WELCOME_RULES_CHANNEL_ID || null, // kênh luật
  welcomeAnnounceChannelId: process.env.WELCOME_ANNOUNCE_CHANNEL_ID || null, // kênh thông báo
  welcomeChatChannelId: process.env.WELCOME_CHAT_CHANNEL_ID || null, // kênh chat chung
  welcomeImageUrl: process.env.WELCOME_IMAGE_URL || null, // ảnh thumbnail góc phải — để trống = avatar member
  welcomeReactions: (process.env.WELCOME_REACTIONS || '🔥,✅').split(',').map(s => s.trim()).filter(Boolean),
  welcomeColor: process.env.WELCOME_COLOR || '#FF4D9D',
  keepAlive: process.env.KEEP_ALIVE === 'true',
  port: parseInt(process.env.PORT || '3000', 10),
  embedColor: process.env.EMBED_COLOR || '#5865F2',

  // === NHẠC ===
  // Cookie YouTube (tùy chọn nhưng NÊN có để phát YouTube ổn định).
  // Cách lấy: đăng nhập youtube.com → F12 → Application → Cookies → copy giá trị.
  // Có thể để trống, bot vẫn phát được SoundCloud / link trực tiếp.
  youtubeCookie: process.env.YOUTUBE_COOKIE || null,
  maxVolume: parseInt(process.env.MAX_VOLUME || '100', 10),

  // === LEVEL ===
  levelUpMessage: process.env.LEVEL_UP_MESSAGE !== 'false', // true = báo khi lên level
  xpMin: parseInt(process.env.XP_MIN || '15', 10),
  xpMax: parseInt(process.env.XP_MAX || '25', 10),
  xpCooldownSec: parseInt(process.env.XP_COOLDOWN || '60', 10),

  // === TICKET ===
  ticketCategoryId: process.env.TICKET_CATEGORY_ID || null,
  ticketStaffRoleId: process.env.TICKET_STAFF_ROLE_ID || null,
  ticketPanelImageUrl: process.env.TICKET_PANEL_IMAGE_URL || null, // ảnh góc phải của panel (kiểu hình gấu trong mẫu)

  // === DATABASE (giữ XP/giveaway/ticket khi Render restart) ===
  // Để trống = dùng file JSON cũ trong data/. Có MONGODB_URI = dùng MongoDB Atlas.
  mongodbUri: process.env.MONGODB_URI || null,
};
