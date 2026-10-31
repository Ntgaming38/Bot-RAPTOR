// Migrate dữ liệu JSON (data/*.json) → MongoDB cho MỌI store có model đích.
// Chạy tay:  node src/migrate-mongo.js [--dry-run]
// - Mặc định: upsert từng bản ghi (chạy lại an toàn, không nhân đôi dữ liệu có khóa unique).
// - --dry-run: chỉ đọc + in đối chiếu số lượng, KHÔNG ghi gì.
// - In bảng đối chiếu nguồn → đích sau khi chạy để người vận hành tự kiểm chứng.
// KHÔNG migrate (in rõ lý do khi chạy): starboard.json (chưa có model Mongo),
// activity.json (feed hoạt động ngắn hạn), health.json + sessions.json (dữ liệu vận hành).
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');

const DRY = process.argv.includes('--dry-run');
const DATA = path.join(__dirname, '..', 'data');
const report = [];

function readData(name) {
  const file = path.join(DATA, name);
  if (!fs.existsSync(file)) return undefined;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { console.warn(`⚠️ ${name}: file hỏng, bỏ qua.`); return undefined; }
}

async function upsert(Model, filter, set) {
  if (DRY) return;
  await Model.updateOne(filter, { $set: set }, { upsert: true });
}

function note(store, srcCount, noteText = '') {
  report.push({ store, srcCount, noteText });
  console.log(`• ${store}: ${srcCount} bản ghi nguồn${noteText ? ` — ${noteText}` : ''}`);
}

// Map guildId → object cấu hình: dùng cho mọi settings store 1-doc/guild.
async function migrateGuildMap(file, Model, label) {
  const db = readData(file);
  if (db === undefined) return note(label, 0, 'không có file');
  let n = 0;
  for (const [guildId, obj] of Object.entries(db)) {
    if (!obj || typeof obj !== 'object') continue;
    const { _id, __v, ...rest } = obj;
    await upsert(Model, { guildId }, { ...rest, guildId });
    n++;
  }
  note(label, n);
}

