const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { REST, Routes } = require('discord.js');
const config = require('./config');

async function loadCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsPath)) return commands;

  // Đọc đệ quy: src/commands/<nhóm>/<file>.js
  // Muốn thêm chức năng mới: chỉ cần tạo file mới trong src/commands/ là tự load
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) return walk(p);
    if (ent.isFile() && ent.name.endsWith('.js')) return [p];
    return [];
  });

  const seen = new Map();
  for (const file of walk(commandsPath)) {
    let cmd;
    try {
      delete require.cache[require.resolve(file)];
      cmd = require(file);
    } catch (e) {
      // Cách ly lỗi: 1 file lệnh hỏng KHÔNG được làm sập toàn bộ bot.
      console.error(`[ERROR] Không nạp được lệnh ${file}: ${e?.message || e} — bỏ qua file này.`);
      continue;
    }
    if (cmd?.data && cmd?.execute) {
      const name = cmd.data.name;
      if (seen.has(name)) {
        console.error(`[ERROR] Trùng tên lệnh "${name}": ${file} trùng với ${seen.get(name)} — bỏ qua bản trùng (giữ bản đầu).`);
        continue;
      }
      seen.set(name, file);
      commands.push(cmd);
    } else {
      console.warn(`[WARN] Lệnh ${file} thiếu "data" hoặc "execute", bỏ qua.`);
    }
  }
  return commands;
}

async function deploy() {
  if (!config.token || !config.clientId) {
    console.error('❌ Thiếu DISCORD_TOKEN hoặc CLIENT_ID trong .env');
    process.exit(1);
  }
  const commands = await loadCommands();
  const body = commands.map(c => c.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    console.log(`🔄 Đang đăng ký ${body.length} lệnh slash...`);
    if (config.guildId) {
      // Deploy theo server: hiện lệnh NGAY LẬP TỨC (dùng lúc dev/test)
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
      console.log(`✅ Đã deploy ${body.length} lệnh cho guild ${config.guildId}`);
    } else {
      // Deploy toàn cục: mất tới ~1h để hiện trên mọi server
      await rest.put(Routes.applicationCommands(config.clientId), { body });
      console.log(`✅ Đã deploy ${body.length} lệnh toàn cục`);
    }
  } catch (err) {
    console.error('❌ Deploy lệnh thất bại:', err);
    process.exitCode = 1;
  }
}

async function clearGuildCommands() {
  if (!config.token || !config.clientId || !config.guildId) {
    console.error('❌ Cần DISCORD_TOKEN, CLIENT_ID, GUILD_ID trong .env để xóa lệnh guild cũ.');
    process.exit(1);
  }
  const rest = new REST({ version: '10' }).setToken(config.token);
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: [] });
  console.log(`🧹 Đã xóa toàn bộ lệnh guild ${config.guildId} (để tránh trùng sau khi lên global).`);
}

// === TỰ ĐĂNG KÝ LỆNH KHI KHỞI ĐỘNG ===
// Trước đây lệnh slash chỉ được đăng ký khi chạy tay file này, nên mọi lệnh
// thêm sau lần chạy tay cuối đều "vô hình" trên Discord (điển hình: /ai và
// /stats board bị thiếu). Nay bot tự đăng ký lúc boot — nhưng CHỈ khi bộ lệnh
// thay đổi: hash của bộ lệnh được lưu ở data/deployed-commands.json, trùng
// hash thì bỏ qua để không đốt giới hạn API của Discord mỗi lần restart.
// Hàm này KHÔNG bao giờ ném lỗi: đăng ký hỏng thì bot vẫn chạy, lần boot sau
// hash vẫn lệch nên sẽ tự thử lại.
const HASH_FILE = path.join(__dirname, '..', 'data', 'deployed-commands.json');

function commandsHash(scope, body) {
  return crypto.createHash('sha256').update(JSON.stringify({ scope, body })).digest('hex');
}

async function deployIfChanged(loaded, opts = {}) {
  try {
    if (!config.token || !config.clientId) {
      console.warn('[deploy] Thiếu DISCORD_TOKEN/CLIENT_ID — bỏ qua tự đăng ký lệnh.');
      return { deployed: false, reason: 'no-config' };
    }
    const commands = loaded || (await loadCommands());
    const body = commands.map((c) => c.data.toJSON());
    const scope = config.guildId ? `guild:${config.guildId}` : 'global';
    const hash = commandsHash(scope, body);
    const hashFile = opts.hashFile || HASH_FILE;
    let prev = null;
    try { prev = JSON.parse(fs.readFileSync(hashFile, 'utf8')).hash; } catch {}
    if (prev === hash && !opts.force) {
      console.log('⏭️ [deploy] Bộ lệnh slash không đổi — bỏ qua đăng ký lại.');
      return { deployed: false, reason: 'unchanged', hash };
    }
    const rest = opts.rest || new REST({ version: '10' }).setToken(config.token);
    if (config.guildId) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), { body });
    }
    try {
      fs.mkdirSync(path.dirname(hashFile), { recursive: true });
      fs.writeFileSync(hashFile, JSON.stringify({ hash, scope, count: body.length, at: new Date().toISOString() }, null, 2));
    } catch {}
    console.log(`✅ [deploy] Đã tự đăng ký ${body.length} lệnh slash (${scope}).`);
    return { deployed: true, hash };
  } catch (err) {
    console.error('[deploy] Tự đăng ký lệnh thất bại (bot vẫn chạy, sẽ thử lại ở lần boot sau):', err?.message || err);
    return { deployed: false, reason: 'error' };
  }
}

if (require.main === module) {
  if (process.argv.includes('--clear-guild')) clearGuildCommands().catch(e => console.error('❌ Xóa lệnh guild thất bại:', e));
  else deploy();
}

module.exports = { loadCommands, deploy, clearGuildCommands, deployIfChanged, commandsHash };
