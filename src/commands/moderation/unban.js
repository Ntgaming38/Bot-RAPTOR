const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'moderation',
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Gỡ ban một người')
    .addStringOption(o => o.setName('user_id').setDescription('ID người cần unban').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    const id = interaction.options.getString('user_id', true);
    try {
      await interaction.guild.bans.remove(id);
      require('../../utils/logger').logMod(interaction.guild, `♻️ ${interaction.user.tag} unban <@${id}>`).catch(() => {});
      await interaction.reply({ embeds: [successEmbed(`Đã unban <@${id}>.`)] });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Không unban được. Kiểm tra ID / bot có quyền Ban Members không.')], ephemeral: true });
    }
  },
};
