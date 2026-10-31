// Kênh voice tạm kiểu VoiceMaster: vào kênh "tạo phòng" → bot tạo kênh voice riêng,
// kéo người vào, gắn bảng điều khiển (khóa/đổi tên/giới hạn/cho phép/đá/nhận phòng),
// kênh tự xóa khi không còn ai. Cấu hình: guildSettings.tempVoiceCfg trên dashboard.
const {
  ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, UserSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { writeJsonAtomic } = require('./jsonStore');

const FILE = path.join(__dirname, '..', '..', 'data', 'temp-voice.json');
const DEFAULTS = { enabled: false, generatorId: null, categoryId: null, nameTpl: '🎧 Phòng của {user}', defaultLimit: 0, maxPerUser: 1 };

function useMongo() {
  try { return require('../db').isMongo(); } catch { return false; }
}
async function getCfg(guildId) {
  const st = await require('./guildSettings').getGuildSettings(guildId).catch(() => null);
  return { ...DEFAULTS, ...(st?.tempVoiceCfg || {}) };
}

// ---------- Lưu danh sách kênh tạm ----------
function loadRows() {
  try {
    if (!fs.existsSync(FILE)) return [];
    const v = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}
async function rows(guildId) {
  if (useMongo()) {
    const { TempChannel } = require('../db');
    return (await TempChannel.find(guildId ? { guildId } : {}).lean().catch(() => [])).map((r) => ({ guildId: r.guildId, channelId: r.channelId, ownerId: r.ownerId }));
  }
  const all = loadRows();
  return guildId ? all.filter((r) => r.guildId === guildId) : all;
}
async function byChannel(channelId) {
  if (useMongo()) {
    const { TempChannel } = require('../db');
    const d = await TempChannel.findOne({ channelId }).lean().catch(() => null);
    return d ? { guildId: d.guildId, channelId: d.channelId, ownerId: d.ownerId } : null;
  }
  return loadRows().find((r) => r.channelId === channelId) || null;
}
async function addRow(row) {
  if (useMongo()) {
    const { TempChannel } = require('../db');
    await TempChannel.updateOne({ channelId: row.channelId }, { $set: row }, { upsert: true });
    return;
  }
  const all = loadRows().filter((r) => r.channelId !== row.channelId);
  all.push(row);
  writeJsonAtomic(FILE, all);
}
async function removeRow(channelId) {
  if (useMongo()) {
    const { TempChannel } = require('../db');
    await TempChannel.deleteOne({ channelId }).catch(() => {});
    return;
  }
  writeJsonAtomic(FILE, loadRows().filter((r) => r.channelId !== channelId));
}
async function setOwner(channelId, ownerId) {
  if (useMongo()) {
    const { TempChannel } = require('../db');
    await TempChannel.updateOne({ channelId }, { $set: { ownerId } }).catch(() => {});
    return;
  }
  const all = loadRows();
  const r = all.find((x) => x.channelId === channelId);
  if (r) { r.ownerId = ownerId; writeJsonAtomic(FILE, all); }
}

// ---------- Bảng điều khiển ----------
function isLocked(channel) {
  try {
    const ow = channel.permissionOverwrites.cache.get(channel.guild.id);
    return !!ow?.deny?.has?.(PermissionFlagsBits.Connect);
  } catch { return false; }
}
function panelPayload(channel, row) {
  const locked = isLocked(channel);
  const embed = new EmbedBuilder()
    .setColor(0xd63031)
    .setTitle('🎛️ Bảng điều khiển phòng voice')
    .setDescription(
      `Chủ phòng: <@${row.ownerId}>\nTrạng thái: ${locked ? '🔒 Đang khóa (chỉ người được phép mới vào được)' : '🔓 Đang mở'}\nGiới hạn: ${channel.userLimit > 0 ? channel.userLimit + ' người' : 'không giới hạn'}\n\n` +
      'Chủ phòng dùng các nút dưới đây để quản lý phòng. Phòng tự xóa khi mọi người rời hết.\nNếu chủ phòng đã rời, người đang ở trong phòng có thể bấm **👑 Nhận phòng** để tiếp quản.'
    );
  const rowBtns = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(locked ? 'tv:unlock' : 'tv:lock').setLabel(locked ? 'Mở khóa phòng' : 'Khóa phòng').setEmoji(locked ? '🔓' : '🔒').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tv:rename').setLabel('Đổi tên').setEmoji('✏️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tv:limit').setLabel('Giới hạn người').setEmoji('👥').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tv:claim').setLabel('Nhận phòng').setEmoji('👑').setStyle(ButtonStyle.Primary),
  );
  const permitRow = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder().setCustomId('tv:permit').setPlaceholder('✅ Cho phép một người vào phòng (kể cả khi khóa)').setMaxValues(1)
  );
  const kickRow = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder().setCustomId('tv:kick').setPlaceholder('🚫 Đá một người khỏi phòng + chặn vào lại').setMaxValues(1)
  );
  return { embeds: [embed], components: [rowBtns, permitRow, kickRow] };
}

