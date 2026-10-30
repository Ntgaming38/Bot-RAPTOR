const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embeds');
const inviteRoles = require('../../utils/inviteRoles');

module.exports = {
  group: 'fun',
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Xem số người bạn đã mời vào server + bảng xếp hạng người mời')
    .addUserOption((o) => o.setName('user').setDescription('Người muốn xem (mặc định là bạn)')),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const stats = await inviteRoles.getStats(interaction.guildId);
    const mine = stats.find((s) => s.userId === user.id);
    const top = [...stats].sort((a, b) => b.total - a.total).slice(0, 5);
    const lines = [];
    for (let i = 0; i < top.length; i++) {
      const u = await interaction.client.users.fetch(top[i].userId).catch(() => null);
      lines.push(`**${i + 1}.** ${u ? '@' + u.username : 'Người dùng ' + top[i].userId} — **${top[i].total}** lượt mời`);
    }
    await interaction.reply({
      embeds: [embed({
        title: '🔗 Lượt mời',
        description: `**${user.username}** đã mời **${mine?.total || 0}** thành viên vào server.${lines.length ? `\n\n🏆 **Top người mời:**\n${lines.join('\n')}` : ''}`,
      })],
    });
  },
};
