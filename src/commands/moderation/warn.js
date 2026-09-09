const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, embed } = require('../../utils/embeds');
const { addWarn, listWarns, clearWarns } = require('../../utils/warns');

module.exports = {
  group: 'moderation',
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Cảnh cáo thành viên')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(s => s
      .setName('add')
      .setDescription('Cảnh cáo 1 người')
      .addUserOption(o => o.setName('user').setDescription('Người cần warn').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Lý do').setMaxLength(500)))
    .addSubcommand(s => s
      .setName('list')
      .setDescription('Xem các warn của 1 người')
      .addUserOption(o => o.setName('user').setDescription('Người cần xem').setRequired(true)))
    .addSubcommand(s => s
      .setName('clear')
      .setDescription('Xóa hết warn của 1 người')
      .addUserOption(o => o.setName('user').setDescription('Người cần xóa warn').setRequired(true))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user', true);
    const guildId = interaction.guildId;

    if (sub === 'add') {
      const reason = interaction.options.getString('reason') || 'Không có lý do';
      const count = await addWarn(guildId, user.id, interaction.user.id, interaction.user.tag, reason);
      try {
        await user.send(`⚠️ Bạn bị warn ở **${interaction.guild.name}** (lần ${count}).\nLý do: ${reason}`).catch(() => {});
      } catch {}
      await require('../../utils/logger').log(guildId && interaction.guild, 'warn', {
        title: '⚠️ Warn',
        description: `**User:** ${user.tag} (<@${user.id}>)\n**Lần thứ:** ${count}\n**Lý do:** ${reason}`,
        color: 0xFEE75C,
        user,
        moderator: interaction.user,
      });
      return interaction.reply({ embeds: [successEmbed(`Đã warn **${user.tag}** (lần ${count}).\nLý do: ${reason}`)] });
    }
    if (sub === 'list') {
      const list = await listWarns(guildId, user.id);
      if (!list.length) return interaction.reply({ content: `✅ **${user.tag}** chưa có warn nào.`, ephemeral: true });
      const lines = list.map((w, i) => `**${i + 1}.** ${w.reason} — *${w.byTag || w.by}* (<t:${Math.floor(w.at / 1000)}:R>)`);
      return interaction.reply({ embeds: [embed({ title: `⚠️ Warn của ${user.tag} (${list.length})`, description: lines.join('\n').slice(0, 4000) })], ephemeral: true });
    }
    if (sub === 'clear') {
      await clearWarns(guildId, user.id);
      return interaction.reply({ embeds: [successEmbed(`Đã xóa hết warn của **${user.tag}**.`)] });
    }
  },
};
