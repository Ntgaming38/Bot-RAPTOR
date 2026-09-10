// Ticket nâng cao kiểu ProBot: số thứ tự, priority, lock/unlock, unclaim,
// reopen, blacklist, transcript HTML, tự đóng khi im lặng, thống kê.
const fs = require('node:fs');
const path = require('node:path');
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits,
  StringSelectMenuBuilder,
} = require('discord.js');
const { embed, errorEmbed } = require('./embeds');

const CLOSED_FILE = path.join(__dirname, '..', '..', 'data', 'closed-tickets.json');
const BLACKLIST_FILE = path.join(__dirname, '..', '..', 'data', 'ticket-blacklist.json');
const COUNTER_FILE = path.join(__dirname, '..', '..', 'data', 'ticket-counter.json');
const RATINGS_FILE = path.join(__dirname, '..', '..', 'data', 'ticket-ratings.json');

const PRIORITIES = {
  low: { label: 'Low', emoji: '🟢' },
  medium: { label: 'Medium', emoji: '🟡' },
  high: { label: 'High', emoji: '🔴' },
  urgent: { label: 'Urgent', emoji: '⛔' },
};

function useMongo() {
  try {
    return require('../db').isMongo();
  } catch { return false; }
}
function readJson(file, fb) {
  try {
    if (!fs.existsSync(file)) return fb;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return fb; }
}
function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Số thứ tự ticket theo server: #1, #2...
async function nextTicketNumber(guildId) {
  if (useMongo()) {
    const { TicketCounter } = require('../db');
    const doc = await TicketCounter.findOneAndUpdate(
      { guildId }, { $inc: { seq: 1 } }, { upsert: true, new: true }
    );
    return doc.seq;
  }
  const all = readJson(COUNTER_FILE, {});
  all[guildId] = (all[guildId] || 0) + 1;
  writeJson(COUNTER_FILE, all);
  return all[guildId];
}

function prioText(p) {
  const d = PRIORITIES[p] || PRIORITIES.medium;
  return `${d.emoji} ${d.label}`;
}

// Embed thông tin ticket (mẫu user gửi: số, loại, priority, ngày tạo, người nhận)
function ticketInfoEmbed(t) {
  return embed({
    title: `🎫 Ticket #${t.number || '?'}`,
    description: [
      `**Loại:** ${t.typeLabel || t.type || '?'}`,
      `**Priority:** ${prioText(t.priority)}`,
      `**Created:** ${t.createdAt ? `<t:${Math.floor(t.createdAt / 1000)}:F>` : '?'}`,
      `**Claimed:** ${t.claimedBy ? `<@${t.claimedBy}>` : '_chưa ai nhận_'}`,
      t.reason ? `**Lý do:**\n\`\`\`${String(t.reason).slice(0, 500)}\`\`\`` : '',
    ].filter(Boolean).join('\n'),
    footer: `Chủ ticket: ${t.ownerTag || ''}`,
  });
}

function priorityRow(current) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket-priority')
    .setPlaceholder(`⚡ Priority: ${(PRIORITIES[current] || PRIORITIES.medium).label}`);
  for (const [id, d] of Object.entries(PRIORITIES)) {
    menu.addOptions({ label: d.label, value: id, emoji: d.emoji, default: id === current });
  }
  return new ActionRowBuilder().addComponents(menu);
}

function reopenRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket-reopen').setLabel('Mở lại').setEmoji('🔓').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ticket-delete').setLabel('Xóa hẳn').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
  );
}

// ===== BLACKLIST =====
async function isBlacklisted(guildId, userId) {
  if (useMongo()) {
    const { TicketBlacklist } = require('../db');
    return !!(await TicketBlacklist.findOne({ guildId, userId }).catch(() => null));
  }
  const all = readJson(BLACKLIST_FILE, {});
  return (all[guildId] || []).some((e) => e.userId === userId);
}

async function blacklistAdd(guildId, userId, reason, by) {
  const entry = { userId, reason: reason || '', by: by || '', at: Date.now() };
  if (useMongo()) {
    const { TicketBlacklist } = require('../db');
    await TicketBlacklist.updateOne({ guildId, userId }, { $set: entry }, { upsert: true });
    return;
  }
  const all = readJson(BLACKLIST_FILE, {});
  all[guildId] = (all[guildId] || []).filter((e) => e.userId !== userId);
  all[guildId].push(entry);
  writeJson(BLACKLIST_FILE, all);
}

