const { SlashCommandBuilder } = require('discord.js');
const { useQueue, QueueRepeatMode } = require('discord-player');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'nhạc',
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Lặp bài / hàng chờ')
    .addStringOption(o => o.setName('mode').setDescription('Chế độ lặp').setRequired(true)
      .addChoices(
        { name: 'Tắt', value: 'off' },
        { name: 'Lặp 1 bài', value: 'track' },
        { name: 'Lặp cả queue', value: 'queue' },
        { name: 'Autoplay bài tương tự', value: 'autoplay' },
      )),
  async execute(interaction, client) {
    let q = null;
    try { q = useQueue(); } catch {}
    q = q || client?.player?.nodes?.get(interaction.guildId);
    if (!q) return interaction.reply({ embeds: [errorEmbed('Không có gì đang phát.')], ephemeral: true });
    const mode = interaction.options.getString('mode', true);
    const map = { off: QueueRepeatMode.OFF, track: QueueRepeatMode.TRACK, queue: QueueRepeatMode.QUEUE, autoplay: QueueRepeatMode.AUTOPLAY };
    try {
      if (q.setRepeatMode) await q.setRepeatMode(map[mode]);
      await interaction.reply({ embeds: [successEmbed(`🔁 Chế độ lặp: **${mode}**`)] });
    } catch (e) { await interaction.reply({ embeds: [errorEmbed(e.message)], ephemeral: true }); }
  },
};
