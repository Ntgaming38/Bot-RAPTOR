const { Events } = require('discord.js');

module.exports = {
  name: Events.ThreadDelete,
  async execute(thread) {
    try {
      if (!thread.guild) return;
      await require('../utils/logger').logThread(thread.guild, thread, 'delete');
    } catch {}
  },
};
