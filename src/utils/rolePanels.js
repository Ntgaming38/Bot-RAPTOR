const fs = require('node:fs');
const path = require('node:path');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embed } = require('./embeds');

const FILE = path.join(__dirname, '..', '..', 'data', 'roles.json');
const MAX_ITEMS = 25; // Discord: tối đa 5 hàng x 5 nút

function loadAll() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch { return {}; }
}
function saveAll(db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}
function useMongo() {
  try {
    return require('../db').isMongo();
  } catch { return false; }
}

async function getPanel(guildId) {
  if (useMongo()) {
    const { RolePanel } = require('../db');
    return (await RolePanel.findOne({ guildId }).lean()) || {};
  }
  return loadAll()[guildId] || {};
}

async function savePanel(guildId, patch) {
  const clean = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) clean[k] = v;
  }
  if (useMongo()) {
    const { RolePanel } = require('../db');
    await RolePanel.updateOne({ guildId }, { $set: clean }, { upsert: true });
    return getPanel(guildId);
  }
  const all = loadAll();
  all[guildId] = { ...(all[guildId] || {}), ...clean };
  saveAll(all);
  return getPanel(guildId);
}

async function clearPanel(guildId) {
  if (useMongo()) {
    const { RolePanel } = require('../db');
    await RolePanel.deleteOne({ guildId });
  } else {
    const all = loadAll();
    delete all[guildId];
    saveAll(all);
  }
}

function panelEmbed(guild, panel) {
  return embed({
    title: panel.title || '🎮 CHỌN ROLE',
    description: panel.description || 'Bấm nút bên dưới để nhận / bỏ role.',
    footer: guild ? guild.name : undefined,
  });
}

function buildRows(items, withEmoji = true) {
  const rows = [];
  for (let i = 0; i < items.length && rows.length < 5; i += 5) {
    const row = new ActionRowBuilder();
    for (const it of items.slice(i, i + 5)) {
      const btn = new ButtonBuilder()
        .setCustomId(`role-toggle:${it.roleId}`)
        .setLabel((it.label || 'Role').slice(0, 80))
        .setStyle(ButtonStyle.Secondary);
      if (withEmoji && it.emoji) {
        try { btn.setEmoji(it.emoji); } catch {}
      }
      row.addComponents(btn);
    }
    rows.push(row);
  }
  return rows;
}

// Vẽ lại bảng (gửi mới hoặc sửa tin cũ). Thử có emoji trước, lỗi thì vẽ lại không emoji.
async function renderPanel(client, guildId) {
  const panel = await getPanel(guildId);
  if (!panel.channelId || !panel.items?.length) return null;
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return null;
  const ch = await guild.channels.fetch(panel.channelId).catch(() => null);
  if (!ch?.isTextBased()) {
    console.warn('[roles] không tìm thấy kênh', panel.channelId);
    return null;
  }
  const data = { embeds: [panelEmbed(guild, panel)] };
  let rows = buildRows(panel.items, true);
  let msg = null;
  if (panel.messageId) msg = await ch.messages.fetch(panel.messageId).catch(() => null);
  try {
    msg = msg
      ? await msg.edit({ ...data, components: rows }).catch(() => null)
      : await ch.send({ ...data, components: rows }).catch(() => null);
  } catch {}
  if (!msg) {
    // Emoji lỗi → vẽ lại không emoji
    rows = buildRows(panel.items, false);
    msg = panel.messageId
      ? await ch.messages.fetch(panel.messageId).then((m) => m.edit({ ...data, components: rows })).catch(() => null)
      : await ch.send({ ...data, components: rows }).catch(() => null);
  }
  if (msg && msg.id !== panel.messageId) await savePanel(guildId, { messageId: msg.id });
  return msg;
}

// Member bấm nút: có role thì bỏ, chưa có thì nhận
async function handleToggle(interaction, roleId) {
  const { errorEmbed } = require('./embeds');
  const guild = interaction.guild;
  const role = await guild.roles.fetch(roleId).catch(() => null);
  if (!role) {
    return interaction.reply({ embeds: [errorEmbed('Role này không còn tồn tại. Báo admin cập nhật bảng.')], ephemeral: true });
  }
  if (role.managed || role.id === guild.id) {
    return interaction.reply({ embeds: [errorEmbed('Role này không thể tự nhận.')], ephemeral: true });
  }
  const me = guild.members.me;
  if (me && (role.position >= me.roles.highest.position || !me.permissions.has('ManageRoles'))) {
    return interaction.reply({ embeds: [errorEmbed('Bot không gắn được role này. Bảo admin kéo role của bot lên trên role đó.')], ephemeral: true });
  }
  const member = interaction.member;
  try {
    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role);
      return interaction.reply({ content: `➖ Đã bỏ role **${role.name}**.`, ephemeral: true });
    }
    await member.roles.add(role);
    return interaction.reply({ content: `✅ Đã nhận role **${role.name}**!`, ephemeral: true });
  } catch {
    return interaction.reply({ embeds: [errorEmbed('Không gắn được role. Kiểm tra phân quyền của bot.')], ephemeral: true });
  }
}

module.exports = { getPanel, savePanel, clearPanel, renderPanel, handleToggle, MAX_ITEMS };
