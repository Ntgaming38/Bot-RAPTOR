const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embeds');

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Xem thông tin server'),
  async execute(interaction) {
    const g = interaction.guild;
    await g.members.fetch().catch(() => {});
    const owner = await g.fetchOwner().catch(() => null);
    await interaction.reply({
      embeds: [embed({
        title: `🏠 ${g.name}`,
        thumbnail: g.iconURL(),
        fields: [
          { name: '🆔 ID', value: g.id, inline: true },
          { name: '👑 Chủ server', value: owner ? `${owner.user.tag}` : 'Không rõ', inline: true },
          { name: '📅 Tạo ngày', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
          { name: '👥 Thành viên', value: `${g.memberCount}`, inline: true },
          { name: '💬 Kênh', value: `${g.channels.cache.size}`, inline: true },
          { name: '🎭 Role', value: `${g.roles.cache.size}`, inline: true },
          { name: '✨ Boost', value: `Level ${g.premiumTier} (${g.premiumSubscriptionCount || 0} boost)`, inline: true },
        ],
      })],
    });
  },
};