// ---------- Tạo / xóa phòng ----------
async function createTempChannel(member, cfg) {
  const guild = member.guild;
  const generator = guild.channels.cache.get(cfg.generatorId) || await guild.channels.fetch(cfg.generatorId).catch(() => null);
  const parent = (cfg.categoryId && (guild.channels.cache.get(cfg.categoryId) || await guild.channels.fetch(cfg.categoryId).catch(() => null))) || generator?.parent || null;
  const overwrites = [];
  if (parent) {
    for (const ow of parent.permissionOverwrites.cache.values()) overwrites.push({ id: ow.id, allow: ow.allow, deny: ow.deny });
  }
  overwrites.push({
    id: member.id,
    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers],
  });
  const name = (cfg.nameTpl || DEFAULTS.nameTpl).replaceAll('{user}', member.displayName || member.user.username).slice(0, 100) || '🎧 Phòng tạm';
  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent: parent?.id || undefined,
    userLimit: Math.max(0, Math.min(99, parseInt(cfg.defaultLimit, 10) || 0)),
    permissionOverwrites: overwrites,
    reason: `Kênh voice tạm cho ${member.user.tag}`,
  });
  const row = { guildId: guild.id, channelId: channel.id, ownerId: member.id };
  await addRow(row);
  await member.voice.setChannel(channel).catch(() => null);
  if (!member.voice.channel || member.voice.channel.id !== channel.id) {
    // Người dùng đã rời voice trước khi kịp kéo sang → dọn phòng vừa tạo
    await channel.delete('Người tạo đã rời voice').catch(() => {});
    await removeRow(channel.id);
    return null;
  }
  await channel.send(panelPayload(channel, row)).catch(() => {});
  require('./activity').record(guild.id, 'voice', `@${member.user.tag} tạo kênh voice tạm “${name}”`).catch(() => {});
  return channel;
}

async function deleteIfEmpty(channel) {
  const row = await byChannel(channel.id);
  if (!row) return false;
  const fresh = channel.guild.channels.cache.get(channel.id) || await channel.guild.channels.fetch(channel.id).catch(() => null);
  if (!fresh) { await removeRow(channel.id); return true; }
  if (fresh.members.size === 0) {
    await fresh.delete('Kênh voice tạm trống').catch(() => {});
    await removeRow(channel.id);
    return true;
  }
  return false;
}

