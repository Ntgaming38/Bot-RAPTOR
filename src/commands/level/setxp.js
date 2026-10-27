const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed } = require('../../utils/embeds');
const { setUserXp, getRank } = require('../../utils/levels');

module.exports = {
  group: 'level',
  data: new SlashCommandBuilder()
    .setName('setxp')
    .setDescription('Đặt XP cho một thành viên (chỉ quản trị)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(o => o.setName('user').setDescription('Thành viên').setRequired(true))
    .addIntegerOption(o => o.setName('xp').setDescription('Số XP trong level hiện tại').setRequired(true).setMinValue(0)),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const xp = interaction.options.getInteger('xp');
    const before = await getRank(interaction.guildId, user.id);
    const after = await setUserXp(interaction.guildId, user.id, { xp });
    await interaction.reply({
      embeds: [embed({
        title: '✅ Đã đặt XP',
        description: `${user} — Level **${before.level}**: ${before.xp} XP → Level **${after.level}**: **${after.xp} XP**`,
      })],
      ephemeral: true,
    });
  },
};
