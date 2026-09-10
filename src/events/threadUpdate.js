const { Events } = require('discord.js');

module.exports = {
  name: Events.ThreadUpdate,
  async execute(_oldThread, thread) {
    try {
      const t = thread || _oldThread;
      if (!t?.guild) return;
      await require('../utils/logger').logThread(t.guild, t, 'update');
    } catch {}
  },
};
