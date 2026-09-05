const { Events } = require('discord.js');

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    try {
      await require('../utils/logger').logMessageDelete(message);
    } catch {}
  },
};
