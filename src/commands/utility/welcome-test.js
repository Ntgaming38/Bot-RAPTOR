const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');
const { buildWelcome } = require('../../utils/welcome');

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('welcome-test')
    .setDescription('Xem trước tin nhắn chào mừng (không cần out/join)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true }).catch(() => {});
    }
    // Dùng chính member của bạn để xem trước — ưu tiên setting từ /welcome setup
    const s = await require('../../utils/welcomeSettings').getWelcomeSettings(interaction.guildId).catch(() => null);
    const reactions = s?.reactions || config.welcomeReactions;
    const msg = await interaction.channel.send({ embeds: [buildWelcome(interaction.member, s)] });
    for (const e of reactions.slice(0, 5)) {
      await msg.react(e).catch(() => {});
    }
    await interaction.editReply({ content: '✅ Đã gửi bản xem trước ở trên. Muốn đổi thì dùng `/welcome setup` (chỉ Admin).' });
  },
};
