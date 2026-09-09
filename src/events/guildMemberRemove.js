const { Events } = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    try { await require('../utils/logger').logLeave(member); } catch {}
    const s = await require('../utils/goodbyeSettings').getGoodbye(member.guild.id).catch(() => null);
    const channelId = s?.channelId || config.goodbyeChannelId;
    if (!channelId) return;
    const ch = await member.guild.channels.fetch(channelId).catch(() => null);
    if (!ch?.isTextBased()) {
      console.warn('[goodbye] không tìm thấy kênh', channelId);
      return;
    }
    const { buildGoodbye } = require('../utils/goodbyeSettings');
    await ch.send({ embeds: [buildGoodbye(member, s)] }).catch((e) => console.warn('[goodbye] gửi lỗi:', e?.message));
  },
};
