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
    // Dùng chính member của bạn để xem trước — sửa .env rồi gọi lại lệnh để so sánh
    const msg = await interaction.channel.send({ embeds: [buildWelcome(interaction.member)] });
    for (const e of config.welcomeReactions.slice(0, 5)) {
      await msg.react(e).catch(() => {});
    }
    await interaction.reply({ content: '✅ Đã gửi bản xem trước ở trên. Muốn gửi vào kênh chào mừng thật thì thêm `WELCOME_CHANNEL_ID` rồi test member mới join.', ephemeral: true });
  },
};
