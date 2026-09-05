const { Events } = require('discord.js');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMsg, newMsg) {
    try {
      // Fetch partial
      if (newMsg.partial) await newMsg.fetch().catch(() => null);
      await require('../utils/logger').logMessageUpdate(oldMsg, newMsg);
    } catch {}
  },
};
