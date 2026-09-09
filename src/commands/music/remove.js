const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { getQueue, currentOf, upcomingOf, trackTitle } = require('../../music/helpers');

module.exports = {
  group: 'nhạc',
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Xóa 1 bài trong hàng chờ')
    .addIntegerOption(o => o.setName('position').setDescription('Số thứ tự trong /queue (bài đang phát là số 0)').setRequired(true).setMinValue(1)),
  async execute(interaction, client) {
    const queue = getQueue(interaction, client);
    if (!queue || !currentOf(queue)) {
      return interaction.reply({ embeds: [errorEmbed('Không có gì đang phát.')], ephemeral: true });
    }
    const pos = interaction.options.getInteger('position', true);
    const upcoming = upcomingOf(queue);
    if (pos < 1 || pos > upcoming.length) {
      return interaction.reply({ embeds: [errorEmbed(`Vị trí không đúng. Hàng chờ có ${upcoming.length} bài (chọn 1–${upcoming.length}).`)], ephemeral: true });
    }
    const target = upcoming[pos - 1];
    try {
      const removed = queue.node?.remove ? queue.node.remove(target) : null;
      await interaction.reply({ embeds: [successEmbed(`🗑️ Đã xóa số ${pos}: **${trackTitle(removed || target)}**`)] });
    } catch (e) {
      await interaction.reply({ embeds: [errorEmbed('Không xóa được: ' + e.message)], ephemeral: true });
    }
  },
};
