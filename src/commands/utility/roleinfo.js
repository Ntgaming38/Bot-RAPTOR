const { SlashCommandBuilder } = require('discord.js');
const { embed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Xem thông tin 1 role')
    .addRoleOption(o => o.setName('role').setDescription('Role cần xem').setRequired(true)),
  async execute(interaction) {
    const role = interaction.options.getRole('role', true);
    const full = await interaction.guild.roles.fetch(role.id).catch(() => role);
    if (!full) return interaction.reply({ embeds: [errorEmbed('Không tìm thấy role.')], ephemeral: true });
    const keyPerms = ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'KickMembers', 'BanMembers', 'ModerateMembers', 'ManageMessages', 'MentionEveryone']
      .filter((p) => full.permissions.has(p));
    await interaction.reply({
      embeds: [embed({
        title: `🎭 ${full.name}`,
        description: [
          `**ID:** \`${full.id}\``,
          `**Màu:** \`${full.hexColor}\` • **Vị trí:** #${full.position}`,
          `**Thành viên:** \`${full.members.size}\``,
          `**Hiển thị riêng:** ${full.hoist ? 'có' : 'không'} • **Cho tag:** ${full.mentionable ? 'có' : 'không'} • **Bot/app:** ${full.managed ? 'có' : 'không'}`,
          `**Quyền nổi bật:** ${keyPerms.length ? keyPerms.map((p) => `\`${p}\``).join(' ') : '_thành viên thường_'}`,
          `**Tạo lúc:** <t:${Math.floor(full.createdTimestamp / 1000)}:F>`,
        ].join('\n'),
        color: full.hexColor && full.hexColor !== '#000000' ? full.hexColor : undefined,
      })],
    });
  },
};
