const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed } = require('../../utils/embeds');
const { setUserXp, getRank, applyLevelRewards } = require('../../utils/levels');

module.exports = {
  group: 'level',
  data: new SlashCommandBuilder()
    .setName('setlevel')
    .setDescription('Đặt level cho một thành viên (chỉ quản trị)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(o => o.setName('user').setDescription('Thành viên').setRequired(true))
    .addIntegerOption(o => o.setName('level').setDescription('Level muốn đặt').setRequired(true).setMinValue(0).setMaxValue(1000)),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const level = interaction.options.getInteger('level');
    const before = await getRank(interaction.guildId, user.id);
    const after = await setUserXp(interaction.guildId, user.id, { level, xp: 0 });
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) await applyLevelRewards(interaction.guild, member, after.level);
    await interaction.reply({
      embeds: [embed({
        title: '✅ Đã đặt level',
        description: `${user} — Level **${before.level}** → Level **${after.level}** (XP trong level: ${after.xp})`,
      })],
      ephemeral: true,
    });
  },
};
