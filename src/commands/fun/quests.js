const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embeds');
const quests = require('../../utils/quests');
const { getProfile } = require('../../utils/social');

module.exports = {
  group: 'fun',
  data: new SlashCommandBuilder()
    .setName('quests')
    .setDescription('Xem nhiệm vụ hằng ngày và phần thưởng credits'),
  async execute(interaction) {
    const list = await quests.listFor(interaction.guildId, interaction.user.id);
    const bal = getProfile(interaction.guildId, interaction.user.id).credits;
    const bar = (cur, target) => {
      const filled = Math.round((Math.min(cur, target) / target) * 10);
      return '▰'.repeat(filled) + '▱'.repeat(10 - filled);
    };
    const lines = list.map((q) => `${q.done ? '✅' : '🎯'} **${q.name}** — ${q.desc}\n${bar(q.cur, q.target)} ${q.cur}/${q.target}${q.done ? ' · đã nhận thưởng' : ` · thưởng **${q.reward}** credits`}`);
    const earned = list.filter((q) => q.done).reduce((a, q) => a + q.reward, 0);
    await interaction.reply({
      embeds: [embed({
        title: '🗓️ Nhiệm vụ hôm nay',
        description: `${lines.join('\n\n')}\n\n🏆 Đã kiếm hôm nay: **${earned}** credits · 💰 Số dư: **${bal}** credits\nNhiệm vụ tự làm mới mỗi ngày (giờ Việt Nam).`,
      })],
    });
  },
};
