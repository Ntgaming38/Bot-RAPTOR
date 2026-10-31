const fs = require('node:fs');
const path = require('node:path');
const { writeJsonAtomic, readJson } = require('./jsonStore');
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelType, PermissionFlagsBits,
  StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const { embed, errorEmbed } = require('./embeds');
const config = require('../config');

// Setting ticket theo server (dashboard chỉnh), fallback .env
async function getT(guildId) {
  try {
    return await require('./guildSettings').getGuildSettings(guildId);
  } catch {
    return config;
  }
}

const FILE = path.join(__dirname, '..', '..', 'data', 'tickets.json');
const RATINGS_FILE = path.join(__dirname, '..', '..', 'data', 'ticket-ratings.json');

// Các loại ticket mặc định — mỗi server tự thêm/sửa/xóa trên dashboard
const TICKET_TYPES = [
  { id: 'hotro', label: 'Hỗ trợ chung', description: 'Hỏi đáp, cần giúp đỡ', emoji: '🛠️' },
  { id: 'tocao', label: 'Tố cáo', description: 'Báo cáo vi phạm, scam', emoji: '🚨' },
  { id: 'napthe', label: 'Nạp / Mua hàng', description: 'Thanh toán, đơn hàng', emoji: '💳' },
  { id: 'tuyen', label: 'Tuyển staff / Đối tác', description: 'Ứng tuyển, hợp tác', emoji: '🤝' },
];

const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'loai';

function sanitizeTypes(arr) {
  if (!Array.isArray(arr)) return null;
  const out = [];
  for (const t of arr.slice(0, 10)) {
    if (!t || !t.label) continue;
    out.push({
      id: slug(t.id || t.label),
      label: String(t.label).slice(0, 25),
      description: String(t.description || '').slice(0, 100),
      emoji: String(t.emoji || '') || '🎫',
    });
  }
  return out.length ? out : null;
}

function getTypes(st) {
  return sanitizeTypes(st?.ticketTypes) || TICKET_TYPES;
}

function load() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return readJson(FILE, {});
  } catch { return {}; }
}
function save(db) {
  writeJsonAtomic(FILE, db);
}

// ===== Persistence theo TỪNG RECORD (Mongo model Ticket / JSON data/tickets.json) =====
// Trước đây loadStore/saveStore nạp & ghi lại TOÀN BỘ map ticket: hai thao tác
// đồng thời dùng chung một snapshot có thể xóa ticket người kia vừa tạo hoặc
// ghi ngược trạng thái mới (audit 2026-10-31, H1/H3). Nay mọi thao tác chạm
// đúng 1 record: Mongo dùng findOne/updateOne/deleteOne theo channelId; JSON
// thì load→sửa→save diễn ra đồng bộ trong một hàm (không await ở giữa) nên
// không có cửa sổ race trong cùng tiến trình.
function useMongo() {
  try {
    return require('../db').isMongo();
  } catch { return false; }
}

function stripDoc(d) {
  if (!d) return null;
  const { _id, __v, ...rest } = d;
  return rest;
}

async function getTicket(channelId) {
  if (useMongo()) {
    const { Ticket } = require('../db');
    return stripDoc(await Ticket.findOne({ channelId }).lean().catch(() => null));
  }
  return load()[channelId] || null;
}

async function putTicket(channelId, record) {
  if (useMongo()) {
    const { Ticket } = require('../db');
    await Ticket.updateOne({ channelId }, { $set: { ...record, channelId } }, { upsert: true });
    return;
  }
  const db = load();
  db[channelId] = record;
  save(db);
}

async function patchTicket(channelId, patch) {
  if (useMongo()) {
    const { Ticket } = require('../db');
    return stripDoc(await Ticket.findOneAndUpdate({ channelId }, { $set: patch }, { new: true }).lean().catch(() => null));
  }
  const db = load();
  if (!db[channelId]) return null;
  db[channelId] = { ...db[channelId], ...patch };
  save(db);
  return db[channelId];
}

