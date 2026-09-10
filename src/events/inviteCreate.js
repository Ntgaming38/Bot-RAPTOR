const { Events } = require('discord.js');

module.exports = {
  name: Events.InviteCreate,
  async execute(invite) {
    try {
      if (!invite.guild) return;
      await require('../utils/logger').logInvite(invite.guild, invite, true, invite.inviter || null);
    } catch {}
  },
};
