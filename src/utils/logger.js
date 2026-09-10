const { embed } = require('./embeds');

// Tìm người thực hiện trong Audit Log (cần quyền Xem nhật ký). Bỏ qua nếu do bot làm.
async function findExecutor(guild, type, targetId, skipBot = true) {
  const r = await findExecutorReason(guild, type, targetId, skipBot);
  return r.executor;
}

async function findExecutorReason(guild, type, targetId, skipBot = true) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 3 });
    const hit = logs.entries.find((e) => (!targetId || e.target?.id === targetId) && Date.now() - e.createdTimestamp < 15000);
    if (!hit?.executor) return { executor: null, reason: null };
    if (skipBot && hit.executor.id === guild.client.user.id) return { executor: 'BOT', reason: hit.reason || null };
    return { executor: hit.executor, reason: hit.reason || null };
  } catch {
    return { executor: null, reason: null };
  }
}

async function getLogChannel(guild) {
  if (!guild) return null;
  // Kênh ưu tiên từ /logs setup (kiểu ProBot), fallback .env
  let id = require('../config').logChannelId;
  try {
    const st = await require('./logSettings').getLogSettings(guild.id).catch(() => null);
    if (st?.channelId) id = st.channelId;
  } catch {}
  // Fallback cũ: guildSettings (giữ tương thích)
  if (!id) {
    try {
      const st2 = await require('./guildSettings').getGuildSettings(guild.id).catch(() => null);
      if (st2?.logChannelId) id = st2.logChannelId;
    } catch {}
  }
  if (!id) return null;
  try {
    const ch = await guild.channels.fetch(id).catch(() => null);
    if (ch?.isTextBased()) return ch;
  } catch {}
  return null;
}

// type = 1 trong 19 loại log (null = luôn gửi, vd log ticket). Có timestamp + user + moderator.
async function log(guild, type, { title, description, color, user, moderator, thumbnail, fields } = {}) {
  if (type) {
    const on = await require('./logSettings').isLogEnabled(guild.id, type).catch(() => true);
    if (!on) return false;
  }
  const ch = await getLogChannel(guild);
  if (!ch) return false;
  const desc = description
    + (moderator && moderator !== 'BOT' ? `\n**Người thực hiện:** ${moderator}` : '');
  await ch.send({
    embeds: [embed({
      title, description: desc, color,
      thumbnail: thumbnail || user?.displayAvatarURL?.(),
      fields,
      footer: user ? `${user.tag} • ${user.id}` : undefined,
    })],
  }).catch(() => {});
  return true;
}

function send(guild, data) {
  return getLogChannel(guild).then((ch) => {
    if (!ch) return false;
    return ch.send({ embeds: [embed(data)] }).then(() => true).catch(() => false);
  });
}

// Tương thích code cũ (logMod/ticket... luôn gửi khi có kênh)
function logMod(guild, text, extra) {
  return log(guild, null, {
    title: '🛡️ Moderation',
    description: text + (extra ? `\n\`\`\`${String(extra).slice(0, 1500)}\`\`\`` : ''),
    color: 0xFEE75C,
  });
}

function logJoin(member) {
  return log(member.guild, 'memberJoin', {
    title: '📥 Thành viên vào',
    description: `${member} (<@${member.id}>)\nTổng: **${member.guild.memberCount}**`,
    thumbnail: member.user.displayAvatarURL(),
    color: 0x57F287,
    user: member.user,
  });
}

function logLeave(member) {
  return log(member.guild, 'memberLeave', {
    title: `👋 ${member.user.tag} vừa rời.`,
    description: `${member} (<@${member.id}>)`,
    thumbnail: member.user.displayAvatarURL(),
    color: 0xED4245,
    user: member.user,
  });
}

// Ai nhận/bỏ role của ai (kiểu ProBot)
function logRoleChange(guild, user, added, removed, executor) {
  const lines = [];
  if (added.length) lines.push(`**Vai trò thêm:** ${added.map((r) => `${r}`).join(' ')}`);
  if (removed.length) lines.push(`**Vai trò gỡ:** ${removed.map((r) => `${r}`).join(' ')}`);
  if (!lines.length) return Promise.resolve(false);
  return log(guild, 'roleAssign', {
    title: `🎭 Đã cập nhật cho ${user.tag}`,
    description: `${user} (<@${user.id}>)\n${lines.join('\n')}`,
    thumbnail: user.displayAvatarURL(),
    color: 0xFEE75C,
    user,
    moderator: executor,
  });
}

// Ai sửa kênh gì (tên cũ → mới, kiểu ProBot)
function logChannelUpdate(guild, oldName, newName, channel, executor, reason = null) {
  return log(guild, 'channelUpdate', {
    title: `🔧 Đã cập nhật kênh: ${newName}`,
    description: `**Kênh:** ${channel}\n**Tên cũ:** ${oldName}\n**Tên mới:** ${newName}${reason ? `\n**Reason:** ${reason}` : ''}`,
    color: 0xFEE75C,
    moderator: executor,
  });
}

function logMessageDelete(message, executor) {
  if (!message.guild || message.author?.bot) return Promise.resolve(false);
  return log(message.guild, 'msgDelete', {
    title: '🗑️ Xóa tin nhắn',
    description: `**Kênh:** ${message.channel}\n**Tác giả:** ${message.author?.tag || '?'} (<@${message.author?.id}>)\n**Nội dung:**\n${(message.content || '_không có text (ảnh/embed)_').slice(0, 1500)}`,
    color: 0xED4245,
    user: message.author,
    moderator: executor,
  });
}

