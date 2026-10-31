const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embeds');

module.exports = {
  group: 'fun',
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Tung xúc xắc ngẫu nhiên')
    .addIntegerOption((o) => o.setName('sides').setDescription('Số mặt của xúc xắc (mặc định 6)').setMinValue(2).setMaxValue(1000))
    .addIntegerOption((o) => o.setName('count').setDescription('Số viên xúc xắc (mặc định 1, tối đa 10)').setMinValue(1).setMaxValue(10)),
  async execute(interaction) {
    const sides = interaction.options.getInteger('sides') || 6;
    const count = interaction.options.getInteger('count') || 1;
    const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
    const total = rolls.reduce((a, b) => a + b, 0);
    await interaction.reply({
      embeds: [embed({
        title: '🎲 Tung xúc xắc',
        description: count > 1
          ? `Kết quả ${count} viên ${sides} mặt: **${rolls.join('**, **')}**\n🧮 Tổng: **${total}**`
          : `Xúc xắc ${sides} mặt ra: **${rolls[0]}**`,
      })],
    });
  },
};
