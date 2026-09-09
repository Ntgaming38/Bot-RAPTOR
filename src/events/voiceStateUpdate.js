const { Events } = require('discord.js');

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState, client) {
    try {
      await require('../utils/logger').logVoice(oldState, newState);
    } catch {}
    // Tự out khi voice không còn người thật
    try {
      const guild = newState.guild || oldState.guild;
      if (guild) require('../music/voiceGuard').watchAlone(client, guild);
    } catch (e) {
      console.warn('[voiceGuard]', e?.message);
    }
  },
};
