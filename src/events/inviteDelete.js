const { Events } = require('discord.js');

module.exports = {
  name: Events.InviteDelete,
  async execute(invite) {
    try {
      if (!invite.guild) return;
      await require('../utils/logger').logInvite(invite.guild, invite, false, invite.inviter || null);
    } catch {}
  },
};
