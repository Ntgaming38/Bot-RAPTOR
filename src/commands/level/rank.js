const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embeds');
const { getRank } = require('../../utils/levels');

module.exports = {
  group: 'level',
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Xem cấp độ của bạn hoặc ai đó')
    .addUserOption(o => o.setName('user').setDescription('Người muốn xem')),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const r = getRank(interaction.guildId, user.id);
    const progress = Math.floor((r.xp / r.needed) * 20);
    const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);
    await interaction.reply({
      embeds: [embed({
        title: `🏆 Rank của ${user.username}`,
        thumbnail: user.displayAvatarURL(),
        description: `Level: **${r.level}**\nXP: **${r.xp}/${r.needed}**\n\`${bar}\`\nXếp hạng: **${r.rank ? `#${r.rank}/${r.total}` : 'chưa có hạng'}**`,
      })],
    });
  },
};
