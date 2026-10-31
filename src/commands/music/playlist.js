const { SlashCommandBuilder } = require('discord.js');
const { embed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { requireVoice, playerOf } = require('../../music/helpers');
const playlists = require('../../utils/playlists');

module.exports = {
  group: 'music',
  data: new SlashCommandBuilder()
    .setName('playlist')
    .setDescription('Playlist nhạc cá nhân: lưu hàng đợi hiện tại và mở lại sau')
    .addSubcommand((sc) => sc.setName('save').setDescription('Lưu bài đang phát + hàng đợi thành playlist')
      .addStringOption((o) => o.setName('name').setDescription('Tên playlist').setRequired(true).setMaxLength(40)))
    .addSubcommand((sc) => sc.setName('list').setDescription('Xem các playlist của bạn'))
    .addSubcommand((sc) => sc.setName('play').setDescription('Phát một playlist đã lưu')
      .addStringOption((o) => o.setName('name').setDescription('Tên playlist').setRequired(true).setMaxLength(40)))
    .addSubcommand((sc) => sc.setName('delete').setDescription('Xóa một playlist')
      .addStringOption((o) => o.setName('name').setDescription('Tên playlist').setRequired(true).setMaxLength(40))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const name = interaction.options.getString('name');
    if (sub === 'list') {
      const mine = await playlists.list(interaction.guildId, interaction.user.id);
      if (!mine.length) return interaction.reply({ content: '📂 Bạn chưa có playlist nào. Đang phát nhạc thì gõ `/playlist save tên:<tên>` để lưu nhé.', ephemeral: true });
      return interaction.reply({ embeds: [embed({ title: '📂 Playlist của bạn', description: mine.map((p) => `• **${p.name}** — ${p.count} bài`).join('\n') })] });
    }
    if (sub === 'delete') {
      const ok = await playlists.remove(interaction.guildId, interaction.user.id, name);
      return interaction.reply({ embeds: [ok ? successEmbed(`Đã xóa playlist **${name}**.`) : errorEmbed(`Không thấy playlist **${name}**.`)], ephemeral: true });
    }
    const player = playerOf(interaction.client);
    if (!player) return interaction.reply({ embeds: [errorEmbed('Player nhạc chưa khởi tạo.')], ephemeral: true });
    if (sub === 'save') {
      const queue = player.nodes?.get?.(interaction.guildId);
      const current = queue?.currentTrack || queue?.current;
      if (!queue || !current) return interaction.reply({ embeds: [errorEmbed('Chưa có nhạc đang phát để lưu. Hãy /play một bài trước.')], ephemeral: true });
      const tracks = [current, ...(queue.tracks?.toArray?.() || [])].map((t) => ({ url: t.url, title: t.title }));
      try {
        const n = await playlists.save(interaction.guildId, interaction.user.id, name, tracks);
        return interaction.reply({ embeds: [successEmbed(`Đã lưu playlist **${name.toLowerCase()}** với **${n}** bài. Mở lại bằng \`/playlist play tên:${name.toLowerCase()}\`.`)] });
      } catch (e) {
        return interaction.reply({ embeds: [errorEmbed(e.message)], ephemeral: true });
      }
    }
    // play
    const channel = await requireVoice(interaction);
    if (!channel) return;
    const saved = await playlists.get(interaction.guildId, interaction.user.id, name);
    if (!saved || !saved.tracks.length) return interaction.reply({ embeds: [errorEmbed(`Không thấy playlist **${name}** — xem danh sách bằng \`/playlist list\`.`)], ephemeral: true });
    await interaction.deferReply();
    try {
      const first = saved.tracks[0];
      const res = await player.play(channel, first.url, { requestedBy: interaction.user, nodeOptions: { metadata: { channel: interaction.channel } } });
      const q = res?.queue || player.nodes?.get?.(interaction.guildId);
      let added = 0;
      if (q) {
        for (const t of saved.tracks.slice(1, playlists.MAX_TRACKS)) {
          const sr = await player.search(t.url, { requestedBy: interaction.user }).catch(() => null);
          const tr = sr?.tracks?.[0];
          if (tr) { q.addTrack(tr); added++; }
        }
      }
      await interaction.editReply({ embeds: [successEmbed(`▶️ Đang phát playlist **${saved.name}**: bắt đầu với **${first.title}**${added ? `, đã xếp thêm **${added}** bài vào hàng đợi` : ''}.`)] });
    } catch (e) {
      await interaction.editReply({ embeds: [errorEmbed('Không phát được playlist này (link có thể đã hỏng).')] });
    }
  },
};