// ---------- Sự kiện voice ----------
async function onVoiceState(oldState, newState) {
  const guild = newState.guild || oldState.guild;
  if (!guild) return;
  const member = newState.member || oldState.member;
  // 1) Rời kênh tạm → trống thì xóa; chủ rời mà còn người → nhắc nhận phòng
  if (oldState.channelId && oldState.channelId !== newState.channelId) {
    const oldCh = oldState.channel;
    if (oldCh) {
      const row = await byChannel(oldCh.id).catch(() => null);
      if (row) {
        const emptied = await deleteIfEmpty(oldCh).catch(() => false);
        if (!emptied && row.ownerId === member?.id && oldCh.members.size > 0) {
          await oldCh.send('👑 Chủ phòng vừa rời đi. Ai đang ở trong phòng có thể dùng nút **Nhận phòng** trong bảng điều khiển để tiếp quản phòng này.').catch(() => {});
        }
      }
    }
  }
  // 2) Vào kênh tạo phòng → sinh phòng tạm
  if (newState.channelId && newState.channelId !== oldState.channelId && member && !member.user.bot) {
    const cfg = await getCfg(guild.id);
    if (!cfg.enabled || !cfg.generatorId || newState.channelId !== cfg.generatorId) return;
    const mine = (await rows(guild.id)).filter((r) => r.ownerId === member.id);
    const max = Math.max(1, parseInt(cfg.maxPerUser, 10) || 1);
    if (mine.length >= max) {
      const existing = guild.channels.cache.get(mine[0].channelId);
      if (existing) {
        await member.voice.setChannel(existing).catch(() => {});
        return;
      }
      await removeRow(mine[0].channelId);
    }
    await createTempChannel(member, cfg).catch((e) => console.warn('[tempVoice] tạo kênh lỗi:', e?.message));
  }
}

// ---------- Tương tác panel ----------
async function needRow(interaction) {
  const row = await byChannel(interaction.channelId);
  if (!row) {
    await interaction.reply({ content: 'Phòng này không còn được bot quản lý nữa.', ephemeral: true }).catch(() => {});
    return null;
  }
  return row;
}
function notOwner(interaction) {
  return interaction.reply({ content: '🔒 Chỉ **chủ phòng** mới dùng được chức năng này.', ephemeral: true }).catch(() => {});
}

async function handleButton(interaction) {
  const row = await needRow(interaction);
  if (!row) return;
  const channel = interaction.channel;
  const action = (interaction.customId || '').split(':')[1];
  if (action === 'claim') {
    if (row.ownerId === interaction.user.id) return interaction.reply({ content: 'Bạn đang là chủ phòng rồi.', ephemeral: true }).catch(() => {});
    if (channel.members.has(row.ownerId)) return interaction.reply({ content: 'Chủ phòng vẫn đang ở trong phòng — chưa nhận phòng được.', ephemeral: true }).catch(() => {});
    if (!channel.members.has(interaction.user.id)) return interaction.reply({ content: 'Bạn phải đang ở trong phòng này mới nhận phòng được.', ephemeral: true }).catch(() => {});
    const oldOwner = row.ownerId;
    await setOwner(channel.id, interaction.user.id);
    await channel.permissionOverwrites.edit(oldOwner, { ManageChannels: null, MoveMembers: null }).catch(() => {});
    await channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, Connect: true, Speak: true, ManageChannels: true, MoveMembers: true }).catch(() => {});
    await interaction.reply({ content: `👑 ${interaction.user} đã **nhận phòng** và trở thành chủ phòng mới!` }).catch(() => {});
    await channel.send(panelPayload(channel, { ...row, ownerId: interaction.user.id })).catch(() => {});
    return;
  }
  if (row.ownerId !== interaction.user.id) return notOwner(interaction);
  if (action === 'lock') {
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
    await interaction.reply({ content: '🔒 Đã **khóa phòng** — chỉ người được cho phép mới vào được. Dùng ô “Cho phép” bên dưới để mời thêm người.', ephemeral: true }).catch(() => {});
    await channel.send(panelPayload(channel, row)).catch(() => {});
    return;
  }
  if (action === 'unlock') {
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: null });
    await interaction.reply({ content: '🔓 Đã **mở khóa phòng** — mọi người vào tự do.', ephemeral: true }).catch(() => {});
    await channel.send(panelPayload(channel, row)).catch(() => {});
    return;
  }
  if (action === 'rename') {
    const modal = new ModalBuilder().setCustomId('tv-modal:rename').setTitle('Đổi tên phòng');
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('name').setLabel('Tên phòng mới (tối đa 100 ký tự)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100).setValue(channel.name.slice(0, 100))
    ));
    await interaction.showModal(modal).catch(() => {});
    return;
  }
  if (action === 'limit') {
    const modal = new ModalBuilder().setCustomId('tv-modal:limit').setTitle('Giới hạn số người trong phòng');
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('limit').setLabel('Số người tối đa (0 = không giới hạn, tối đa 99)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(2).setValue(String(channel.userLimit || 0))
    ));
    await interaction.showModal(modal).catch(() => {});
    return;
  }
}

