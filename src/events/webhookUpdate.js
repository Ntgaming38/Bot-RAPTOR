const { Events } = require('discord.js');

module.exports = {
  name: Events.WebhooksUpdate,
  async execute(channel) {
    try {
      if (!channel.guild) return;
      await require('../utils/logger').logWebhook(channel.guild, channel);
    } catch {}
  },
};
