const fs = require('node:fs');
const path = require('node:path');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embed } = require('./embeds');

const FILE = path.join(__dirname, '..', '..', 'data', 'giveaways.json');
const timers = new Map();

function load() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch { return {}; }
}
function save(db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

function parseDuration(str) {
  // Hỗ trợ: 30s, 10m, 2h, 1d  (VD: "10m", "1h30m")
  const m = String(str).trim().toLowerCase().match(/^(?:(\d+)\s*d)?\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?$/);
  if (!m || m[0] === '') return null;
  const d = parseInt(m[1] || '0', 10), h = parseInt(m[2] || '0', 10);
  const min = parseInt(m[3] || '0', 10), s = parseInt(m[4] || '0', 10);
  const ms = (((d * 24 + h) * 60 + min) * 60 + s) * 1000;
  return ms > 0 && ms <= 30 * 24 * 3600 * 1000 ? ms : null;
}

function giveawayEmbed(g) {
  const ends = Math.floor(g.endsAt / 1000);
  return embed({
    title: '🎉 GIVEAWAY 🎉',
    description: `**Giải thưởng: ${g.prize}**\n👥 Số người thắng: **${g.winnersCount}**\n⏰ Kết thúc: <t:${ends}:R> (<t:${ends}:F>)\n🎟️ Tham gia: **${g.entries.length}** người\n\nNhấn nút **Tham gia** bên dưới!`,
    footer: `ID: ${g.id} • Host: ${g.hostTag || ''}`,
  });
}

function joinRow(g) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway-join:${g.id}`)
      .setLabel(`🎉 Tham gia (${g.entries.length})`)
      .setStyle(g.ended ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(!!g.ended),
  );
}

async function start(client, { guild, channel, prize, winnersCount, durationMs, host }) {
  const db = load();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const g = {
    id, guildId: guild.id, channelId: channel.id, messageId: null,
    prize, winnersCount, endsAt: Date.now() + durationMs,
    entries: [], ended: false, hostId: host.id, hostTag: host.tag,
  };
  const msg = await channel.send({ embeds: [giveawayEmbed(g)], components: [joinRow(g)] });
  g.messageId = msg.id;
  db[id] = g;
  save(db);
  schedule(client, id);
  return g;
}

function pickWinners(g) {
  const pool = [...new Set(g.entries)];
  const winners = [];
  while (pool.length && winners.length < g.winnersCount) {
    winners.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return winners;
}

async function fetchMessage(client, g) {
  const guild = await client.guilds.fetch(g.guildId).catch(() => null);
  if (!guild) return null;
  const channel = await guild.channels.fetch(g.channelId).catch(() => null);
  if (!channel?.isTextBased()) return null;
  return channel.messages.fetch(g.messageId).catch(() => null);
}

async function end(client, id, { reroll = false } = {}) {
  const db = load();
  const g = db[id];
  if (!g) throw new Error('Không tìm thấy giveaway.');
  const msg = await fetchMessage(client, g);
  const winners = pickWinners(g);

  if (!reroll) {
    g.ended = true;
    db[id] = g;
    save(db);
    if (timers.has(id)) { clearTimeout(timers.get(id)); timers.delete(id); }
  }

  const mention = winners.length ? winners.map(w => `<@${w}>`).join(', ') : '_Không có ai tham gia_';
  const title = reroll ? '🎉 GIVEAWAY ROLL LẠI 🎉' : '🎉 GIVEAWAY KẾT THÚC 🎉';
  const resultEmbed = embed({
    title,
    description: `**Giải: ${g.prize}**\n🏆 Thắng: ${mention}`,
    footer: `ID: ${g.id} • ${g.entries.length} người tham gia`,
  });

  if (msg) {
    await msg.edit({ embeds: [resultEmbed], components: [joinRow({ ...g, ended: true })] }).catch(() => {});
    await msg.reply(`🎊 ${reroll ? 'Roll lại' : 'Kết thúc'}! ${winners.length ? `Chúc mừng ${mention} đã thắng **${g.prize}**!` : 'Không có người thắng vì không ai tham gia.'}`).catch(() => {});
  }
  return { giveaway: g, winners };
}

async function handleJoin(interaction, id) {
  const db = load();
  const g = db[id];
  if (!g || g.ended) {
    return interaction.reply({ content: '❌ Giveaway này đã kết thúc hoặc không tồn tại.', ephemeral: true });
  }
  if (g.entries.includes(interaction.user.id)) {
    return interaction.reply({ content: '⚠️ Bạn đã tham gia rồi!', ephemeral: true });
  }
  g.entries.push(interaction.user.id);
  db[id] = g;
  save(db);
  // Cập nhật số người trên nút
  await interaction.update({ embeds: [giveawayEmbed(g)], components: [joinRow(g)] }).catch(() => {});
}

function schedule(client, id) {
  if (timers.has(id)) clearTimeout(timers.get(id));
  const db = load();
  const g = db[id];
  if (!g || g.ended) return;
  const delay = Math.max(0, g.endsAt - Date.now());
  const t = setTimeout(() => {
    end(client, id).catch(e => console.error('[giveaway end]', e.message));
  }, Math.min(delay, 2_147_483_647));
  if (t.unref) t.unref();
  timers.set(id, t);
}

function restoreAll(client) {
  const db = load();
  for (const id of Object.keys(db)) {
    if (!db[id].ended) schedule(client, id);
  }
  const pending = Object.values(db).filter(g => !g.ended).length;
  if (pending) console.log(`🎉 Khôi phục ${pending} giveaway đang chạy`);
}

function findByMessageId(messageId) {
  const db = load();
  return Object.values(db).find(g => g.messageId === messageId) || null;
}

module.exports = { start, end, handleJoin, restoreAll, findByMessageId, parseDuration, load };
