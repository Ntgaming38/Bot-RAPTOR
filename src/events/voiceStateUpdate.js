const { Events } = require('discord.js');

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    try {
      await require('../utils/logger').logVoice(oldState, newState);
    } catch {}
  },
};
