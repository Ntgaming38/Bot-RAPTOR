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

module.exports = { mongoose, connectDB, isMongo, Level, Giveaway, Ticket, TicketRating };
