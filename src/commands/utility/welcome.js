const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embeds');
const { buildWelcome } = require('../../utils/welcome');
const { getWelcomeSettings, saveWelcomeSettings, clearWelcomeSettings } = require('../../utils/welcomeSettings');

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Cài đặt tin nhắn chào mừng (chỉ Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s
      .setName('setup')
      .setDescription('Cài đặt kênh + nội dung welcome (giống BotGhost)')
      .addChannelOption(o => o.setName('channel').setDescription('Kênh gửi welcome (#welcome)').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('Tiêu đề, VD: By RAPTOR'))
      .addChannelOption(o => o.setName('role-channel').setDescription('Kênh chọn role ✅').addChannelTypes(ChannelType.GuildText))
      .addChannelOption(o => o.setName('rules-channel').setDescription('Kênh luật').addChannelTypes(ChannelType.GuildText))
      .addChannelOption(o => o.setName('announce-channel').setDescription('Kênh thông báo 🔊').addChannelTypes(ChannelType.GuildText))
      .addChannelOption(o => o.setName('chat-channel').setDescription('Kênh chat chung 💬').addChannelTypes(ChannelType.GuildText))
      .addStringOption(o => o.setName('image').setDescription('Link ảnh/gif góc phải'))
      .addStringOption(o => o.setName('color').setDescription('Màu viền, VD: #FF4D9D'))
      .addStringOption(o => o.setName('reactions').setDescription('VD: 🔥,✅ (tối đa 5)'))
      .addRoleOption(o => o.setName('auto-role').setDescription('Role tự gắn khi join')))
    .addSubcommand(s => s.setName('test').setDescription('Gửi thử welcome vào kênh hiện tại'))
    .addSubcommand(s => s.setName('status').setDescription('Xem cấu hình welcome hiện tại'))
    .addSubcommand(s => s.setName('disable').setDescription('Tắt welcome (về .env)')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      const patch = {
        channelId: channel?.id || null,
        title: interaction.options.getString('title') || null,
        roleChannelId: interaction.options.getChannel('role-channel')?.id || null,
        rulesChannelId: interaction.options.getChannel('rules-channel')?.id || null,
        announceChannelId: interaction.options.getChannel('announce-channel')?.id || null,
        chatChannelId: interaction.options.getChannel('chat-channel')?.id || null,
        imageUrl: interaction.options.getString('image') || null,
        color: interaction.options.getString('color') || null,
        autoRoleId: interaction.options.getRole('auto-role')?.id || null,
      };
      const rawReactions = interaction.options.getString('reactions');
      if (rawReactions !== null) {
        patch.reactions = rawReactions.split(',').map(e => e.trim()).filter(Boolean).slice(0, 5);
      }
      // Bỏ các field null (giữ giá trị cũ/.env)
      for (const k of Object.keys(patch)) {
        if (patch[k] === null) delete patch[k];
      }
      const s = await saveWelcomeSettings(guildId, patch);
      const preview = await interaction.channel.send({ embeds: [buildWelcome(interaction.member, s)] }).catch(() => null);
      if (preview && s.reactions?.length) {
        for (const e of s.reactions.slice(0, 5)) await preview.react(e).catch(() => {});
      }
      return interaction.reply({ embeds: [successEmbed(`Đã lưu welcome → ${channel}\nGửi thử ở trên, member mới join sẽ nhận y hệt.`)] });
    }

    if (sub === 'test') {
      const s = await getWelcomeSettings(guildId);
      if (!s.channelId) return interaction.reply({ embeds: [errorEmbed('Chưa setup kênh. Chạy `/welcome setup` trước.')], ephemeral: true });
      const msg = await interaction.channel.send({ embeds: [buildWelcome(interaction.member, s)] });
      for (const e of (s.reactions || []).slice(0, 5)) await msg.react(e).catch(() => {});
      return interaction.reply({ content: '✅ Đã gửi bản xem trước ở trên.', ephemeral: true });
    }

    if (sub === 'status') {
      const s = await getWelcomeSettings(guildId);
      return interaction.reply({
        embeds: [embed({
          title: '⚙️ Cấu hình welcome',
          description: [
            `Kênh: ${s.channelId ? `<#${s.channelId}>` : '_chưa có_ (dùng .env)_'}`,
            `Tiêu đề: **${s.title || '(mặc định theo tên server)'}**`,
            `Role: ${s.roleChannelId ? `<#${s.roleChannelId}>` : '—'} | Luật: ${s.rulesChannelId ? `<#${s.rulesChannelId}>` : '—'}`,
            `Thông báo: ${s.announceChannelId ? `<#${s.announceChannelId}>` : '—'} | Chat: ${s.chatChannelId ? `<#${s.chatChannelId}>` : '—'}`,
            `Ảnh: ${s.imageUrl ? `[xem](${s.imageUrl})` : 'mặc định icon server'}`,
            `Màu: \`${s.color || '#FF4D9D'}\` | Reactions: ${(s.reactions || []).join(' ') || '—'}`,
            `Auto-role: ${s.autoRoleId ? `<@&${s.autoRoleId}>` : '—'}`,
          ].join('\n'),
        })],
        ephemeral: true,
      });
    }

    if (sub === 'disable') {
      await clearWelcomeSettings(guildId);
      return interaction.reply({ embeds: [successEmbed('Đã tắt welcome setup trong Discord, bot quay về đọc `.env`.')] });
    }
  },
};