async function removeTicket(channelId) {
  if (useMongo()) {
    const { Ticket } = require('../db');
    await Ticket.deleteOne({ channelId });
    return;
  }
  const db = load();
  delete db[channelId];
  save(db);
}

// Đọc toàn bộ map (chỉ cho thống kê/quét định kỳ — không ghi ngược từ snapshot này).
async function listTickets() {
  if (useMongo()) {
    const { Ticket } = require('../db');
    const docs = await Ticket.find({}).lean().catch(() => []);
    const out = {};
    for (const d of docs) out[d.channelId] = stripDoc(d);
    return out;
  }
  return load();
}

// Ticket ĐANG MỞ của một người trong một guild → [channelId, record] | null.
// Bản ghi đã đóng (closed) KHÔNG tính — trước đây ticket archive rồi vẫn chặn
// chủ ticket mở ticket mới (audit H2).
async function findOpenTicketByOwner(guildId, ownerId) {
  if (useMongo()) {
    const { Ticket } = require('../db');
    const d = await Ticket.findOne({ guildId, ownerId, closed: { $ne: true } }).lean().catch(() => null);
    return d ? [d.channelId, stripDoc(d)] : null;
  }
  const db = load();
  for (const [channelId, t] of Object.entries(db)) {
    if (t.guildId === guildId && t.ownerId === ownerId && !t.closed) return [channelId, t];
  }
  return null;
}

// ===== PANEL 1 NÚT "Mở Ticket" (kiểu tickets.bot trong hình) =====
// Member chỉ cần bấm nút → điền lý do → dùng ngay.
function setupComponents() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket-create').setLabel('Mở Ticket').setEmoji('🎫').setStyle(ButtonStyle.Primary),
  )];
}

const PANEL_DESC_DEFAULT = [
  'Bạn đang gặp vấn đề hoặc cần hỗ trợ? Hãy tạo Ticket để đội ngũ Admin có thể hỗ trợ bạn nhanh chóng.',
  '',
  '📌 **Trước khi tạo Ticket:**',
  '• Mô tả vấn đề của bạn rõ ràng và đầy đủ.',
  '• Cung cấp ảnh/video hoặc bằng chứng nếu cần thiết.',
  '• Không spam hoặc tạo nhiều Ticket cho cùng một vấn đề.',
  '• Vui lòng chờ Admin phản hồi và giữ thái độ lịch sự trong quá trình hỗ trợ.',
  '',
  '🛠️ **Các vấn đề có thể hỗ trợ:**',
  '• ❓ Giải đáp thắc mắc về game',
  '• 🚨 Báo cáo thành viên',
  '• 🔧 Hỗ trợ kỹ thuật',
  '• ⚠️ Khiếu nại hoặc kháng cáo',
  '• 💬 Các vấn đề khác liên quan đến Server',
  '',
  '🎫 **Cách tạo Ticket:**',
  '',
  'Nhấn vào nút "🎫 Mở Ticket" bên dưới và mô tả vấn đề của bạn.',
  '',
  '💡 **Lưu ý:** Ticket được tạo để hỗ trợ thành viên. Vui lòng không sử dụng Ticket để spam hoặc làm phiền Admin.',
].join('\n');

function setupEmbed(st) {
  const thumb = (st?.ticketPanelImageUrl) ?? config.ticketPanelImageUrl;
  return embed({
    title: st?.panelTitle || '🎫 Bạn cần hỗ trợ - hãy mở ticket!',
    description: st?.panelDescription || PANEL_DESC_DEFAULT,
    thumbnail: thumb || undefined,
    footer: 'Mỗi người chỉ có 1 ticket mở cùng lúc',
  });
}

// Giữ select menu nhiều loại (nếu sever nào thích chia loại thì dùng)
function setupSelectComponents(types) {
  const list = types?.length ? types : TICKET_TYPES;
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket-select')
    .setPlaceholder('📩 Hoặc chọn loại ticket...')
    .addOptions(list.map(t => ({
      label: t.label, value: t.id, description: t.description, emoji: t.emoji,
    })));
  return [new ActionRowBuilder().addComponents(menu)];
}

