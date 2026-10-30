const fs = require('node:fs');
const path = require('node:path');
const { writeJsonAtomic } = require('./jsonStore');
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
  writeJsonAtomic(FILE, db);
}

// ===== Mongo (model Giveaway đã có trong db.js nhưng trước đây không nơi nào dùng,
// giveaway vẫn ghi JSON nên mất khi Render restart dù đã set MONGODB_URI) =====
function useMongo() {
  try {
    return require('../db').isMongo();
  } catch { return false; }
}

function toDoc(g) {
  return {
    gid: g.id, guildId: g.guildId, channelId: g.channelId, messageId: g.messageId,
    prize: g.prize, winnersCount: g.winnersCount, endsAt: g.endsAt,
    entries: g.entries || [], ended: !!g.ended, hostId: g.hostId, hostTag: g.hostTag,
  };
}
function fromDoc(d) {
  if (!d) return null;
  return {
    id: d.gid, guildId: d.guildId, channelId: d.channelId, messageId: d.messageId,
    prize: d.prize, winnersCount: d.winnersCount, endsAt: d.endsAt,
    entries: d.entries || [], ended: !!d.ended, hostId: d.hostId, hostTag: d.hostTag,
  };
}

async function getOne(id) {
  if (useMongo()) {
    const { Giveaway } = require('../db');
    return fromDoc(await Giveaway.findOne({ gid: id }).lean().catch(() => null));
  }
  return load()[id] || null;
}

async function saveOne(g) {
  if (useMongo()) {
    const { Giveaway } = require('../db');
    await Giveaway.updateOne({ gid: g.id }, { $set: toDoc(g) }, { upsert: true });
    return;
  }
  const db = load();
  db[g.id] = g;
  save(db);
}

async function loadStore() {
  if (useMongo()) {
    const { Giveaway } = require('../db');
    const docs = await Giveaway.find({}).lean().catch(() => []);
    const out = {};
    for (const d of docs) out[d.gid] = fromDoc(d);
    return out;
  }
  return load();
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
  if (useMongo()) {
    await saveOne(g);
  } else {
    db[id] = g;
    save(db);
  }
  await schedule(client, id);
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
  const g = await getOne(id);
  if (!g) throw new Error('Không tìm thấy giveaway.');
  const msg = await fetchMessage(client, g);
  const winners = pickWinners(g);

  if (!reroll) {
    g.ended = true;
    await saveOne(g);
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
  if (!reroll) require('./activity').record(g.guildId, 'giveaway', `Giveaway “${g.prize}” kết thúc (${g.entries.length} người tham gia)`).catch(() => {});
  return { giveaway: g, winners };
}

async function handleJoin(interaction, id) {
  if (useMongo()) {
    // $addToSet nguyên tử: 2 người bấm gần nhau không ghi đè mất lượt của nhau
    const { Giveaway } = require('../db');
    const doc = await Giveaway.findOne({ gid: id }).lean().catch(() => null);
    const g0 = fromDoc(doc);
    if (!g0 || g0.ended) {
      return interaction.reply({ content: '❌ Giveaway này đã kết thúc hoặc không tồn tại.', ephemeral: true });
    }
    if (g0.entries.includes(interaction.user.id)) {
      return interaction.reply({ content: '⚠️ Bạn đã tham gia rồi!', ephemeral: true });
    }
    await Giveaway.updateOne({ gid: id }, { $addToSet: { entries: interaction.user.id } });
    const fresh = fromDoc(await Giveaway.findOne({ gid: id }).lean().catch(() => null)) || g0;
    await interaction.update({ embeds: [giveawayEmbed(fresh)], components: [joinRow(fresh)] }).catch(() => {});
    return;
  }
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

async function schedule(client, id) {
  if (timers.has(id)) clearTimeout(timers.get(id));
  const g = await getOne(id);
  if (!g || g.ended) return;
  const delay = Math.max(0, g.endsAt - Date.now());
  const t = setTimeout(() => {
    end(client, id).catch(e => console.error('[giveaway end]', e.message));
  }, Math.min(delay, 2_147_483_647));
  if (t.unref) t.unref();
  timers.set(id, t);
}

async function restoreAll(client) {
  const db = await loadStore();
  for (const id of Object.keys(db)) {
    if (!db[id].ended) await schedule(client, id);
  }
  const pending = Object.values(db).filter(g => !g.ended).length;
  if (pending) console.log(`🎉 Khôi phục ${pending} giveaway đang chạy`);
}

async function findByMessageId(messageId) {
  if (useMongo()) {
    const { Giveaway } = require('../db');
    return fromDoc(await Giveaway.findOne({ messageId }).lean().catch(() => null));
  }
  const db = load();
  return Object.values(db).find(g => g.messageId === messageId) || null;
}

module.exports = { start, end, handleJoin, restoreAll, findByMessageId, parseDuration, load };
