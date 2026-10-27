const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embeds');
const { giveRep, getProfile } = require('../../utils/social');

module.exports = {
  group: 'fun',
  data: new SlashCommandBuilder()
    .setName('rep')
    .setDescription('Tặng 1 điểm danh tiếng cho ai đó (mỗi 24h 1 lần)')
    .addUserOption(o => o.setName('user').setDescription('Người nhận rep').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    if (target.id === interaction.user.id) return interaction.reply({ content: 'Không tự tặng rep cho mình được đâu 😅', ephemeral: true });
    if (target.bot) return interaction.reply({ content: 'Bot không cần rep.', ephemeral: true });
    const r = giveRep(interaction.guildId, interaction.user.id, target.id);
    if (!r.ok) {
      const h = Math.ceil(r.retryAfterMs / 3600000);
      return interaction.reply({ content: `⏳ Bạn đã tặng rep rồi — thử lại sau khoảng **${h} giờ** nữa.`, ephemeral: true });
    }
    const p = getProfile(interaction.guildId, target.id);
    await interaction.reply({
      embeds: [embed({
        title: '⭐ Đã tặng điểm danh tiếng',
        description: `${interaction.user} tặng 1 rep cho ${target}. Tổng rep của ${target}: **${p.rep}**`,
      })],
    });
  },
};
