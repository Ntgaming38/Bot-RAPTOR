const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { embed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'nhạc',
  data: new SlashCommandBuilder().setName('nowplaying').setDescription('Xem bài đang phát'),
  async execute(interaction, client) {
    let queue = null;
    try { queue = useQueue(); } catch {}
    queue = queue || client?.player?.nodes?.get(interaction.guildId);
    const current = queue?.currentTrack || queue?.current;
    if (!current) return interaction.reply({ embeds: [errorEmbed('Không có gì đang phát.')], ephemeral: true });
    await interaction.reply({
      embeds: [embed({
        title: '🎧 Đang phát',
        description: `**${current.cleanTitle || current.title}**\nTác giả: ${current.author || '?'}\nThời lượng: ${current.duration || '?'}\nYêu cầu bởi: ${current.requestedBy || '?'}`,
        thumbnail: current.thumbnail,
      })],
    });
  },
};
