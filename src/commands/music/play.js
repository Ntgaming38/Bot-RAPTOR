const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { useMainPlayer } = require('discord-player');
const { embed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  group: 'nhạc',
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Phát nhạc (YouTube / SoundCloud / link)')
    .addStringOption(o => o.setName('song').setDescription('Tên bài hát hoặc link YouTube/SoundCloud').setRequired(true)),
  async execute(interaction) {
    const channel = interaction.member?.voice?.channel;
    if (!channel) return interaction.reply({ embeds: [errorEmbed('Bạn phải vào kênh voice trước đã!')], ephemeral: true });

    const me = interaction.guild.members.me;
    if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.Connect)) {
      return interaction.reply({ embeds: [errorEmbed('Bot không có quyền vào kênh voice này.')], ephemeral: true });
    }
    if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.Speak)) {
      return interaction.reply({ embeds: [errorEmbed('Bot không có quyền nói trong kênh voice này.')], ephemeral: true });
    }

    const query = interaction.options.getString('song', true);
    const player = useMainPlayer();
    if (!player) return interaction.reply({ embeds: [errorEmbed('Player nhạc chưa khởi tạo.')], ephemeral: true });

    await interaction.deferReply();
    try {
      const { track } = await player.play(channel, query, {
        nodeOptions: { metadata: { channel: interaction.channel } },
        requestedBy: interaction.user,
      });
      await interaction.followUp({
        embeds: [embed({
          title: '🎶 Đã thêm vào hàng chờ',
          description: `**${track.cleanTitle || track.title}**\nTác giả: ${track.author || '?'}\nThời lượng: ${track.duration || '?'}`,
          thumbnail: track.thumbnail,
          footer: `Yêu cầu bởi ${interaction.user.tag}`,
        })],
      });
    } catch (e) {
      console.error('[play]', e?.message);
      const msg = /No results|Empty|Noresult/i.test(e?.message || '')
        ? 'Không tìm thấy bài này. Thử link trực tiếp hoặc từ khóa khác.'
        : `Không phát được: ${e?.message || e}`.slice(0, 500);
      if (interaction.deferred) await interaction.followUp({ embeds: [errorEmbed(msg)] }).catch(() => {});
      else await interaction.reply({ embeds: [errorEmbed(msg)], ephemeral: true }).catch(() => {});
    }
  },
};
