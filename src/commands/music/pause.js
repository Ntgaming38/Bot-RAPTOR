const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'nhạc',
  data: new SlashCommandBuilder().setName('pause').setDescription('Tạm dừng nhạc'),
  async execute(interaction, client) {
    let q = null;
    try { q = useQueue(); } catch {}
    q = q || client?.player?.nodes?.get(interaction.guildId);
    if (!q) return interaction.reply({ embeds: [errorEmbed('Không có gì đang phát.')], ephemeral: true });
    try {
      if (q.node?.setPaused) await q.node.setPaused(true);
      else if (q.setPaused) await q.setPaused(true);
      await interaction.reply({ embeds: [successEmbed('⏸️ Đã tạm dừng. Dùng `/resume` để tiếp tục.')] });
    } catch (e) { await interaction.reply({ embeds: [errorEmbed(e.message)], ephemeral: true }); }
  },
};