async function blacklistRemove(guildId, userId) {
  if (useMongo()) {
    const { TicketBlacklist } = require('../db');
    await TicketBlacklist.deleteOne({ guildId, userId });
    return;
  }
  const all = readJson(BLACKLIST_FILE, {});
  all[guildId] = (all[guildId] || []).filter((e) => e.userId !== userId);
  writeJson(BLACKLIST_FILE, all);
}

async function blacklistList(guildId) {
  if (useMongo()) {
    const { TicketBlacklist } = require('../db');
    return await TicketBlacklist.find({ guildId }).lean().catch(() => []);
  }
  return readJson(BLACKLIST_FILE, {})[guildId] || [];
}

// ===== TRANSCRIPT HTML =====
function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function generateTranscriptHTML(channel, t) {
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  const sorted = messages ? [...messages.values()].reverse() : [];
  const rows = sorted.map((m) => {
    const time = new Date(m.createdTimestamp).toLocaleString('vi-VN');
    const attach = [...m.attachments.values()].map((a) => `<a href="${escHtml(a.url)}">[file]</a>`).join(' ');
    return `<div class="msg"><img src="${m.author.displayAvatarURL({ size: 32 })}"><div><b>${escHtml(m.author.tag)}</b> <span>${escHtml(time)}</span><p>${escHtml(m.content || '(embed/ảnh)')} ${attach}</p></div></div>`;
  }).join('\n');
  const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Transcript #${escHtml(channel.name)}</title><style>body{background:#313338;color:#dbdee1;font-family:sans-serif;max-width:800px;margin:auto;padding:20px}.msg{display:flex;gap:10px;margin:12px 0}.msg img{width:32px;height:32px;border-radius:50%}.msg span{color:#949ba4;font-size:12px}.msg p{margin:4px 0}a{color:#00a8fc}</style></head><body><h2>📝 Transcript #${escHtml(channel.name)}${t?.number ? ` (Ticket #${t.number})` : ''}</h2><p>Xuất lúc ${escHtml(new Date().toLocaleString('vi-VN'))} • ${sorted.length} tin nhắn</p><hr>${rows}</body></html>`;
  const dir = path.join(__dirname, '..', '..', 'data', 'transcripts');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${channel.name}-${Date.now()}.html`);
  fs.writeFileSync(file, html);
  return { file, count: sorted.length };
}

// ===== LƯU LỊCH SỬ ĐÓNG (thống kê) =====
async function recordClosed(rec) {
  if (useMongo()) {
    const { ClosedTicket } = require('../db');
    await ClosedTicket.create(rec).catch(() => null);
    return;
  }
  const all = readJson(CLOSED_FILE, []);
  all.push(rec);
  writeJson(CLOSED_FILE, all.slice(-2000));
}

async function closedList(guildId) {
  if (useMongo()) {
    const { ClosedTicket } = require('../db');
    return await ClosedTicket.find({ guildId }).lean().catch(() => []);
  }
  return readJson(CLOSED_FILE, []).filter((r) => r.guildId === guildId);
}

async function computeTicketStats(guildId) {
  const { load } = require('./tickets');
  const open = Object.entries(load()).filter(([, t]) => t.guildId === guildId && !t.closed);
  const closed = await closedList(guildId);
  const byType = {};
  for (const [, t] of open) byType[t.typeLabel || t.type || '?'] = (byType[t.typeLabel || t.type || '?'] || 0) + 1;
  for (const r of closed) byType[r.typeLabel || r.type || '?'] = (byType[r.typeLabel || r.type || '?'] || 0) + 1;
  const durations = closed.filter((r) => r.closedAt > r.createdAt).map((r) => r.closedAt - r.createdAt);
  const avgMin = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60000) : null;
  const staff = {};
  const bump = (id, tag, k) => {
    if (!id) return;
    staff[id] = staff[id] || { tag: tag || id, claimed: 0, closed: 0 };
    staff[id][k] += 1;
  };
  for (const [, t] of open) bump(t.claimedBy, t.claimedTag, 'claimed');
  for (const r of closed) {
    bump(r.claimedBy, r.claimedTag, 'claimed');
    bump(r.closedBy, r.closedByTag, 'closed');
  }
  const ratings = readJson(RATINGS_FILE, {});
  const stars = Object.values(ratings).map((r) => r.stars).filter((n) => n >= 1 && n <= 5);
  const dist = [0, 0, 0, 0, 0, 0];
  for (const n of stars) dist[n] += 1;
  return {
    open: open.length,
    closedTotal: closed.length,
    byType,
    avgMin,
    staff: Object.values(staff).sort((a, b) => (b.claimed + b.closed) - (a.claimed + a.closed)).slice(0, 10),
    ratingAvg: stars.length ? (stars.reduce((a, b) => a + b, 0) / stars.length).toFixed(1) : null,
    ratingCount: stars.length,
    ratingDist: dist.slice(1),
  };
}

// ===== ĐÓNG TICKET DÙNG CHUNG (lệnh + tự động) =====
async function finishClose(client, guild, channel, t, { byId, byTag, auto = false } = {}) {
  const tickets = require('./tickets');
  const st = await tickets.getT?.(guild.id).catch(() => null)
    || await require('./guildSettings').getGuildSettings(guild.id).catch(() => null)
    || {};
  // Transcript txt + html
  let txtFile = null;
  let htmlFile = null;
  try {
    ({ file: txtFile } = await tickets.generateTranscript(channel));
  } catch {}
  try {
    ({ file: htmlFile } = await generateTranscriptHTML(channel, t));
  } catch (e) {
    console.warn('[ticket html]', e?.message);
  }
  const files = [txtFile, htmlFile].filter(Boolean);
  // Log + gửi transcript
  try {
    const logger = require('./logger');
    await logger.logMod(guild, `${auto ? '⏰ Tự đóng' : '🔒 Đóng'} ticket #${channel.name}${t.number ? ` (#${t.number})` : ''} (${t.typeLabel || ''}) bởi ${byTag || 'hệ thống'}`);
    const logId = st.logChannelId;
    if (logId) {
      const logCh = await guild.channels.fetch(logId).catch(() => null);
      if (logCh?.isTextBased() && files.length) {
        await logCh.send({ content: `📝 Transcript #${channel.name} (${t.ownerTag})`, files: [...files] }).catch(() => {});
      }
    }
  } catch {}
  // DM chủ ticket
  try {
    const owner = await client.users.fetch(t.ownerId).catch(() => null);
    if (owner) {
      if (st.showRating !== false) {
        const { ratingRow } = require('./tickets');
        await owner.send({
          content: `Ticket **#${channel.name}** của bạn đã được đóng. Cảm ơn bạn! Hãy đánh giá hỗ trợ 👇`,
          components: [ratingRow(t.ownerId)],
        }).catch(() => {});
      }
      if (files.length) await owner.send({ content: '📝 Lịch sử ticket của bạn:', files: [...files] }).catch(() => {});
    }
  } catch {}
  // Lưu thống kê
  await recordClosed({
    guildId: guild.id,
    number: t.number || null,
    ownerId: t.ownerId,
    ownerTag: t.ownerTag,
    type: t.type,
    typeLabel: t.typeLabel,
    priority: t.priority || 'medium',
    reason: t.reason || '',
    createdAt: t.createdAt || Date.now(),
    closedAt: Date.now(),
    closedBy: byId || null,
    closedByTag: byTag || null,
    claimedBy: t.claimedBy || null,
    claimedTag: t.claimedTag || null,
    auto,
  });
  // Archive (giữ kênh cho mở lại) hay xóa hẳn
  const mode = st.closeMode || 'delete';
  if (mode === 'archive' && st.archiveCategoryId) {
    const db = tickets.load();
    const cur = db[channel.id] || t;
    cur.closed = true;
    db[channel.id] = cur;
    tickets.save(db);
    await channel.permissionOverwrites.edit(t.ownerId, { ViewChannel: true, SendMessages: false, ReadMessageHistory: true }).catch(() => {});
    await channel.setParent(st.archiveCategoryId).catch(() => {});
    if (!channel.name.startsWith('🔒-')) await channel.setName(`🔒-${channel.name}`.slice(0, 90)).catch(() => {});
    await channel.send({ content: `🔒 Ticket đã đóng${auto ? ' tự động (im lặng quá lâu)' : ''}. Staff có thể mở lại hoặc xóa hẳn:`, components: [reopenRow()] }).catch(() => {});
    return 'archived';
  }
  const db = tickets.load();
  delete db[channel.id];
  tickets.save(db);
  const delaySec = Math.min(600, Math.max(0, st.closeDelaySec ?? 5));
  setTimeout(() => channel.delete().catch(() => {}), delaySec * 1000);
  return 'deleted';
}

function reopenRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket-reopen').setLabel('Mở lại').setEmoji('🔓').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ticket-delete').setLabel('Xóa hẳn').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
  );
}

async function touchTicketActivity(channelId) {
  try {
    const tickets = require('./tickets');
    const db = tickets.load();
    const t = db[channelId];
    if (!t || t.closed) return;
    if (Date.now() - (t.lastActivity || 0) < 5 * 60_000) return;
    t.lastActivity = Date.now();
    db[channelId] = t;
    tickets.save(db);
  } catch {}
}

// Quét ticket im lặng quá lâu → tự đóng
async function autoCloseTick(client) {
  try {
    const { GuildSettings } = require('../db');
    const useM = require('../db').isMongo();
    let guilds = [];
    if (useM) {
      guilds = await GuildSettings.find({ autoCloseHours: { $gt: 0 } }).lean().catch(() => []);
    } else {
      const fs2 = require('node:fs');
      const file = path.join(__dirname, '..', '..', 'data', 'guild-settings.json');
      if (fs2.existsSync(file)) {
        const all = JSON.parse(fs2.readFileSync(file, 'utf8'));
        guilds = Object.entries(all).filter(([, v]) => (v.autoCloseHours || 0) > 0).map(([guildId, v]) => ({ guildId, ...v }));
      }
    }
    const { load, save } = require('./tickets');
    for (const g of guilds) {
      const hours = g.autoCloseHours || 0;
      if (!hours) continue;
      const guild = await client.guilds.fetch(g.guildId).catch(() => null);
      if (!guild) continue;
      const db = load();
      let dirty = false;
      for (const [chId, t] of Object.entries(db)) {
        if (t.guildId !== g.guildId || t.closed) continue;
        const last = t.lastActivity || t.createdAt || 0;
        if (Date.now() - last < hours * 3600_000) continue;
        const channel = await guild.channels.fetch(chId).catch(() => null);
        if (!channel) {
          delete db[chId];
          dirty = true;
          continue;
        }
        console.log(`[ticket] tự đóng #${channel.name} (im ${hours}h)`);
        await finishClose(client, guild, channel, t, { byId: client.user.id, byTag: client.user.tag, auto: true });
      }
      if (dirty) save(db);
    }
  } catch (e) {
    console.warn('[ticket autoclear]', e?.message);
  }
}

