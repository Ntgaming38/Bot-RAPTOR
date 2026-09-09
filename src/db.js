const mongoose = require('mongoose');
const config = require('./config');

function isMongo() {
  return mongoose.connection.readyState === 1;
}

async function connectDB() {
  if (!config.mongodbUri) {
    console.log('📁 Không có MONGODB_URI → dùng file JSON trong data/ (mất khi Render restart).');
    return false;
  }
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('🍃 Đã kết nối MongoDB Atlas (giữ XP/giveaway/ticket vĩnh viễn).');
    return true;
  } catch (e) {
    console.error('❌ Kết nối MongoDB thất bại, fallback về JSON:', e.message);
    return false;
  }
}

// === Level ===
const levelSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  lastMsg: { type: Number, default: 0 },
}, { timestamps: false });
levelSchema.index({ guildId: 1, userId: 1 }, { unique: true });
const Level = mongoose.models.Level || mongoose.model('Level', levelSchema);

// === Giveaway ===
const giveawaySchema = new mongoose.Schema({
  gid: { type: String, required: true, unique: true },
  guildId: String,
  channelId: String,
  messageId: String,
  prize: String,
  winnersCount: { type: Number, default: 1 },
  endsAt: Number,
  entries: { type: [String], default: [] },
  ended: { type: Boolean, default: false },
  hostId: String,
  hostTag: String,
});
const Giveaway = mongoose.models.Giveaway || mongoose.model('Giveaway', giveawaySchema);

// === Ticket ===
const ticketSchema = new mongoose.Schema({
  channelId: { type: String, required: true, unique: true },
  ownerId: String,
  ownerTag: String,
  guildId: String,
  type: String,
  typeLabel: String,
  reason: String,
  createdAt: Number,
  claimedBy: String,
  claimedTag: String,
});
const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);

const ratingSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  stars: Number,
  at: Number,
});
const TicketRating = mongoose.models.TicketRating || mongoose.model('TicketRating', ratingSchema);

// === Welcome settings theo server (setup bằng /welcome setup trong Discord) ===
const welcomeSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, default: null },
  title: { type: String, default: null },
  roleChannelId: { type: String, default: null },
  rulesChannelId: { type: String, default: null },
  announceChannelId: { type: String, default: null },
  chatChannelId: { type: String, default: null },
  imageUrl: { type: String, default: null },
  color: { type: String, default: null },
  reactions: { type: [String], default: undefined },
  autoRoleId: { type: String, default: null },
});
const WelcomeSettings = mongoose.models.WelcomeSettings || mongoose.model('WelcomeSettings', welcomeSettingsSchema);

// === Leaderboard channel riêng (tự cập nhật BXH vào 1 kênh) ===
const leaderboardSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, default: null },
  messageId: { type: String, default: null },
  limit: { type: Number, default: 10 },
});
const LeaderboardSettings = mongoose.models.LeaderboardSettings || mongoose.model('LeaderboardSettings', leaderboardSettingsSchema);

// === Cài đặt chung theo server (dashboard chỉnh: XP, từ cấm, log, ticket) ===
const guildSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  xpMin: Number,
  xpMax: Number,
  xpCooldownSec: Number,
  levelUpMessage: Boolean,
  bannedWords: { type: [String], default: undefined },
  logChannelId: { type: String, default: null },
  ticketCategoryId: { type: String, default: null },
  ticketStaffRoleId: { type: String, default: null },
  ticketPanelImageUrl: { type: String, default: null },
});
const GuildSettings = mongoose.models.GuildSettings || mongoose.model('GuildSettings', guildSettingsSchema);

// === Bảng thông báo ghim (xoay nhiều tin theo phút) ===
const announceSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, default: null },
  messageId: { type: String, default: null },
  title: { type: String, default: null },
  text: { type: String, default: null },
  intervalMin: { type: Number, default: 0 },
  idx: { type: Number, default: 0 },
  lastRotated: { type: Number, default: 0 },
});
const AnnounceSettings = mongoose.models.AnnounceSettings || mongoose.model('AnnounceSettings', announceSettingsSchema);

// === Kênh trạng thái server (tự đổi tên theo số liệu) ===
const statsSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  voiceChannelId: { type: String, default: null },
  template: { type: String, default: null },
});
const StatsSettings = mongoose.models.StatsSettings || mongoose.model('StatsSettings', statsSettingsSchema);

// === Bảng chọn role (button role, admin tự thêm role) ===
const rolePanelSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, default: null },
  messageId: { type: String, default: null },
  title: { type: String, default: null },
  description: { type: String, default: null },
  items: { type: [{ roleId: String, label: String, emoji: String }], default: [] },
});
const RolePanel = mongoose.models.RolePanel || mongoose.model('RolePanel', rolePanelSchema);

module.exports = { mongoose, connectDB, isMongo, Level, Giveaway, Ticket, TicketRating, WelcomeSettings, LeaderboardSettings, GuildSettings, AnnounceSettings, StatsSettings, RolePanel };