// Giữ nút cũ để tương thích panel trước đây
function setupRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket-create').setLabel('🎫 Tạo ticket').setStyle(ButtonStyle.Primary),
  );
}

function ticketRow(st) {
  const row = new ActionRowBuilder();
  if (st?.showClaim !== false) {
    row.addComponents(
      new ButtonBuilder().setCustomId('ticket-claim').setLabel('Nhận').setEmoji('✋').setStyle(ButtonStyle.Secondary),
    );
  }
  if (st?.showTranscript !== false) {
    row.addComponents(
      new ButtonBuilder().setCustomId('ticket-transcript').setLabel('Lịch sử').setEmoji('📝').setStyle(ButtonStyle.Secondary),
    );
  }
  row.addComponents(
    new ButtonBuilder().setCustomId('ticket-close').setLabel('Đóng').setEmoji('🔒').setStyle(ButtonStyle.Danger),
  );
  return row;
}

function ratingRow(ownerId, guildId, ticketChannelId) {
  // customId mang guild + kênh ticket để handleRate ghi đúng phạm vi (trước đây chỉ có
  // ownerId nên rating bị lưu theo user toàn cục, đè lẫn nhau giữa các server/ticket)
  const suffix = guildId && ticketChannelId ? `${guildId}:${ticketChannelId}` : ownerId;
  const row = new ActionRowBuilder();
  for (let i = 1; i <= 5; i++) {
    row.addComponents(
      new ButtonBuilder().setCustomId(`ticket-rate:${i}:${suffix}`).setLabel(`${i}⭐`).setStyle(ButtonStyle.Secondary),
    );
  }
  return row;
}

