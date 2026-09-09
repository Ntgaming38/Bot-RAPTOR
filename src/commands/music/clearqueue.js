const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { getQueue, currentOf, upcomingOf } = require('../../music/helpers');

module.exports = {
  group: 'nhạc',
  data: new SlashCommandBuilder()
    .setName('clearqueue')
    .setDescription('Xóa hết bài chờ, giữ bài đang phát'),
  async execute(interaction, client) {
    const queue = getQueue(interaction, client);
    if (!queue || !currentOf(queue)) {
      return interaction.reply({ embeds: [errorEmbed('Không có gì đang phát.')], ephemeral: true });
    }
    const n = upcomingOf(queue).length;
    if (!n) return interaction.reply({ embeds: [errorEmbed('Hàng chờ đã trống, chỉ còn bài đang phát.')], ephemeral: true });
    try {
      if (queue.tracks?.clear) queue.tracks.clear();
      else if (queue.node?.clear) queue.node.clear();
      else throw new Error('không hỗ trợ');
      await interaction.reply({ embeds: [successEmbed(`🧹 Đã xóa ${n} bài chờ, giữ bài đang phát.`)] });
    } catch (e) {
      await interaction.reply({ embeds: [errorEmbed('Không xóa được: ' + e.message)], ephemeral: true });
    }
  },
};
