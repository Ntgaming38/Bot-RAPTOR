const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed } = require('../../utils/embeds');
const { getProfile, addPoints } = require('../../utils/social');

module.exports = {
  group: 'moderation',
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('Điểm server do đội ngũ quản trị tặng/trừ')
    .addSubcommand((sc) => sc.setName('view').setDescription('Xem points của một thành viên')
      .addUserOption(o => o.setName('user').setDescription('Thành viên').setRequired(true)))
    .addSubcommand((sc) => sc.setName('add').setDescription('Cộng points (chỉ quản trị)')
      .addUserOption(o => o.setName('user').setDescription('Thành viên').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Số điểm cộng').setRequired(true).setMinValue(1).setMaxValue(100000)))
    .addSubcommand((sc) => sc.setName('remove').setDescription('Trừ points (chỉ quản trị)')
      .addUserOption(o => o.setName('user').setDescription('Thành viên').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Số điểm trừ').setRequired(true).setMinValue(1).setMaxValue(100000))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');
    if (sub === 'view') {
      const p = getProfile(interaction.guildId, user.id);
      return interaction.reply({ embeds: [embed({ title: '🏅 Points', description: `${user} đang có **${p.points}** points trong server này.` })] });
    }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '⛔ Chỉ quản trị (Manage Server) mới cộng/trừ points được.', ephemeral: true });
    }
    const amount = interaction.options.getInteger('amount');
    const total = addPoints(interaction.guildId, user.id, sub === 'add' ? amount : -amount);
    await interaction.reply({
      embeds: [embed({
        title: sub === 'add' ? '🏅 Đã cộng points' : '🏅 Đã trừ points',
        description: `${user} ${sub === 'add' ? '+' : '−'}${amount} points → tổng **${total}** points.`,
      })],
      ephemeral: true,
    });
  },
};
