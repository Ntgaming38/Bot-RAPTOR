const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('voicepanel')
    .setDescription('Hiện lại bảng điều khiển trong phòng voice tạm của bạn'),
  async execute(interaction) {
    const tempVoice = require('../../utils/tempVoice');
    const myVoice = interaction.member?.voice?.channel;
    if (!myVoice) {
      return interaction.reply({ embeds: [errorEmbed('Bạn cần đang ở trong phòng voice tạm của mình trước đã.')], ephemeral: true });
    }
    const row = await tempVoice.byChannel(myVoice.id).catch(() => null);
    if (!row) {
      return interaction.reply({ embeds: [errorEmbed('Kênh bạn đang ở không phải phòng voice tạm. Vào kênh tạo phòng để tạo phòng riêng nhé.')], ephemeral: true });
    }
    if (row.ownerId !== interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('Chỉ chủ phòng mới đăng lại được bảng điều khiển.')], ephemeral: true });
    }
    await myVoice.send(tempVoice.panelPayload(myVoice, row)).catch(() => {});
    return interaction.reply({ embeds: [successEmbed('Đã đăng lại bảng điều khiển trong phòng của bạn.')], ephemeral: true });
  },
};
