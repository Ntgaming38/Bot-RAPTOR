const { SlashCommandBuilder } = require('discord.js');
const { parseDuration } = require('../../utils/giveaways');
const reminders = require('../../utils/reminders');

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Hẹn giờ nhắc việc — bot nhớ cả khi khởi động lại')
    .addStringOption((o) => o.setName('time').setDescription('Sau bao lâu: 10m, 1h30m, 2h, 1d (tối đa 30 ngày)').setRequired(true))
    .addStringOption((o) => o.setName('text').setDescription('Việc cần nhắc').setRequired(true).setMaxLength(300)),
  async execute(interaction) {
    const ms = parseDuration(interaction.options.getString('time'));
    const text = interaction.options.getString('text');
    if (!ms) {
      return interaction.reply({ content: '⚠️ Định dạng giờ chưa đúng. Ví dụ: `10m`, `1h30m`, `2h`, `1d`.', ephemeral: true });
    }
    const dueAt = Date.now() + ms;
    await reminders.add({ guildId: interaction.guildId, channelId: interaction.channelId, userId: interaction.user.id, text, dueAt });
    const when = Math.floor(dueAt / 1000);
    return interaction.reply({ content: `⏰ Ok! Mình sẽ nhắc **${text}** vào <t:${when}:F> (<t:${when}:R>) ngay tại kênh này.` });
  },
};