// ===== CHỌN LOẠI → HIỆN FORM =====
async function handleSelect(interaction) {
  const pro = require('./ticketsPro');
  if (await pro.isBlacklisted(interaction.guildId, interaction.user.id)) {
    return interaction.reply({ embeds: [errorEmbed('⛔ Bạn đang bị chặn tạo ticket. Liên hệ admin.')], ephemeral: true });
  }
  const typeId = interaction.values?.[0];
  const types = getTypes(await getT(interaction.guildId));
  const type = types.find(t => t.id === typeId) || types[0];

  const existing = await findOpenTicketByOwner(interaction.guildId, interaction.user.id);
  if (existing) {
    return interaction.reply({ content: `⚠️ Bạn đã có ticket mở: <#${existing[0]}>`, ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId(`ticket-modal:${type.id}`)
    .setTitle(`${type.emoji} ${type.label}`);
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('lydo')
        .setLabel('Mô tả vấn đề của bạn')
        .setPlaceholder('VD: Tôi nạp 100k nhưng chưa nhận được hàng...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000),
    ),
  );
  await interaction.showModal(modal);
}

// ===== SUBMIT FORM → TẠO KÊNH =====
async function handleModal(interaction) {
  const typeId = (interaction.customId || '').split(':')[1] || 'hotro';
  const types = getTypes(await getT(interaction.guildId));
  const type = types.find(t => t.id === typeId) || types[0];
  const reason = interaction.fields.getTextInputValue('lydo')?.slice(0, 1000) || 'Không có';
  await createTicket(interaction, type, reason);
}

async function createTicket(interaction, type, reason) {
  await interaction.deferReply({ ephemeral: true });
  const pro = require('./ticketsPro');
  if (await pro.isBlacklisted(interaction.guildId, interaction.user.id)) {
    return interaction.editReply({ embeds: [errorEmbed('⛔ Bạn đang bị chặn tạo ticket. Liên hệ admin.') ] });
  }
  // Kiểm tra trùng NGAY TRƯỚC khi tạo (bước chọn loại/nút bấm kiểm tra sớm có
  // thể bị lách bằng cách mở 2 form rồi submit cả hai — audit H2).
  const dup = await findOpenTicketByOwner(interaction.guildId, interaction.user.id);
  if (dup) {
    return interaction.editReply({ content: `⚠️ Bạn đã có ticket mở: <#${dup[0]}>` });
  }
  const st = await getT(interaction.guildId);
  const number = await pro.nextTicketNumber(interaction.guildId);

  const overwrites = [
    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
  ];
  if (st.ticketStaffRoleId) {
    overwrites.push({ id: st.ticketStaffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  }

  const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20) || 'user';
  const channel = await interaction.guild.channels.create({
    name: `${type.id}-${safeName}`.slice(0, 90),
    type: ChannelType.GuildText,
    parent: st.ticketCategoryId || null,
    permissionOverwrites: overwrites,
    topic: `Ticket ${type.label} của ${interaction.user.tag} | Lý do: ${reason.slice(0, 200)}`,
  }).catch(() => interaction.guild.channels.create({
    name: `${type.id}-${safeName}`.slice(0, 90),
    type: ChannelType.GuildText,
    permissionOverwrites: overwrites,
  }));

  const record = {
    ownerId: interaction.user.id, ownerTag: interaction.user.tag,
    guildId: interaction.guildId, type: type.id, typeLabel: type.label,
    reason, createdAt: Date.now(), lastActivity: Date.now(), claimedBy: null,
    number, priority: st.defaultPriority || 'medium', closed: false,
    openingMessageId: null,
  };
  await putTicket(channel.id, record);
  require('./activity').record(interaction.guildId, 'ticket', `@${interaction.user.tag} mở ticket #${number} (${type.label})`).catch(() => {});

  const opening = await channel.send({
    content: `${interaction.user} ${st.ticketStaffRoleId ? `<@&${st.ticketStaffRoleId}>` : ''}`,
    embeds: [pro.ticketInfoEmbed({ ...record })],
    components: [ticketRow(st), pro.priorityRow(record.priority)],
  });
  await patchTicket(channel.id, { openingMessageId: opening?.id || null });

  try {
    require('./logger').logMod(interaction.guild, `🎫 Mở ticket ${channel} (${type.label}) bởi ${interaction.user.tag}`, reason);
  } catch {}

  await interaction.editReply({ content: `✅ Đã tạo ticket ${channel}\nLoại: **${type.label}**` });
}

// Tương thích nút cũ
async function handleCreate(interaction) {
  const existing = await findOpenTicketByOwner(interaction.guildId, interaction.user.id);
  if (existing) {
    return interaction.reply({ content: `⚠️ Bạn đã có ticket mở: <#${existing[0]}>`, ephemeral: true });
  }
  // Mở thẳng form loại mặc định
  const type = getTypes(await getT(interaction.guildId))[0];
  const modal = new ModalBuilder().setCustomId(`ticket-modal:${type.id}`).setTitle(`${type.emoji} ${type.label}`);
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('lydo').setLabel('Mô tả vấn đề của bạn')
        .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000),
    ),
  );
  await interaction.showModal(modal);
}