module.exports = {
  PRIORITIES,
  prioText,
  nextTicketNumber,
  ticketInfoEmbed,
  priorityRow,
  reopenRow,
  isBlacklisted,
  blacklistAdd,
  blacklistRemove,
  blacklistList,
  generateTranscriptHTML,
  recordClosed,
  computeTicketStats,
  finishClose,
  touchTicketActivity,
  autoCloseTick,
  handlePriority,
  handleUnclaim,
  handleLock,
  handleUnlock,
  handleReopen,
  handleDeleteNow,
  isTicketStaff,
};

// ===== HANDLERS TƯƠNG TÁC (nút/select trong kênh ticket) =====
const { errorEmbed: _err } = require('./embeds');

async function ticketDoc(channelId) {
  const { load } = require('./tickets');
  return load()[channelId] || null;
}

async function isTicketStaff(interaction) {
  const st = await require('./tickets').getT(interaction.guildId).catch(() => ({}));
  if (st?.ticketStaffRoleId) return !!interaction.member?.roles?.cache?.has(st.ticketStaffRoleId);
  return !!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);
}

async function handlePriority(interaction) {
  const { load, save, canManageTicket } = require('./tickets');
  const db = load();
  const t = db[interaction.channelId];
  if (!t) return interaction.reply({ embeds: [_err('Kênh này không phải ticket.')], ephemeral: true });
  if (!(await canManageTicket(interaction, t))) {
    return interaction.reply({ embeds: [_err('Chỉ chủ ticket hoặc staff mới đổi priority.')], ephemeral: true });
  }
  const level = interaction.values?.[0];
  if (!PRIORITIES[level]) return interaction.reply({ embeds: [_err('Mức không hợp lệ.')], ephemeral: true });
  t.priority = level;
  db[interaction.channelId] = t;
  save(db);
  // Sửa lại embed thông tin
  try {
    if (t.openingMessageId) {
      const msg = await interaction.channel.messages.fetch(t.openingMessageId).catch(() => null);
      if (msg) await msg.edit({ embeds: [ticketInfoEmbed(t)] }).catch(() => {});
    }
  } catch {}
  return interaction.reply({ content: `⚡ Priority → **${prioText(level)}**`, ephemeral: true });
}

