// /help tương tác: bảng chọn mục (select menu) → chọn mục nào xổ ra lệnh của mục đó.
// Chỉ người gọi /help mới điều khiển được menu của mình (userId gắn trong customId).
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

const CATEGORIES = [
  { key: 'moderation', label: 'Quản trị', emoji: '🛡️', desc: 'Ban, kick, khóa kênh, cảnh cáo...' },
  { key: 'music', label: 'Nhạc', emoji: '🎵', desc: 'Phát nhạc, hàng đợi, playlist, lời bài hát' },
  { key: 'fun', label: 'Vui vẻ & Kinh tế', emoji: '🎉', desc: 'Credits, shop, gacha, nhiệm vụ, poll...' },
  { key: 'level', label: 'Cấp độ (Level)', emoji: '🏆', desc: 'Rank, bảng xếp hạng, XP' },
  { key: 'ticket', label: 'Ticket hỗ trợ', emoji: '🎫', desc: 'Mở và quản lý ticket' },
  { key: 'giveaway', label: 'Giveaway', emoji: '🎁', desc: 'Tổ chức bốc thăm trúng thưởng' },
  { key: 'utility', label: 'Tiện ích & Hệ thống', emoji: '🧰', desc: 'Thông tin server, nhắc việc, voice tạm...' },
];
const CAT_KEYS = new Set(CATEGORIES.map((c) => c.key));

function catOf(cmd) {
  switch (cmd.group) {
    case 'moderation': return 'moderation';
    case 'nhạc':
    case 'music': return 'music';
    case 'fun': return 'fun';
    case 'level': return 'level';
    case 'ticket': return 'ticket';
    case 'giveaway': return 'giveaway';
    default: return 'utility';
  }
}

function linesFor(cmd) {
  const out = [];
  let json = null;
  try { json = cmd.data.toJSON(); } catch {}
  const subs = (json?.options || []).filter((o) => o.type === 1 || o.type === 2);
  if (!subs.length) {
    out.push(`**/${cmd.data.name}** — ${cmd.data.description || ''}`);
  } else {
    for (const s of subs) {
      if (s.type === 1) out.push(`**/${cmd.data.name} ${s.name}** — ${s.description || ''}`);
      else if (s.type === 2) for (const ss of (s.options || [])) out.push(`**/${cmd.data.name} ${s.name} ${ss.name}** — ${ss.description || ''}`);
    }
  }
  return out;
}

function grouped(client) {
  const map = new Map(CATEGORIES.map((c) => [c.key, []]));
  const cmds = [...client.commands.values()].sort((a, b) => a.data.name.localeCompare(b.data.name));
  for (const cmd of cmds) map.get(catOf(cmd)).push(cmd);
  return map;
}

function menuRow(userId, current) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`help:cat:${userId}`)
    .setPlaceholder('📂 Chọn một mục để xem lệnh...')
    .addOptions([
      { label: 'Trang chủ trợ giúp', value: 'home', emoji: '🏠', description: 'Xem tất cả các mục', default: current === 'home' },
      ...CATEGORIES.map((c) => ({ label: c.label, value: c.key, emoji: c.emoji, description: c.desc, default: current === c.key })),
    ]);
  return new ActionRowBuilder().addComponents(menu);
}

function buildHome(client, userId) {
  const map = grouped(client);
  const total = [...client.commands.values()].length;
  const lines = CATEGORIES.map((c) => `${c.emoji} **${c.label}** — ${map.get(c.key).length} lệnh · ${c.desc}`);
  const embed = new EmbedBuilder()
    .setColor(0xd63031)
    .setTitle('📖 RAPTOR — Trợ giúp')
    .setDescription(`Bot có **${total} lệnh** chia theo ${CATEGORIES.length} mục dưới đây.\nChọn một mục trong menu để xổ ra các lệnh trong mục đó.\n\n${lines.join('\n')}`)
    .setFooter({ text: 'Mẹo: bấm / rồi gõ tên lệnh để Discord gợi ý cách dùng.' });
  return { embeds: [embed], components: [menuRow(userId, 'home')] };
}

function buildCategory(client, userId, key) {
  const cat = CATEGORIES.find((c) => c.key === key) || CATEGORIES[0];
  const map = grouped(client);
  const cmds = map.get(cat.key) || [];
  const lines = cmds.flatMap(linesFor);
  const FIELD_LIMIT = 1000;
  const fields = [];
  let chunk = [];
  let len = 0;
  const flush = () => {
    if (!chunk.length) return;
    fields.push({ name: fields.length === 0 ? `${cat.emoji} ${cat.label} (${cmds.length} lệnh)` : `${cat.emoji} ${cat.label} (tiếp)`, value: chunk.join('\n') });
    chunk = [];
    len = 0;
  };
  for (const line of lines) {
    const l = line.length > FIELD_LIMIT ? line.slice(0, FIELD_LIMIT - 1) + '…' : line;
    if (len + l.length + 1 > FIELD_LIMIT) flush();
    chunk.push(l);
    len += l.length + 1;
  }
  flush();
  const embed = new EmbedBuilder()
    .setColor(0xd63031)
    .setTitle(`📖 Trợ giúp — ${cat.label}`)
    .setDescription(cat.desc)
    .addFields(fields.slice(0, 25))
    .setFooter({ text: 'Chọn mục khác trong menu bên dưới để chuyển mục, hoặc về Trang chủ.' });
  return { embeds: [embed], components: [menuRow(userId, cat.key)] };
}

async function handleSelect(interaction) {
  const ownerId = (interaction.customId || '').split(':')[2];
  if (ownerId && ownerId !== interaction.user.id) {
    return interaction.reply({ content: 'Menu trợ giúp này là của người khác — gõ /help để mở menu của riêng bạn nhé.', ephemeral: true }).catch(() => {});
  }
  const value = interaction.values?.[0] || 'home';
  const payload = value === 'home' || !CAT_KEYS.has(value)
    ? buildHome(interaction.client, interaction.user.id)
    : buildCategory(interaction.client, interaction.user.id, value);
  await interaction.update(payload).catch(() => {});
}

module.exports = { buildHome, buildCategory, handleSelect, CATEGORIES };
