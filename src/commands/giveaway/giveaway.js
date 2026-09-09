const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const gw = require('../../utils/giveaways');

module.exports = {
  group: 'giveaway',
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Tổ chức giveaway')
    .addSubcommand(s => s.setName('start').setDescription('Bắt đầu giveaway mới')
      .addStringOption(o => o.setName('prize').setDescription('Giải thưởng').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('VD: 10m, 1h, 1d (trống = mặc định server)'))
      .addIntegerOption(o => o.setName('winners').setDescription('Số người thắng (trống = mặc định)').setMinValue(1).setMaxValue(20))
      .addChannelOption(o => o.setName('channel').setDescription('Kênh đăng (trống = kênh mặc định/kênh hiện tại)').addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(s => s.setName('end').setDescription('Kết thúc giveaway sớm')
      .addStringOption(o => o.setName('message_id').setDescription('ID tin nhắn giveaway').setRequired(true)))
    .addSubcommand(s => s.setName('reroll').setDescription('Roll lại người thắng')
      .addStringOption(o => o.setName('message_id').setDescription('ID tin nhắn giveaway').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'start') {
      const prize = interaction.options.getString('prize', true);
      const st = await require('../../utils/guildSettings').getGuildSettings(interaction.guildId).catch(() => null);
      const timeStr = interaction.options.getString('duration') || st?.giveawayDuration || '10m';
      const winnersCount = interaction.options.getInteger('winners') || st?.giveawayWinners || 1;
      let channel = interaction.options.getChannel('channel') || interaction.channel;
      if ((!interaction.options.getChannel('channel')) && st?.giveawayChannelId) {
        channel = await interaction.guild.channels.fetch(st.giveawayChannelId).catch(() => interaction.channel);
      }
      if (!channel?.isTextBased()) {
        return interaction.reply({ embeds: [errorEmbed('Không tìm thấy kênh đăng giveaway.')], ephemeral: true });
      }
      const ms = gw.parseDuration(timeStr);
      if (!ms) return interaction.reply({ embeds: [errorEmbed('Thời gian không hợp lệ. VD: `30s`, `10m`, `2h`, `1d`.')], ephemeral: true });
      await interaction.deferReply({ ephemeral: true }).catch(() => {});
      const g = await gw.start(client, {
        guild: interaction.guild, channel,
        prize, winnersCount, durationMs: ms, host: interaction.user,
      });
      return interaction.editReply({ embeds: [successEmbed(`🎉 Đã tạo giveaway **${prize}** ở ${channel}!\n${winnersCount} người thắng • kết thúc sau ${timeStr}.`)] });
    }
    if (sub === 'end' || sub === 'reroll') {
      const mid = interaction.options.getString('message_id', true);
      const found = gw.findByMessageId(mid);
      if (!found) return interaction.reply({ embeds: [errorEmbed('Không tìm thấy giveaway với message ID này.')], ephemeral: true });
      await interaction.deferReply();
      const { winners } = await gw.end(client, found.id, { reroll: sub === 'reroll' });
      return interaction.followUp({ embeds: [successEmbed(`${sub === 'reroll' ? 'Đã roll lại' : 'Đã kết thúc'}! Thắng: ${winners.length ? winners.map(w => `<@${w}>`).join(', ') : 'không ai'}`)] });
    }
  },
};
