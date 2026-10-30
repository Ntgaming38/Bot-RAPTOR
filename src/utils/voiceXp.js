// XP thoại kiểu ProBot: mỗi phút ở kênh voice (không tự tắt tiếng nghe) được cộng XP.
// Quét trực tiếp voice state mỗi tick nên không cần theo dõi join/leave, bot restart cũng không lệch.
const { addXpAmount, applyLevelRewards } = require('./levels');

async function tickVoiceXp(client) {
  if (!client?.guilds) return;
  for (const guild of client.guilds.cache.values()) {
    try {
      const st = await require('./guildSettings').getGuildSettings(guild.id).catch(() => null);
      if (!st || st.levelEnabled === false || st.voiceXpEnabled === false) continue;
      const perMin = Math.min(1000, Math.max(0, parseInt(st.voiceXpPerMin, 10) || 0));
      if (perMin <= 0) continue;
      for (const channel of guild.channels.cache.values()) {
        if (!channel?.isVoiceBased?.()) continue;
        if (guild.afkChannelId && channel.id === guild.afkChannelId) continue;
        for (const member of channel.members.values()) {
          if (member.user.bot) continue;
          if (member.voice?.selfDeaf) continue; // tắt nghe = coi như không tham gia
          const res = await addXpAmount(guild.id, member.id, perMin).catch(() => null);
          if (res?.leveled) {
            await applyLevelRewards(guild, member, res.level);
            require('./activity').record(guild.id, 'level', `@${member.user.tag} lên cấp ${res.level} (XP thoại)`).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.warn('[voiceXp]', guild?.id, e?.message);
    }
  }
}

module.exports = { tickVoiceXp };