// ===== TRANSCRIPT =====
async function generateTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  const sorted = messages ? [...messages.values()].reverse() : [];
  const lines = sorted.map(m => {
    const time = new Date(m.createdTimestamp).toLocaleString('vi-VN');
    const attach = m.attachments.size ? ` [file: ${[...m.attachments.values()].map(a => a.url).join(', ')}]` : '';
    return `[${time}] ${m.author.tag}: ${m.content || '(embed/ảnh)'}${attach}`;
  });
  const header = `TRANSCRIPT #${channel.name} (${channel.id})\nXuất lúc: ${new Date().toLocaleString('vi-VN')}\n${'='.repeat(50)}\n`;
  const text = header + lines.join('\n');
  const dir = path.join(__dirname, '..', '..', 'data', 'transcripts');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${channel.name}-${Date.now()}.txt`);
  fs.writeFileSync(file, text);
  return { file, count: lines.length };
}

async function handleTranscript(interaction) {
  const t = await getTicket(interaction.channelId);
  if (!t) {
    return interaction.reply({ embeds: [errorEmbed('Kênh này không phải ticket.')], ephemeral: true });
  }
  if (!(await canManageTicket(interaction, t))) {
    return interaction.reply({ embeds: [errorEmbed('Chỉ chủ ticket hoặc staff mới xuất transcript.')], ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });
  const { file, count } = await generateTranscript(interaction.channel);
  await interaction.editReply({ content: `📝 Đã xuất ${count} tin nhắn:`, files: [file] }).catch(async () => {
    await interaction.editReply({ content: '❌ Không xuất được transcript.' });
  });
}

// ===== ĐÓNG (kèm transcript + gửi DM + đánh giá) =====
async function canManageTicket(interaction, t) {
  if (t.ownerId === interaction.user.id) return true;
  const st = await getT(interaction.guildId);
  if (st.ticketStaffRoleId && interaction.member?.roles?.cache?.has(st.ticketStaffRoleId)) return true;
  return !!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);
}

async function handleClose(interaction) {
  const t = await getTicket(interaction.channelId);
  if (!t) {
    return interaction.reply({ embeds: [errorEmbed('Kênh này không phải ticket.')], ephemeral: true });
  }
  if (!(await canManageTicket(interaction, t))) {
    return interaction.reply({ embeds: [errorEmbed('Chỉ chủ ticket hoặc staff mới được đóng.')], ephemeral: true });
  }
  await interaction.reply('🔒 Đang đóng ticket, xuất lịch sử...');
  const channel = interaction.channel;
  const mode = await require('./ticketsPro').finishClose(interaction.client, interaction.guild, channel, t, {
    byId: interaction.user.id, byTag: interaction.user.tag,
  });
  if (mode === 'archived') {
    await interaction.followUp({ content: '📦 Ticket đã lưu trữ (kênh giữ lại, mở lại được bằng nút **Mở lại**).', ephemeral: true }).catch(() => {});
  }
}

async function handleClaim(interaction) {
  const t = await getTicket(interaction.channelId);
  if (!t) {
    return interaction.reply({ embeds: [errorEmbed('Kênh này không phải ticket.')], ephemeral: true });
  }
  const st = await getT(interaction.guildId);
  const isStaff = st.ticketStaffRoleId
    ? interaction.member?.roles?.cache?.has(st.ticketStaffRoleId)
    : interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);
  if (!isStaff) {
    return interaction.reply({ embeds: [errorEmbed('Chỉ staff mới nhận ticket được.')], ephemeral: true });
  }
  t.claimedBy = interaction.user.id;
  t.claimedTag = interaction.user.tag;
  await patchTicket(interaction.channelId, { claimedBy: t.claimedBy, claimedTag: t.claimedTag });
  await interaction.channel.setName(`${interaction.channel.name}-xuly`.slice(0, 90)).catch(() => {});
  await interaction.reply(`✋ ${interaction.user} đã nhận ticket này, <@${t.ownerId}> chờ chút nhé!`);
}

// ===== ĐÁNH GIÁ SAO =====
async function handleRate(interaction) {
  // customId mới: ticket-rate:<sao>:<guildId>:<channelId> — bản cũ (chỉ ownerId) vẫn nhận,
  // rơi vào khóa legacy:<userId> như trước.
  const parts = (interaction.customId || '').split(':');
  const n = parseInt(parts[1], 10);
  if (!n || n < 1 || n > 5) return;
  const guildId = parts.length >= 4 ? parts[2] : null;
  const channelId = parts.length >= 4 ? parts[3] : null;
  const db = readJson(RATINGS_FILE, {});
  const key = guildId && channelId ? `${guildId}:${channelId}` : `legacy:${interaction.user.id}`;
  db[key] = { guildId, channelId, userId: interaction.user.id, stars: n, at: Date.now() };
  writeJsonAtomic(RATINGS_FILE, db);
  await interaction.update({ content: `Cảm ơn bạn đã đánh giá **${n}⭐**!`, components: [] }).catch(() => {});
  // Chỉ log vào ĐÚNG server của ticket (trước đây vòng qua mọi guild bot tham gia,
  // gửi log đánh giá sang cả kênh log của server khác)
  try {
    if (guildId) {
      const g = interaction.client.guilds.cache.get(guildId);
      if (g) require('./logger').logMod(g, `⭐ ${interaction.user.tag} đánh giá ticket ${n}/5`).catch(() => {});
    }
  } catch {}
}

// ===== QUẢN LÝ: add / remove / rename =====
async function handleAdd(interaction, user) {
  const t = await getTicket(interaction.channelId);
  if (!t) {
    return interaction.reply({ embeds: [errorEmbed('Kênh này không phải ticket.')], ephemeral: true });
  }
  if (!(await canManageTicket(interaction, t))) {
    return interaction.reply({ embeds: [errorEmbed('Chỉ chủ ticket hoặc staff mới thêm người vào ticket.')], ephemeral: true });
  }
  await interaction.channel.permissionOverwrites.edit(user.id, {
    ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
  });
  await interaction.reply(`✅ Đã thêm ${user} vào ticket.`);
}

async function handleRemove(interaction, user) {
  const t = await getTicket(interaction.channelId);
  if (!t) return interaction.reply({ embeds: [errorEmbed('Kênh này không phải ticket.')], ephemeral: true });
  if (user.id === t.ownerId) return interaction.reply({ embeds: [errorEmbed('Không thể xóa chủ ticket.')], ephemeral: true });
  if (!(await canManageTicket(interaction, t))) {
    return interaction.reply({ embeds: [errorEmbed('Chỉ chủ ticket hoặc staff mới xóa người khỏi ticket.')], ephemeral: true });
  }
  await interaction.channel.permissionOverwrites.delete(user.id).catch(() => {});
  await interaction.reply(`✅ Đã xóa ${user} khỏi ticket.`);
}

async function handleRename(interaction, name) {
  const t = await getTicket(interaction.channelId);
  if (!t) {
    return interaction.reply({ embeds: [errorEmbed('Kênh này không phải ticket.')], ephemeral: true });
  }
  if (!(await canManageTicket(interaction, t))) {
    return interaction.reply({ embeds: [errorEmbed('Chỉ chủ ticket hoặc staff mới đổi tên ticket.')], ephemeral: true });
  }
  const clean = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 90);
  await interaction.channel.setName(clean);
  await interaction.reply(`✅ Đã đổi tên thành **${clean}**.`);
}

function isTicketChannel(channelId) {
  // LƯU Ý: bản đồng bộ này chỉ đọc JSON — ở chế độ Mongo nó không thấy ticket.
  // Hiện không còn call site nào dùng; cần kiểm tra ticket thì dùng getTicket().
  return !!load()[channelId];
}

// ===== KÊNH PANEL RIÊNG (khóa chat, chỉ bấm nút) =====
// Member vẫn bấm được select menu / nút khi chỉ có ViewChannel (không cần SendMessages).
async function lockPanelChannel(channel, guild) {
  const st = await getT(guild.id);
  const overwrites = [
    {
      id: guild.id, // @everyone: chỉ xem + bấm, không chat
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
      deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads, PermissionFlagsBits.SendMessagesInThreads],
    },
    {
      id: guild.client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory],
    },
  ];
  if (st.ticketStaffRoleId) {
    overwrites.push({
      id: st.ticketStaffRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }
  await channel.permissionOverwrites.set(overwrites).catch(() => {});
}

async function createPanelChannel(guild, name) {
  const clean = `🎫・${name}`.toLowerCase().replace(/[^a-z0-9-・🎫]/g, '').slice(0, 90) || '🎫・mo-ticket';
  const channel = await guild.channels.create({
    name: clean,
    type: ChannelType.GuildText,
    topic: 'Kênh mở ticket — chọn loại bên dưới, không chat ở đây.',
  });
  await lockPanelChannel(channel, guild);
  return channel;
}

module.exports = {
  TICKET_TYPES, setupComponents, setupSelectComponents, setupEmbed, setupRow, ticketRow, ratingRow,
  handleSelect, handleModal, handleCreate, handleClose, handleClaim,
  handleTranscript, handleRate, handleAdd, handleRemove, handleRename,
  isTicketChannel, generateTranscript, lockPanelChannel, createPanelChannel,
  load, save, getTicket, putTicket, patchTicket, removeTicket, listTickets, findOpenTicketByOwner, getT, canManageTicket,
};
