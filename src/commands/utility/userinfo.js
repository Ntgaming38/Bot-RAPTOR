const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embeds');

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Xem thông tin người dùng')
    .addUserOption(o => o.setName('user').setDescription('Người muốn xem (để trống = chính bạn)')),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    await interaction.reply({
      embeds: [embed({
        title: `👤 ${user.tag}`,
        thumbnail: user.displayAvatarURL({ size: 256 }),
        fields: [
          { name: '🆔 ID', value: user.id, inline: true },
          { name: '🤖 Bot?', value: user.bot ? 'Có' : 'Không', inline: true },
          { name: '📅 Tạo tài khoản', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
          ...(member ? [
            { name: '📥 Vào server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
            { name: '🎭 Role', value: member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.toString()).join(', ') || 'Không có', inline: false },
          ] : []),
        ],
      })],
    });
  },
};
