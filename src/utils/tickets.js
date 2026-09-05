const fs = require('node:fs');
const path = require('node:path');
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelType, PermissionFlagsBits,
  StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const { embed, errorEmbed } = require('./embeds');
const config = require('../config');

const FILE = path.join(__dirname, '..', '..', 'data', 'tickets.json');
const RATINGS_FILE = path.join(__dirname, '..', '..', 'data', 'ticket-ratings.json');

// Các loại ticket — thêm/sửa tùy ý. Mỗi loại 1 emoji + mô tả riêng.
const TICKET_TYPES = [
  { id: 'hotro', label: 'Hỗ trợ chung', description: 'Hỏi đáp, cần giúp đỡ', emoji: '🛠️' },
  { id: 'tocao', label: 'Tố cáo', description: 'Báo cáo vi phạm, scam', emoji: '🚨' },
  { id: 'napthe', label: 'Nạp / Mua hàng', description: 'Thanh toán, đơn hàng', emoji: '💳' },
  { id: 'tuyen', label: 'Tuyển staff / Đối tác', description: 'Ứng tuyển, hợp tác', emoji: '🤝' },
];

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

// ===== PANEL 1 NÚT "Mở Ticket" (kiểu tickets.bot trong hình) =====
// Member chỉ cần bấm nút → điền lý do → dùng ngay.
function setupComponents() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket-create').setLabel('Mở Ticket').setEmoji('🎫').setStyle(ButtonStyle.Primary),
  )];
}

function setupEmbed() {
  return embed({
    title: '🎫 Bạn cần hỗ trợ - hãy mở ticket!',
    description: [
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
    ].join('\n'),
    thumbnail: config.ticketPanelImageUrl || undefined,
    footer: 'Mỗi người chỉ có 1 ticket mở cùng lúc',
  });
}

