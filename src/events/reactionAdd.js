const { Events } = require('discord.js');

// Reaction Role: thả reaction vào bảng → nhận role
module.exports = {
  name: Events.MessageReactionAdd,
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
      if (!item) {
        await reaction.users.remove(user.id).catch(() => {});
        return;
      }
      const member = await message.guild.members.fetch(user.id).catch(() => null);
      if (!member) return;
      const r = await rb.toggleBoardRole(message.guild, member, board, item);
      if (r.action === 'denied') {
        await reaction.users.remove(user.id).catch(() => {});
        await user.send(`⚠️ Không nhận được role ở **${message.guild.name}**: ${r.reason}`).catch(() => {});
      } else if (r.action === 'removed') {
        // Thả reaction mà đã có role → toggle gỡ + gỡ reaction cho đồng bộ
        await reaction.users.remove(user.id).catch(() => {});
      }
    } catch (e) {
      console.warn('[reactionRole]', e?.message);
    }
  },
};