function logMessageUpdate(oldMsg, newMsg) {
  if (!newMsg.guild || newMsg.author?.bot) return Promise.resolve(false);
  if ((oldMsg.content || '') === (newMsg.content || '')) return Promise.resolve(false);
  return log(newMsg.guild, 'msgEdit', {
    title: '✏️ Sửa tin nhắn',
    description: `**Kênh:** ${newMsg.channel} — [Nhảy tới](${newMsg.url})\n**Tác giả:** ${newMsg.author.tag}\n**Trước:**\n${(oldMsg.content || '?').slice(0, 800)}\n**Sau:**\n${(newMsg.content || '?').slice(0, 800)}`,
    color: 0xFEE75C,
    user: newMsg.author,
  });
}

// Tách voice join/leave/move riêng (kiểu ProBot)
function logVoice(oldState, newState) {
  const guild = newState.guild || oldState.guild;
  const user = newState.member?.user || oldState.member?.user;
  if (!guild || !user || user.bot) return Promise.resolve(false);
  const oldCh = oldState.channel;
  const newCh = newState.channel;
  if (oldCh?.id === newCh?.id) return Promise.resolve(false);
  if (!oldCh && newCh) {
    return log(guild, 'voiceJoin', {
      title: '🔊 Vào voice', description: `${user} (<@${user.id}>) **vào** ${newCh}`,
      color: 0x57F287, user,
    });
  }
  if (oldCh && !newCh) {
    return log(guild, 'voiceLeave', {
      title: '🔇 Rời voice', description: `${user} (<@${user.id}>) **rời** ${oldCh}`,
      color: 0xED4245, user,
    });
  }
  return log(guild, 'voiceMove', {
    title: '🔀 Chuyển voice', description: `${user} (<@${user.id}>)\n${oldCh} → ${newCh}`,
    color: 0xFEE75C, user,
  });
}

function logBan(guild, user, reason, banned = true, moderator = null) {
  return log(guild, banned ? 'ban' : 'unban', {
    title: banned ? '🔨 Member Banned' : '♻️ Member Unbanned',
    description: `**User:** ${user} (<@${user.id}>)\n**Reason:** ${reason || 'Không có'}${banned ? '\n**Duration:** Permanent' : ''}`,
    color: banned ? 0xED4245 : 0x57F287,
    user,
    moderator,
  });
}

// Đổi username/avatar toàn cục (phát hiện qua member update)
function logUsername(guild, user, changes) {
  return log(guild, 'userChange', {
    title: '👤 Đổi thông tin user',
    description: `**User:** ${user} (<@${user.id}>)\n${changes.join('\n')}`,
    thumbnail: user.displayAvatarURL(),
    color: 0xFEE75C,
    user,
  });
}

function logInvite(guild, invite, created, inviter) {
  return log(guild, 'invite', {
    title: created ? '📨 Tạo invite' : '🗑️ Xóa invite',
    description: `**Code:** \`${invite.code}\`\n**Kênh:** ${invite.channel ? `${invite.channel}` : '?'}\n**Tác giả:** ${inviter ? `${inviter.tag} (<@${inviter.id}>)` : '?'}\n**Dùng:** ${invite.uses ?? 0}/${invite.maxUses || '∞'} • **Hết hạn:** ${invite.expiresTimestamp ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>` : 'không'}`,
    color: created ? 0x57F287 : 0xED4245,
    user: inviter || undefined,
  });
}

function logThread(guild, thread, action) {
  const label = { create: '🧵 Tạo thread', delete: '🧵 Xóa thread', update: '🧵 Sửa thread' }[action] || '🧵 Thread';
  return log(guild, 'thread', {
    title: label,
    description: `**Thread:** ${action === 'delete' ? `\`#${thread.name}\`` : `${thread}`} (\`${thread.name}\`)\n**Kênh cha:** ${thread.parent ? `${thread.parent}` : '?'}\n**Chủ:** ${thread.ownerId ? `<@${thread.ownerId}>` : '?'}`,
    color: action === 'delete' ? 0xED4245 : action === 'create' ? 0x57F287 : 0xFEE75C,
  });
}

function logWebhook(guild, channel) {
  return log(guild, 'webhook', {
    title: '🪝 Webhook đổi',
    description: `Webhook trong ${channel} vừa thay đổi (tạo/sửa/xóa).`,
    color: 0xFEE75C,
  });
}

function logGuildUpdate(oldGuild, newGuild, executor) {
  const changes = [];
  if (oldGuild.name !== newGuild.name) changes.push(`**Tên:** \`${oldGuild.name}\` → \`${newGuild.name}\``);
  if (oldGuild.icon !== newGuild.icon) changes.push('**Icon server:** đã đổi');
  if (oldGuild.banner !== newGuild.banner) changes.push('**Banner server:** đã đổi');
  if (oldGuild.preferredLocale !== newGuild.preferredLocale) changes.push(`**Ngôn ngữ:** ${oldGuild.preferredLocale} → ${newGuild.preferredLocale}`);
  if (oldGuild.verificationLevel !== newGuild.verificationLevel) changes.push('**Mức xác minh:** đã đổi');
  if (oldGuild.afkChannelId !== newGuild.afkChannelId || oldGuild.afkTimeout !== newGuild.afkTimeout) changes.push('**Kênh AFK:** đã đổi');
  if (!changes.length) return Promise.resolve(false);
  return log(newGuild, 'guildUpdate', {
    title: '⚙️ Đổi cài đặt server',
    description: `${changes.join('\n')}`,
    thumbnail: newGuild.iconURL(),
    color: 0xFEE75C,
    moderator: executor,
  });
}

module.exports = { send, log, logMod, logJoin, logLeave, logRoleChange, logChannelUpdate, logMessageDelete, logMessageUpdate, logVoice, logBan, logUsername, logInvite, logThread, logWebhook, logGuildUpdate, findExecutor, findExecutorReason, getLogChannel };
