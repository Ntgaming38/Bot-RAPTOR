// Starboard kiểu ProBot: tin nhắn đạt đủ số ⭐ sẽ được đăng vào kênh nổi bật.
const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');
const { writeJsonAtomic, readJson } = require('./jsonStore');

const FILE = path.join(__dirname, '..', '..', 'data', 'starboard.json');

function load() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return readJson(FILE, {});
  } catch { return {}; }
}
function save(db) { writeJsonAtomic(FILE, db); }

function getStarboard(st) {
  const a = (st && st.starboard) || {};
  return {
    enabled: !!a.enabled,
    channelId: a.channelId || null,
    emoji: String(a.emoji || '⭐').slice(0, 10),
    threshold: Math.min(50, Math.max(1, parseInt(a.threshold, 10) || 3)),
  };
}

function emojiMatches(reaction, emoji) {
  const name = reaction.emoji?.name;
  if (!name) return false;
  return name === emoji || reaction.emoji?.toString() === emoji;
}

// Gọi từ reactionAdd/reactionRemove. Tự đồng bộ bài trên starboard theo số sao hiện tại.
async function syncStarboard(reaction, st) {
  const cfg = getStarboard(st);
  if (!cfg.enabled || !cfg.channelId) return;
  if (!emojiMatches(reaction, cfg.emoji)) return;
  const message = reaction.message;
  if (!message?.guild || message.author?.bot) return;
  if (message.channelId === cfg.channelId) return; // không tự sao bài trong kênh starboard

  const count = reaction.count || 0;
  const db = load();
  db[message.guild.id] = db[message.guild.id] || {};
  const entry = db[message.guild.id][message.id];
  const boardChannel = await message.guild.channels.fetch(cfg.channelId).catch(() => null);
  if (!boardChannel?.isTextBased()) return;

  if (count >= cfg.threshold) {
    const image = message.attachments?.find((a) => a.contentType?.startsWith('image/'))?.url
      || message.embeds?.find((e) => e.image)?.image?.url || null;
    const em = new EmbedBuilder()
      .setColor(0xe9c33c)
      .setAuthor({ name: message.author?.tag || 'Ai đó', iconURL: message.author?.displayAvatarURL?.() || undefined })
      .setDescription((message.content || '').slice(0, 2000) || '*[không có chữ]*')
      .addFields({ name: 'Nguồn', value: `[Nhảy tới tin nhắn](${message.url}) · ${message.channel}` })
      .setFooter({ text: `${cfg.emoji} ${count}` })
      .setTimestamp(message.createdAt);
    if (image) em.setImage(image);
    if (entry?.boardId) {
      const old = await boardChannel.messages.fetch(entry.boardId).catch(() => null);
      if (old) { await old.edit({ embeds: [em] }).catch(() => {}); }
      else {
        const sent = await boardChannel.send({ embeds: [em] }).catch(() => null);
        if (sent) db[message.guild.id][message.id] = { boardId: sent.id, count };
      }
    } else {
      const sent = await boardChannel.send({ embeds: [em] }).catch(() => null);
      if (sent) db[message.guild.id][message.id] = { boardId: sent.id, count };
    }
    if (db[message.guild.id][message.id]) db[message.guild.id][message.id].count = count;
    save(db);
  } else if (entry?.boardId) {
    const old = await boardChannel.messages.fetch(entry.boardId).catch(() => null);
    if (old) await old.delete().catch(() => {});
    delete db[message.guild.id][message.id];
    save(db);
  }
}

module.exports = { getStarboard, syncStarboard };
