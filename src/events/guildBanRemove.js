const { Events } = require('discord.js');

module.exports = {
  name: Events.GuildBanRemove,
  async execute(ban) {
    try {
      await require('../utils/logger').logBan(ban.guild, ban.user, null, false);
    } catch {}
  },
};
