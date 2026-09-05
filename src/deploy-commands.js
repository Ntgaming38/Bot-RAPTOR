const fs = require('node:fs');
const path = require('node:path');
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

  for (const file of walk(commandsPath)) {
    delete require.cache[require.resolve(file)];
    const cmd = require(file);
    if (cmd?.data && cmd?.execute) {
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
  }
}

if (require.main === module) deploy();

module.exports = { loadCommands, deploy };
