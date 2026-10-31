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
    // Kênh voice tạm (kiểu VoiceMaster): tạo phòng khi vào kênh tạo phòng, dọn khi trống
    try {
      await require('../utils/tempVoice').onVoiceState(oldState, newState);
    } catch (e) {
      console.warn('[tempVoice]', e?.message);
    }
  },
};
