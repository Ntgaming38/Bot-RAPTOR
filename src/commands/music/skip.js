const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

function getQueue(interaction, client) {
  try {
    const q = useQueue();
    if (q) return q;
  } catch {}
  return client?.player?.nodes?.get(interaction.guildId) || client?.player?.queues?.get?.(interaction.guildId) || null;
}

module.exports = {
  group: 'nhạc',
  data: new SlashCommandBuilder().setName('skip').setDescription('Bỏ qua bài đang phát'),
  async execute(interaction, client) {
    const queue = getQueue(interaction, client);
    if (!queue || !(queue.currentTrack || queue.current)) {
      return interaction.reply({ embeds: [errorEmbed('Không có gì đang phát.')], ephemeral: true });
    }
    const cur = queue.currentTrack || queue.current;
    try {
      if (queue.node?.skip) await queue.node.skip();
      else if (queue.skip) await queue.skip();
      await interaction.reply({ embeds: [successEmbed(`⏭️ Đã skip: **${cur.cleanTitle || cur.title}**`)] });
    } catch (e) {
      await interaction.reply({ embeds: [errorEmbed('Không skip được: ' + e.message)], ephemeral: true });
    }
  },
};
