const { Events } = require('discord.js');

// Reaction Role: bỏ reaction → gỡ role
module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    try {
      if (user.bot) return;
      if (reaction.partial) await reaction.fetch().catch(() => null);
      const message = reaction.message;
      if (!message?.guild) return;
      const rb = require('../utils/roleBoards');
      const board = await rb.findBoardByMessage(message.guild.id, message.id);
      if (!board || (board.display || 'buttons') !== 'reactions') return;
      const item = rb.matchItemEmoji(board.items, reaction);
      if (!item) return;
      const member = await message.guild.members.fetch(user.id).catch(() => null);
      if (!member || !member.roles.cache.has(item.roleId)) return;
      await member.roles.remove(item.roleId).catch(() => {});
    } catch (e) {
      console.warn('[reactionRole]', e?.message);
    }
  },
};
