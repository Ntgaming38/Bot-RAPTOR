const { SlashCommandBuilder, PollLayoutType } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'fun',
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Tạo bình chọn nhanh')
    .addStringOption(o => o.setName('question').setDescription('Câu hỏi').setRequired(true))
    .addStringOption(o => o.setName('choices').setDescription('Các lựa chọn, cách nhau bằng dấu | . VD: Có|Không|Hên xui').setRequired(true))
    .addIntegerOption(o => o.setName('hours').setDescription('Thời lượng bình chọn (giờ, mặc định 24, tối đa 7 ngày)').setMinValue(1).setMaxValue(168)),
  async execute(interaction) {
    const question = interaction.options.getString('question');
    const hours = interaction.options.getInteger('hours') || 24;
    const raw = interaction.options.getString('choices');
    const choices = raw.split('|').map(s => s.trim()).filter(Boolean).slice(0, 10);
    if (choices.length < 2) {
      return interaction.reply({ embeds: [errorEmbed('Cần ít nhất 2 lựa chọn, cách nhau bằng `|`. VD: `Có|Không`')], ephemeral: true });
    }
    try {
      await interaction.channel.send({
        poll: {
          question: { text: question },
          answers: choices.map(t => ({ text: t })),
          layoutType: PollLayoutType.Default,
          allowMultiselect: false,
          duration: hours,
        },
      });
      await interaction.reply({ content: '✅ Đã tạo poll!', ephemeral: true });
      require('../../utils/activity').record(interaction.guildId, 'poll', `@${interaction.user.tag} tạo bình chọn “${question.slice(0, 60)}”`).catch(() => {});
    } catch {
      // Fallback cho bản discord.js / server chưa hỗ trợ Poll: dùng reaction
      const msg = await interaction.channel.send(`📊 **${question}**\n${choices.map((c, i) => `${i + 1}. ${c}`).join('\n')}`);
      const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      for (let i = 0; i < choices.length; i++) await msg.react(emojis[i]).catch(() => {});
      await interaction.reply({ content: '✅ Đã tạo poll!', ephemeral: true });
    }
  },
};
