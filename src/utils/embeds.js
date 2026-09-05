const { EmbedBuilder } = require('discord.js');
const config = require('../config');

function embed({ title, description, color, fields, thumbnail, footer, timestamp = true } = {}) {
  const e = new EmbedBuilder()
    .setColor(color || config.embedColor);
  if (title) e.setTitle(title);
  if (description) e.setDescription(description);
  if (fields) e.addFields(fields);
  if (thumbnail) e.setThumbnail(thumbnail);
  if (footer) e.setFooter(typeof footer === 'string' ? { text: footer } : footer);
  if (timestamp) e.setTimestamp();
  return e;
}

function errorEmbed(message) {
  return embed({ title: '❌ Lỗi', description: message, color: 0xED4245 });
}

function successEmbed(message) {
  return embed({ title: '✅ Thành công', description: message, color: 0x57F287 });
}

module.exports = { embed, errorEmbed, successEmbed };