async function handleUnclaim(interaction) {
  if (!(await isTicketStaff(interaction))) {
    return interaction.reply({ embeds: [_err('Chỉ staff mới bỏ nhận ticket được.')], ephemeral: true });
  }
  const { load, save } = require('./tickets');
  const db = load();
  const t = db[interaction.channelId];
  if (!t) return interaction.reply({ embeds: [_err('Kênh này không phải ticket.')], ephemeral: true });
  if (!t.claimedBy) return interaction.reply({ content: 'Ticket này chưa ai nhận.', ephemeral: true });
  t.claimedBy = null;
  t.claimedTag = null;
  db[interaction.channelId] = t;
  save(db);
  try {
    const name = interaction.channel.name.replace(/-xuly$/, '');
    if (name !== interaction.channel.name) await interaction.channel.setName(name.slice(0, 90)).catch(() => {});
  } catch {}
  return interaction.reply(`🙌 ${interaction.user} đã bỏ nhận ticket này.`);
}

async function handleLock(interaction, lock) {
  if (!(await isTicketStaff(interaction))) {
    return interaction.reply({ embeds: [_err('Chỉ staff mới khóa/mở ticket được.')], ephemeral: true });
  }
  const { load } = require('./tickets');
  const t = load()[interaction.channelId];
  if (!t) return interaction.reply({ embeds: [_err('Kênh này không phải ticket.')], ephemeral: true });
  await interaction.channel.permissionOverwrites.edit(t.ownerId, {
    ViewChannel: true, SendMessages: !lock, ReadMessageHistory: true,
  }).catch(() => {});
  return interaction.reply(lock ? '🔒 Đã khóa ticket (chủ ticket chỉ xem).' : '🔓 Đã mở khóa ticket.');
}

async function handleReopen(interaction) {
  const { load, save, canManageTicket } = require('./tickets');
  const db = load();
  const t = db[interaction.channelId];
  if (!t) return interaction.reply({ embeds: [_err('Kênh này không phải ticket.')], ephemeral: true });
  if (!t.closed) return interaction.reply({ content: 'Ticket này đang mở mà.', ephemeral: true });
  if (!(await canManageTicket(interaction, t))) {
    return interaction.reply({ embeds: [_err('Chỉ chủ ticket hoặc staff mới mở lại được.')], ephemeral: true });
  }
  t.closed = false;
  db[interaction.channelId] = t;
  save(db);
  await interaction.channel.permissionOverwrites.edit(t.ownerId, {
    ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
  }).catch(() => {});
  await interaction.channel.setParent(null).catch(() => {});
  const name = interaction.channel.name.replace(/^🔒-/, '');
  if (name !== interaction.channel.name) await interaction.channel.setName(name.slice(0, 90)).catch(() => {});
  const { ticketRow } = require('./tickets');
  const st = await require('./tickets').getT(interaction.guildId).catch(() => ({}));
  await interaction.channel.send({
    embeds: [ticketInfoEmbed(t)],
    components: [ticketRow(st), priorityRow(t.priority)],
  }).catch(() => {});
  return interaction.reply('🔓 Đã mở lại ticket!');
}

async function handleDeleteNow(interaction) {
  const { load, save, canManageTicket } = require('./tickets');
  const db = load();
  const t = db[interaction.channelId];
  if (!t) return interaction.reply({ embeds: [_err('Kênh này không phải ticket.')], ephemeral: true });
  if (!(await canManageTicket(interaction, t))) {
    return interaction.reply({ embeds: [_err('Chỉ chủ ticket hoặc staff mới xóa được.')], ephemeral: true });
  }
  delete db[interaction.channelId];
  save(db);
  await interaction.reply('🗑️ Đang xóa kênh...').catch(() => {});
  setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
}