// Giữ select menu nhiều loại (nếu sever nào thích chia loại thì dùng)
function setupSelectComponents() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket-select')
    .setPlaceholder('📩 Hoặc chọn loại ticket...')
    .addOptions(TICKET_TYPES.map(t => ({
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

function ticketRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket-claim').setLabel('Nhận').setEmoji('✋').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket-transcript').setLabel('Lịch sử').setEmoji('📝').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket-close').setLabel('Đóng').setEmoji('🔒').setStyle(ButtonStyle.Danger),
  );
}

function ratingRow(ownerId) {
  const row = new ActionRowBuilder();
  for (let i = 1; i <= 5; i++) {
    row.addComponents(
      new ButtonBuilder().setCustomId(`ticket-rate:${i}:${ownerId}`).setLabel(`${i}⭐`).setStyle(ButtonStyle.Secondary),
    );
  }
  return row;
}

// ===== CHỌN LOẠI → HIỆN FORM =====
async function handleSelect(interaction) {
  const typeId = interaction.values?.[0];
  const type = TICKET_TYPES.find(t => t.id === typeId) || TICKET_TYPES[0];

  const db = load();
  const existing = Object.entries(db).find(([, t]) => t.guildId === interaction.guildId && t.ownerId === interaction.user.id);
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
  const type = TICKET_TYPES.find(t => t.id === typeId) || TICKET_TYPES[0];
  const reason = interaction.fields.getTextInputValue('lydo')?.slice(0, 1000) || 'Không có';
  await createTicket(interaction, type, reason);
}

async function createTicket(interaction, type, reason) {
  await interaction.deferReply({ ephemeral: true });

  const overwrites = [
    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
  ];
  if (config.ticketStaffRoleId) {
    overwrites.push({ id: config.ticketStaffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  }

  const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20) || 'user';
  const channel = await interaction.guild.channels.create({
    name: `${type.id}-${safeName}`.slice(0, 90),
    type: ChannelType.GuildText,
    parent: config.ticketCategoryId || null,
    permissionOverwrites: overwrites,
    topic: `Ticket ${type.label} của ${interaction.user.tag} | Lý do: ${reason.slice(0, 200)}`,
  }).catch(() => interaction.guild.channels.create({
    name: `${type.id}-${safeName}`.slice(0, 90),
    type: ChannelType.GuildText,
    permissionOverwrites: overwrites,
  }));

  const db = load();
  db[channel.id] = {
    ownerId: interaction.user.id, ownerTag: interaction.user.tag,
    guildId: interaction.guildId, type: type.id, typeLabel: type.label,
    reason, createdAt: Date.now(), claimedBy: null,
  };
  save(db);

  await channel.send({
    content: `${interaction.user} ${config.ticketStaffRoleId ? `<@&${config.ticketStaffRoleId}>` : ''}`,
    embeds: [embed({
      title: `${type.emoji} ${type.label} — ${interaction.user.username}`,
      description: `**Lý do:**\n\`\`\`${reason}\`\`\`\nStaff sẽ hỗ trợ bạn sớm.\n\n✋ **Nhận** — staff nhận xử lý\n📝 **Lịch sử** — xuất transcript\n🔒 **Đóng** — đóng ticket khi xong`,
      footer: `Mở lúc`,
    })],
    components: [ticketRow()],
  });

  try {
    require('./logger').logMod(interaction.guild, `🎫 Mở ticket ${channel} (${type.label}) bởi ${interaction.user.tag}`, reason);
  } catch {}

  await interaction.editReply({ content: `✅ Đã tạo ticket ${channel}\nLoại: **${type.label}**` });
}

// Tương thích nút cũ
async function handleCreate(interaction) {
  const db = load();
  const existing = Object.entries(db).find(([, t]) => t.guildId === interaction.guildId && t.ownerId === interaction.user.id);
  if (existing) {
    return interaction.reply({ content: `⚠️ Bạn đã có ticket mở: <#${existing[0]}>`, ephemeral: true });
  }
  // Mở thẳng form loại mặc định
  const type = TICKET_TYPES[0];
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
  const db = load();
  if (!db[interaction.channelId]) {
    return interaction.reply({ embeds: [errorEmbed('Kênh này không phải ticket.')], ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });
  const { file, count } = await generateTranscript(interaction.channel);
  await interaction.editReply({ content: `📝 Đã xuất ${count} tin nhắn:`, files: [file] }).catch(async () => {
    await interaction.editReply({ content: '❌ Không xuất được transcript.' });
  });
}

// ===== ĐÓNG (kèm transcript + gửi DM + đánh giá) =====
function canManageTicket(interaction, t) {
  if (t.ownerId === interaction.user.id) return true;
  if (config.ticketStaffRoleId && interaction.member?.roles?.cache?.has(config.ticketStaffRoleId)) return true;
  return !!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);
}

async function handleClose(interaction) {
  const db = load();
  const t = db[interaction.channelId];
  if (!t) {
    return interaction.reply({ embeds: [errorEmbed('Kênh này không phải ticket.')], ephemeral: true });
  }
  if (!canManageTicket(interaction, t)) {
    return interaction.reply({ embeds: [errorEmbed('Chỉ chủ ticket hoặc staff mới được đóng.')], ephemeral: true });
  }
  await interaction.reply('🔒 Đang đóng ticket, xuất lịch sử...');
  const channel = interaction.channel;
  let file = null;
  try {
    ({ file } = await generateTranscript(channel));
  } catch {}

  // Gửi transcript vào kênh log
  try {
    const logger = require('./logger');
    await logger.logMod(interaction.guild, `🔒 Đóng ticket #${channel.name} (${t.typeLabel || ''}) bởi ${interaction.user.tag}`);
    if (file && config.logChannelId) {
      const logCh = await interaction.guild.channels.fetch(config.logChannelId).catch(() => null);
      if (logCh?.isTextBased()) await logCh.send({ content: `📝 Transcript #${channel.name} (${t.ownerTag})`, files: [file] }).catch(() => {});
    }
  } catch {}

  // DM cho chủ ticket kèm transcript + form đánh giá
  try {
    const owner = await interaction.client.users.fetch(t.ownerId).catch(() => null);
    if (owner) {
      await owner.send({
        content: `Ticket **#${channel.name}** của bạn đã được đóng. Cảm ơn bạn! Hãy đánh giá hỗ trợ 👇`,
        components: [ratingRow(t.ownerId)],
      }).catch(() => {});
      if (file) await owner.send({ content: '📝 Lịch sử ticket của bạn:', files: [file] }).catch(() => {});
    }
  } catch {}

  delete db[interaction.channelId];
  save(db);
  setTimeout(() => channel.delete().catch(() => {}), 5000);
}

async function handleClaim(interaction) {
  const db = load();
  const t = db[interaction.channelId];
  if (!t) {
    return interaction.reply({ embeds: [errorEmbed('Kênh này không phải ticket.')], ephemeral: true });
  }
  const isStaff = config.ticketStaffRoleId
    ? interaction.member?.roles?.cache?.has(config.ticketStaffRoleId)
    : interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);
  if (!isStaff) {
    return interaction.reply({ embeds: [errorEmbed('Chỉ staff mới nhận ticket được.')], ephemeral: true });
  }
  t.claimedBy = interaction.user.id;
  t.claimedTag = interaction.user.tag;
  db[interaction.channelId] = t;
  save(db);
  await interaction.channel.setName(`${interaction.channel.name}-xuly`.slice(0, 90)).catch(() => {});
  await interaction.reply(`✋ ${interaction.user} đã nhận ticket này, <@${t.ownerId}> chờ chút nhé!`);
}

// ===== ĐÁNH GIÁ SAO =====
async function handleRate(interaction) {
  const [, stars] = (interaction.customId || '').split(':');
  const n = parseInt(stars, 10);
  if (!n || n < 1 || n > 5) return;
  let db = {};
  try {
    if (fs.existsSync(RATINGS_FILE)) db = JSON.parse(fs.readFileSync(RATINGS_FILE, 'utf8'));
  } catch { db = {}; }
  db[interaction.user.id] = { stars: n, at: Date.now() };
  fs.mkdirSync(path.dirname(RATINGS_FILE), { recursive: true });
  fs.writeFileSync(RATINGS_FILE, JSON.stringify(db, null, 2));
  await interaction.update({ content: `Cảm ơn bạn đã đánh giá **${n}⭐**!`, components: [] }).catch(() => {});
  try {
    const guilds = [...interaction.client.guilds.cache.values()];
    for (const g of guilds) {
      require('./logger').logMod(g, `⭐ ${interaction.user.tag} đánh giá ticket ${n}/5`).catch(() => {});
    }
  } catch {}
}

// ===== QUẢN LÝ: add / remove / rename =====
async function handleAdd(interaction, user) {
  const db = load();
  if (!db[interaction.channelId]) {
    return interaction.reply({ embeds: [errorEmbed('Kênh này không phải ticket.')], ephemeral: true });
  }
  await interaction.channel.permissionOverwrites.edit(user.id, {
    ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
  });
  await interaction.reply(`✅ Đã thêm ${user} vào ticket.`);
}

async function handleRemove(interaction, user) {
  const db = load();
  const t = db[interaction.channelId];
  if (!t) return interaction.reply({ embeds: [errorEmbed('Kênh này không phải ticket.')], ephemeral: true });
  if (user.id === t.ownerId) return interaction.reply({ embeds: [errorEmbed('Không thể xóa chủ ticket.')], ephemeral: true });
  await interaction.channel.permissionOverwrites.delete(user.id).catch(() => {});
  await interaction.reply(`✅ Đã xóa ${user} khỏi ticket.`);
}

async function handleRename(interaction, name) {
  const db = load();
  if (!db[interaction.channelId]) {
    return interaction.reply({ embeds: [errorEmbed('Kênh này không phải ticket.')], ephemeral: true });
  }
  const clean = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 90);
  await interaction.channel.setName(clean);
  await interaction.reply(`✅ Đã đổi tên thành **${clean}**.`);
}

function isTicketChannel(channelId) {
  return !!load()[channelId];
}

// ===== KÊNH PANEL RIÊNG (khóa chat, chỉ bấm nút) =====
// Member vẫn bấm được select menu / nút khi chỉ có ViewChannel (không cần SendMessages).
async function lockPanelChannel(channel, guild) {
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
  if (config.ticketStaffRoleId) {
    overwrites.push({
      id: config.ticketStaffRoleId,
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
  TICKET_TYPES, setupComponents, setupSelectComponents, setupEmbed, setupRow, ticketRow,
  handleSelect, handleModal, handleCreate, handleClose, handleClaim,
  handleTranscript, handleRate, handleAdd, handleRemove, handleRename,
  isTicketChannel, generateTranscript, lockPanelChannel, createPanelChannel,
};