async function main() {
  const db = require('./db');
  const ok = await db.connectDB();
  if (!ok || !db.isMongo()) {
    console.error('❌ Không kết nối được MongoDB. Kiểm tra MONGODB_URI trong .env');
    process.exit(1);
  }
  console.log(DRY ? '🔍 DRY-RUN — chỉ đối chiếu, không ghi.' : '🚚 Bắt đầu migrate JSON → MongoDB...');
  const {
    Level, SocialProfile, Warn, QuestProgress, Playlist, Reminder, Giveaway,
    TempRole, TempChannel, InviteStat, MusicQueue, FeedState,
    GuildSettings, WelcomeSettings, GoodbyeSettings, LeaderboardSettings,
    LogSettings, AnnounceSettings, StatsSettings, RolePanel, RoleBoard,
    Ticket, TicketCounter, TicketBlacklist, ClosedTicket, TicketRating,
  } = db;

  // 1) Level / XP — giữ nguyên hành vi bản migrate gốc.
  {
    const data = readData('levels.json');
    if (data === undefined) note('Level', 0, 'không có file');
    else {
      let n = 0;
      for (const [guildId, users] of Object.entries(data)) {
        for (const [userId, v] of Object.entries(users || {})) {
          await upsert(Level, { guildId, userId }, { xp: v.xp || 0, level: v.level || 0, lastMsg: v.lastMsg || 0 });
          n++;
        }
      }
      note('Level', n);
    }
  }

  // 2) Economy: social.json { guildId: { userId: profile } }
  {
    const data = readData('social.json');
    if (data === undefined) note('SocialProfile', 0, 'không có file');
    else {
      let n = 0;
      for (const [guildId, users] of Object.entries(data)) {
        for (const [userId, p] of Object.entries(users || {})) {
          await upsert(SocialProfile, { guildId, userId }, {
            rep: p.rep || 0, credits: p.credits || 0, points: p.points || 0,
            lastRepAt: p.lastRepAt || 0, lastRepTo: p.lastRepTo ?? null, lastDailyAt: p.lastDailyAt || 0,
          });
          n++;
        }
      }
      note('SocialProfile', n);
    }
  }

  // 3) Warns: { "guildId:userId": [entries] } → doc { guildId, userId, list }
  {
    const data = readData('warns.json');
    if (data === undefined) note('Warn', 0, 'không có file');
    else {
      let n = 0;
      for (const [k, list] of Object.entries(data)) {
        const i = k.indexOf(':');
        if (i < 0) continue;
        await upsert(Warn, { guildId: k.slice(0, i), userId: k.slice(i + 1) }, { list: Array.isArray(list) ? list : [] });
        n++;
      }
      note('Warn', n);
    }
  }

  // 4) Quests: { "guildId:userId:day": row }
  {
    const data = readData('quests.json');
    if (data === undefined) note('QuestProgress', 0, 'không có file');
    else {
      let n = 0;
      for (const [k, row] of Object.entries(data)) {
        const parts = k.split(':');
        if (parts.length < 3) continue;
        const [guildId, userId, day] = parts;
        await upsert(QuestProgress, { guildId, userId, day }, {
          chat: row.chat || 0, voice: row.voice || 0, daily: !!row.daily, rewarded: row.rewarded || {},
        });
        n++;
      }
      note('QuestProgress', n);
    }
  }

  // 5) Playlists (mảng)
  {
    const rows = readData('playlists.json');
    if (!Array.isArray(rows)) note('Playlist', 0, 'không có file');
    else {
      let n = 0;
      for (const r of rows) {
        if (!r.guildId || !r.userId || !r.name) continue;
        await upsert(Playlist, { guildId: r.guildId, userId: r.userId, name: r.name }, { tracks: r.tracks || [], updatedAt: r.updatedAt || 0 });
        n++;
      }
      note('Playlist', n);
    }
  }

  // 6) Reminders (mảng, không có unique — upsert theo tổ hợp nhận diện)
  {
    const rows = readData('reminders.json');
    if (!Array.isArray(rows)) note('Reminder', 0, 'không có file');
    else {
      let n = 0;
      for (const r of rows) {
        if (!r.guildId || !r.userId || !r.dueAt) continue;
        await upsert(Reminder,
          { guildId: r.guildId, userId: r.userId, dueAt: r.dueAt, text: r.text || '' },
          { channelId: r.channelId || null, done: !!r.done });
        n++;
      }
      note('Reminder', n);
    }
  }

  // 7) Giveaways: { gid: record } (record có field id = gid)
  {
    const data = readData('giveaways.json');
    if (data === undefined) note('Giveaway', 0, 'không có file');
    else {
      let n = 0;
      for (const [gid, g] of Object.entries(data)) {
        await upsert(Giveaway, { gid }, {
          guildId: g.guildId, channelId: g.channelId, messageId: g.messageId,
          prize: g.prize, winnersCount: g.winnersCount || 1, endsAt: g.endsAt,
          entries: g.entries || [], ended: !!g.ended, hostId: g.hostId, hostTag: g.hostTag,
        });
        n++;
      }
      note('Giveaway', n);
    }
  }

  // 8) Temp roles (mảng)
  {
    const rows = readData('temp-roles.json');
    if (!Array.isArray(rows)) note('TempRole', 0, 'không có file');
    else {
      let n = 0;
      for (const r of rows) {
        if (!r.guildId || !r.userId || !r.roleId || !r.expiresAt) continue;
        await upsert(TempRole, { guildId: r.guildId, userId: r.userId, roleId: r.roleId, expiresAt: r.expiresAt }, { byTag: r.byTag || null });
        n++;
      }
      note('TempRole', n);
    }
  }

  // 9) Temp voice (mảng rows)
  {
    const rows = readData('temp-voice.json');
    if (!Array.isArray(rows)) note('TempChannel', 0, 'không có file');
    else {
      let n = 0;
      for (const r of rows) {
        if (!r.channelId) continue;
        await upsert(TempChannel, { channelId: r.channelId }, { guildId: r.guildId, ownerId: r.ownerId });
        n++;
      }
      note('TempChannel', n);
    }
  }

  // 10) Invite stats: { guildId: { userId: { total, byCode } } }
  {
    const data = readData('invite-stats.json');
    if (data === undefined) note('InviteStat', 0, 'không có file');
    else {
      let n = 0;
      for (const [guildId, users] of Object.entries(data)) {
        for (const [userId, s] of Object.entries(users || {})) {
          await upsert(InviteStat, { guildId, userId }, { total: s.total || 0, byCode: s.byCode || {} });
          n++;
        }
      }
      note('InviteStat', n);
    }
  }

  // 11) Music queues: { guildId: snapshot }
  {
    const data = readData('music-queues.json');
    if (data === undefined) note('MusicQueue', 0, 'không có file');
    else {
      let n = 0;
      for (const [guildId, s] of Object.entries(data)) {
        await upsert(MusicQueue, { guildId }, {
          voiceChannelId: s.voiceChannelId || null, textChannelId: s.textChannelId || null,
          volume: s.volume ?? null, current: s.current || null, tracks: s.tracks || [], ts: s.ts || 0,
        });
        n++;
      }
      note('MusicQueue', n);
    }
  }

  // 12) Feed state: JSON lưu { guildId: [seenIds] } (Mongo bọc trong { seen })
  {
    const data = readData('feed-state.json');
    if (data === undefined) note('FeedState', 0, 'không có file');
    else {
      let n = 0;
      for (const [guildId, v] of Object.entries(data)) {
        const seen = Array.isArray(v) ? v : (v?.seen || []);
        await upsert(FeedState, { guildId }, { seen });
        n++;
      }
      note('FeedState', n);
    }
  }

  // 13) Các settings store theo guild
  await migrateGuildMap('guild-settings.json', GuildSettings, 'GuildSettings');
  await migrateGuildMap('welcome.json', WelcomeSettings, 'WelcomeSettings');
  await migrateGuildMap('goodbye.json', GoodbyeSettings, 'GoodbyeSettings');
  await migrateGuildMap('leaderboard.json', LeaderboardSettings, 'LeaderboardSettings');
  await migrateGuildMap('log-settings.json', LogSettings, 'LogSettings');
  await migrateGuildMap('announce.json', AnnounceSettings, 'AnnounceSettings');
  await migrateGuildMap('stats.json', StatsSettings, 'StatsSettings');
  await migrateGuildMap('roles.json', RolePanel, 'RolePanel (legacy)');

  // 14) Role boards: { guildId: { boardId: board } } — khóa unique đích là (guildId, name)
  {
    const data = readData('role-boards.json');
    if (data === undefined) note('RoleBoard', 0, 'không có file');
    else {
      let n = 0;
      for (const [guildId, boards] of Object.entries(data)) {
        for (const [, b] of Object.entries(boards || {})) {
          if (!b?.name) continue;
          const { _id, id, ...rest } = b;
          await upsert(RoleBoard, { guildId, name: b.name }, { ...rest, guildId });
          n++;
        }
      }
      note('RoleBoard', n);
    }
  }

  // 15) Tickets đang mở: { channelId: ticket }
  {
    const data = readData('tickets.json');
    if (data === undefined) note('Ticket', 0, 'không có file');
    else {
      let n = 0;
      for (const [channelId, t] of Object.entries(data)) {
        const { _id, __v, ...rest } = t || {};
        await upsert(Ticket, { channelId }, { ...rest, channelId });
        n++;
      }
      note('Ticket', n);
    }
  }

  // 16) Ticket counter: { guildId: seq } — chỉ nâng lên, không hạ thấp seq hiện có
  {
    const data = readData('ticket-counter.json');
    if (data === undefined) note('TicketCounter', 0, 'không có file');
    else {
      let n = 0;
      for (const [guildId, seq] of Object.entries(data)) {
        if (!DRY) {
          await TicketCounter.updateOne(
            { guildId },
            [{ $set: { seq: { $max: [{ $ifNull: ['$seq', 0] }, Number(seq) || 0] } } }],
            { upsert: true },
          );
        }
        n++;
      }
      note('TicketCounter', n);
    }
  }

  // 17) Ticket blacklist: { guildId: [ { userId, ... } ] }
  {
    const data = readData('ticket-blacklist.json');
    if (data === undefined) note('TicketBlacklist', 0, 'không có file');
    else {
      let n = 0;
      for (const [guildId, list] of Object.entries(data)) {
        for (const e of (Array.isArray(list) ? list : [])) {
          if (!e?.userId) continue;
          await upsert(TicketBlacklist, { guildId, userId: e.userId }, { reason: e.reason || null, by: e.by || null, at: e.at || 0 });
          n++;
        }
      }
      note('TicketBlacklist', n);
    }
  }

  // 18) Closed tickets (mảng, upsert theo guildId + number + closedAt)
  {
    const rows = readData('closed-tickets.json');
    if (!Array.isArray(rows)) note('ClosedTicket', 0, 'không có file');
    else {
      let n = 0;
      for (const r of rows) {
        if (!r.guildId) continue;
        const { _id, __v, ...rest } = r;
        await upsert(ClosedTicket, { guildId: r.guildId, number: r.number || 0, closedAt: r.closedAt || 0 }, rest);
        n++;
      }
      note('ClosedTicket', n);
    }
  }

  // 19) Ticket ratings → model TicketRating hiện tại CHỈ có { userId (unique), stars, at }
  // nên migrate bị MẤT ngữ cảnh guild/channel: lấy bản ghi MỚI NHẤT theo từng user.
  {
    const data = readData('ticket-ratings.json');
    if (data === undefined) note('TicketRating', 0, 'không có file');
    else {
      const byUser = new Map();
      for (const r of Object.values(data)) {
        if (!r?.userId) continue;
        const prev = byUser.get(r.userId);
        if (!prev || (r.at || 0) > (prev.at || 0)) byUser.set(r.userId, r);
      }
      for (const [userId, r] of byUser) {
        await upsert(TicketRating, { userId }, { stars: r.stars || 0, at: r.at || 0 });
      }
      note('TicketRating', byUser.size, `từ ${Object.keys(data).length} bản ghi JSON — MẤT ngữ cảnh guild/channel do schema đích (xem ghi chú đầu file migrate)`);
    }
  }

  console.log('\n📋 BẢNG ĐỐI CHIẾU (số bản ghi nguồn đã xử lý):');
  for (const r of report) console.log(`  - ${r.store}: ${r.srcCount}`);
  console.log('⏭️ Bỏ qua theo thiết kế: starboard.json (chưa có model), activity.json (ngắn hạn), health.json, sessions.json (vận hành).');
  console.log(DRY ? '🔍 DRY-RUN xong — chưa ghi gì vào Mongo.' : '✅ Migrate xong. Kiểm chứng: so số bản ghi ở các collection chính với bảng trên (vd Level, SocialProfile, Ticket).');
  process.exit(0);
}

main().catch((e) => { console.error('❌ Migrate lỗi:', e); process.exit(1); });
