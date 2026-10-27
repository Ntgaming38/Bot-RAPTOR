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
      // Starboard: gỡ sao → cập nhật/xóa bài nổi bật
      try {
        const gst = await require('../utils/guildSettings').getGuildSettings(message.guild.id).catch(() => null);
        if (require('../utils/starboard').getStarboard(gst).enabled) {
          if (reaction.partial) await reaction.fetch().catch(() => null);
          const full = reaction.message.partial ? await reaction.message.fetch().catch(() => reaction.message) : message;
          await require('../utils/starboard').syncStarboard({ ...reaction, message: full, count: reaction.count }, gst);
        }
      } catch (e) { console.warn('[starboard]', e?.message); }
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
