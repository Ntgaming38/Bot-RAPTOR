const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const { Player, GuildQueueEvent } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const { YoutubeiExtractor } = require('discord-player-youtubei');
const ffmpegPath = require('ffmpeg-static');
const config = require('./config');
const { loadCommands } = require('./deploy-commands');

// Tự động chống crash khi chạy 24/24
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));

async function main() {
  if (!config.token) {
    console.error('❌ Chưa có DISCORD_TOKEN. Copy .env.example -> .env rồi dán token vào.');
    process.exit(1);
  }

  if (config.keepAlive) {
    require('./keepAlive').startKeepAlive();
  }

  // Tạo thư mục data/ để lưu level, giveaway, ticket (giữ được khi restart nếu dùng volume)
  for (const d of ['data']) {
    const p = path.join(__dirname, '..', d);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  }

  // Kết nối MongoDB Atlas nếu có MONGODB_URI (giữ XP vĩnh viễn trên Render free)
  try {
    await require('./db').connectDB();
  } catch (e) {
    console.warn('[mongo] bỏ qua, dùng JSON:', e.message);
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildVoiceStates, // BẮT BUỘC cho nhạc
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.GuildMember, Partials.Message, Partials.Channel, Partials.Reaction],
  });

  // === PLAYER NHẠC ===
  const player = new Player(client, {
    skipFFmpeg: false,
    ffmpegPath,
  });
  client.player = player;

  await player.extractors.loadMulti(DefaultExtractors).catch(e => console.warn('[extractors]', e.message));
  try {
    await player.extractors.register(YoutubeiExtractor, {
      ...(config.youtubeCookie ? { cookie: config.youtubeCookie } : {}),
    });
    console.log('🎵 YoutubeiExtractor đã sẵn sàng');
  } catch (e) {
    console.warn('[youtubei] Không load được YouTube extractor (vẫn phát được SoundCloud/link trực tiếp):', e.message);
  }

  player.events.on(GuildQueueEvent.PlayerStart, (queue, track) => {
    queue.metadata?.channel?.send(`▶️ Đang phát: **${track.cleanTitle || track.title}** — yêu cầu bởi ${track.requestedBy}`).catch(() => {});
  });
  player.events.on(GuildQueueEvent.PlayerError, (queue, error) => {
    console.error('[PlayerError]', error?.message);
    queue.metadata?.channel?.send('❌ Lỗi phát nhạc, bỏ qua bài này.').catch(() => {});
  });
  player.events.on(GuildQueueEvent.Error, (queue, error) => {
    console.error('[QueueError]', error?.message);
  });
  player.events.on(GuildQueueEvent.Empty, (queue) => {
    queue.metadata?.channel?.send('📭 Hết nhạc trong hàng chờ, bot sẽ ở lại 60s rồi out.').catch(() => {});
  });

  client.commands = new Collection();
  const commands = await loadCommands();
  for (const cmd of commands) {
    client.commands.set(cmd.data.name, cmd);
  }
  console.log(`📦 Đã load ${commands.length} lệnh: ${commands.map(c => c.data.name).join(', ')}`);

  // Load events: src/events/<tenEvent>.js — mỗi file export { name, once, execute }
  const eventsPath = path.join(__dirname, 'events');
  if (fs.existsSync(eventsPath)) {
    for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
      const event = require(path.join(eventsPath, file));
      if (!event?.name || !event?.execute) {
        console.warn(`[WARN] Event ${file} thiếu "name" hoặc "execute".`);
        continue;
      }
      if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
      else client.on(event.name, (...args) => event.execute(...args, client));
      console.log(`🎧 Đã load event: ${event.name} (${file})`);
    }
  }

  // Log lỗi gateway để không bị treo mù như trước
  client.on('error', (e) => console.error('[discord error]', e?.message));
  client.on('shardError', (e) => console.error('[shardError]', e?.message));
  client.on('shardDisconnect', (e) => console.warn('[shardDisconnect]', e?.code, e?.reason));
  client.on('shardReconnecting', () => console.log('[shardReconnecting] đang nối lại Discord...'));
  client.on('warn', (m) => console.warn('[discord warn]', m));

  // Khôi phục giveaway đang dở sau khi restart (24/24)
  try {
    require('./utils/giveaways').restoreAll(client);
  } catch (e) {
    console.warn('[giveaway restore]', e.message);
  }

  console.log(`[login] thử đăng nhập... token length=${config.token?.length || 0}, clientId=${config.token ? 'có' : 'thiếu'}`);
  // Retry login: Render free đôi khi kẹt handshake, treo 30p không xong cũng không fail.
  // Timeout 45s/lần, thử 5 lần, fail hết thì exit để Render restart sạch.
  let loggedIn = false;
  for (let attempt = 1; attempt <= 5 && !loggedIn; attempt++) {
    try {
      console.log(`[login] lần ${attempt}/5...`);
      await Promise.race([
        client.login(config.token),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout 45s')), 45000)),
      ]);
      loggedIn = true;
      console.log('[login] login promise xong, đợi event ready...');
    } catch (e) {
      console.error(`[login FAILED lần ${attempt}]`, e?.message, e?.code, e?.status);
      try { await client.destroy(); } catch {}
      if (attempt < 5) {
        console.log('[login] đợi 10s thử lại...');
        await new Promise(r => setTimeout(r, 10000));
      } else {
        console.error('[login] thua 5 lần, exit để Render restart.');
        process.exit(1);
      }
    }
  }
}

main().catch(e => {
  console.error('[main FAILED]', e?.message);
  process.exit(1);
});