async function handleModal(interaction) {
  const row = await needRow(interaction);
  if (!row) return;
  if (row.ownerId !== interaction.user.id) return notOwner(interaction);
  const channel = interaction.channel;
  const kind = (interaction.customId || '').split(':')[1];
  if (kind === 'rename') {
    const name = interaction.fields.getTextInputValue('name').trim().slice(0, 100);
    if (!name) return interaction.reply({ content: 'Tên phòng không được để trống.', ephemeral: true }).catch(() => {});
    await channel.setName(name);
    await interaction.reply({ content: `✏️ Đã đổi tên phòng thành **${name}**.`, ephemeral: true }).catch(() => {});
  } else if (kind === 'limit') {
    const n = parseInt(interaction.fields.getTextInputValue('limit'), 10);
    if (!Number.isFinite(n) || n < 0 || n > 99) return interaction.reply({ content: 'Số không hợp lệ — nhập từ 0 đến 99.', ephemeral: true }).catch(() => {});
    await channel.setUserLimit(n);
    await interaction.reply({ content: n > 0 ? `👥 Đã đặt giới hạn **${n} người**.` : '👥 Đã bỏ giới hạn số người.', ephemeral: true }).catch(() => {});
  }
}

async function handleUserSelect(interaction) {
  const row = await needRow(interaction);
  if (!row) return;
  if (row.ownerId !== interaction.user.id) return notOwner(interaction);
  const channel = interaction.channel;
  const targetId = interaction.values?.[0];
  if (!targetId) return;
  const target = await interaction.guild.members.fetch(targetId).catch(() => null);
  if (!target) return interaction.reply({ content: 'Không tìm thấy người này trong server.', ephemeral: true }).catch(() => {});
  const kind = (interaction.customId || '').split(':')[1];
  if (kind === 'permit') {
    await channel.permissionOverwrites.edit(target.id, { Connect: true, ViewChannel: true });
    await interaction.reply({ content: `✅ Đã cho phép ${target} vào phòng này (kể cả khi phòng khóa).`, ephemeral: true }).catch(() => {});
  } else if (kind === 'kick') {
    if (target.id === row.ownerId) return interaction.reply({ content: 'Không thể đá chủ phòng.', ephemeral: true }).catch(() => {});
    if (target.voice?.channelId === channel.id) await target.voice.disconnect('Bị chủ phòng đá').catch(() => {});
    await channel.permissionOverwrites.edit(target.id, { Connect: false });
    await interaction.reply({ content: `🚫 Đã đá ${target} khỏi phòng và chặn vào lại. Muốn cho vào lại, dùng ô “Cho phép”.`, ephemeral: true }).catch(() => {});
  }
}

// ---------- Dọn dẹp khi bot khởi động ----------
async function reconcile(client) {
  let removed = 0;
  for (const guild of client.guilds.cache.values()) {
    for (const row of await rows(guild.id)) {
      const ch = guild.channels.cache.get(row.channelId) || await guild.channels.fetch(row.channelId).catch(() => null);
      if (!ch) { await removeRow(row.channelId); removed++; continue; }
      if (ch.members.size === 0) {
        await ch.delete('Dọn kênh voice tạm trống sau restart').catch(() => {});
        await removeRow(row.channelId);
        removed++;
      }
    }
  }
  if (removed) console.log(`[tempVoice] Đã dọn ${removed} kênh voice tạm trống`);
}

module.exports = { getCfg, panelPayload, onVoiceState, handleButton, handleModal, handleUserSelect, reconcile, byChannel, rows, DEFAULTS };
