const config = require('../config');
const { embed } = require('./embeds');

async function getLogChannel(guild) {
  if (!guild) return null;
  let id = config.logChannelId;
  try {
    const st = await require('./guildSettings').getGuildSettings(guild.id).catch(() => null);
    if (st?.logChannelId) id = st.logChannelId;
  } catch {}
  if (!id) return null;
  try {
    const ch = await guild.channels.fetch(id).catch(() => null);
    if (ch?.isTextBased()) return ch;
  } catch {}
  return null;
}

async function send(guild, data) {
  const ch = await getLogChannel(guild);
  if (!ch) return false;
  await ch.send({ embeds: [embed(data)] }).catch(() => {});
  return true;
}

function logMod(guild, text, extra) {
  return send(guild, {
    title: '🛡️ Moderation',
    description: text + (extra ? `\n\`\`\`${String(extra).slice(0, 1500)}\`\`\`` : ''),
    color: 0xFEE75C,
  });
}

function logJoin(member) {
  return send(member.guild, {
    title: '📥 Thành viên vào',
    description: `${member.user.tag} (<@${member.id}>)\nTổng: **${member.guild.memberCount}**`,
    thumbnail: member.user.displayAvatarURL(),
    color: 0x57F287,
  });
}

function logLeave(member) {
  return send(member.guild, {
    title: `👋 ${member.user.tag} vừa rời.`,
    description: `${member} (<@${member.id}>)`,
    thumbnail: member.user.displayAvatarURL(),
    color: 0xED4245,
  });
}

// Ai nhận/bỏ role của ai (kiểu ProBot)
function logRoleChange(guild, user, added, removed, executor) {
  const lines = [];
  if (added.length) lines.push(`**Vai trò thêm:** ${added.map((r) => `${r}`).join(' ')}`);
  if (removed.length) lines.push(`**Vai trò gỡ:** ${removed.map((r) => `${r}`).join(' ')}`);
  if (!lines.length) return Promise.resolve(false);
  return send(guild, {
    title: `🎭 Đã cập nhật cho ${user.tag}`,
    description: `${user} (<@${user.id}>)\n${lines.join('\n')}${executor ? `\n**Người thực hiện:** ${executor}` : ''}`,
    thumbnail: user.displayAvatarURL(),
    color: 0xFEE75C,
  });
}

// Ai sửa kênh gì (tên cũ → mới, kiểu ProBot)
function logChannelUpdate(guild, oldName, newName, channel, executor) {
  return send(guild, {
    title: `🔧 Đã cập nhật kênh: ${newName}`,
    description: `**Kênh:** ${channel}\n**Tên cũ:** ${oldName}\n**Tên mới:** ${newName}${executor ? `\n**Quản lý trách nhiệm:** ${executor}` : ''}`,
    color: 0xFEE75C,
  });
}

function logMessageDelete(message) {
  if (!message.guild || message.author?.bot) return;
  return send(message.guild, {
    title: '🗑️ Xóa tin nhắn',
    description: `**Kênh:** ${message.channel}\n**Tác giả:** ${message.author?.tag || '?'} (<@${message.author?.id}>)\n**Nội dung:**\n${(message.content || '_không có text (ảnh/embed)_').slice(0, 1500)}`,
    color: 0xED4245,
  });
}

function logMessageUpdate(oldMsg, newMsg) {
  if (!newMsg.guild || newMsg.author?.bot) return;
  if ((oldMsg.content || '') === (newMsg.content || '')) return;
  return send(newMsg.guild, {
    title: '✏️ Sửa tin nhắn',
    description: `**Kênh:** ${newMsg.channel} — [Nhảy tới](${newMsg.url})\n**Tác giả:** ${newMsg.author.tag}\n**Trước:**\n${(oldMsg.content || '?').slice(0, 800)}\n**Sau:**\n${(newMsg.content || '?').slice(0, 800)}`,
    color: 0xFEE75C,
  });
}

function logVoice(oldState, newState) {
  const guild = newState.guild || oldState.guild;
  const user = newState.member?.user || oldState.member?.user;
  if (!guild || !user || user.bot) return;
  const oldCh = oldState.channel?.name || null;
  const newCh = newState.channel?.name || null;
  if (oldCh === newCh) return;
  let text;
  if (!oldCh && newCh) text = `🔊 ${user.tag} **vào** voice \`${newCh}\``;
  else if (oldCh && !newCh) text = `🔇 ${user.tag} **rời** voice \`${oldCh}\``;
  else text = `🔀 ${user.tag} chuyển voice \`${oldCh}\` → \`${newCh}\``;
  return send(guild, { title: '🎙️ Voice', description: text });
}

function logBan(guild, user, reason, banned = true) {
  return send(guild, {
    title: banned ? '🔨 Ban' : '♻️ Unban',
    description: `**User:** ${user.tag} (<@${user.id}>)\n**Lý do:** ${reason || 'Không có'}`,
    color: banned ? 0xED4245 : 0x57F287,
  });
}

module.exports = { send, logMod, logJoin, logLeave, logRoleChange, logChannelUpdate, logMessageDelete, logMessageUpdate, logVoice, logBan };
