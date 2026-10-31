const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embeds');
const { getProfile, claimDaily, DAILY_CREDITS } = require('../../utils/social');

module.exports = {
  group: 'fun',
  data: new SlashCommandBuilder()
    .setName('credits')
    .setDescription('Credits / rep / points trong server')
    .addSubcommand((sc) => sc.setName('view').setDescription('Xem số credits / rep / points của bạn hoặc ai đó')
      .addUserOption(o => o.setName('user').setDescription('Người muốn xem')))
    .addSubcommand((sc) => sc.setName('daily').setDescription(`Nhận ${DAILY_CREDITS} credits mỗi ngày`)),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'daily') {
      const r = claimDaily(interaction.guildId, interaction.user.id);
      if (!r.ok) {
        const h = Math.ceil(r.retryAfterMs / 3600000);
        return interaction.reply({ content: `⏳ Bạn đã nhận daily rồi — quay lại sau khoảng **${h} giờ**.`, ephemeral: true });
      }
      let bonusNote = '';
      let finalBal = r.credits;
      try {
        const q = await require('../../utils/quests').onDaily(interaction.guildId, interaction.user.id);
        if (q?.completed) {
          bonusNote = `\n🎯 Hoàn thành nhiệm vụ **${q.completed.name}**: thưởng thêm **+${q.completed.reward}** credits!`;
          finalBal = q.completed.balance;
        }
      } catch {}
      return interaction.reply({ embeds: [embed({ title: '💰 Điểm danh hằng ngày', description: `+${r.amount} credits! Số dư hiện tại: **${finalBal}** credits.${bonusNote}` })] });
    }
    const user = interaction.options.getUser('user') || interaction.user;
    const p = getProfile(interaction.guildId, user.id);
    await interaction.reply({
      embeds: [embed({
        title: `💼 Hồ sơ của ${user.username}`,
        thumbnail: user.displayAvatarURL(),
        description: `💰 Credits: **${p.credits}**\n⭐ Rep: **${p.rep}**\n🏅 Points: **${p.points}**`,
      })],
    });
  },
};
