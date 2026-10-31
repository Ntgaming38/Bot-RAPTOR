const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const aiChat = require('../../utils/aiChat');

function needAdmin(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    interaction.reply({ embeds: [errorEmbed('Chỉ Admin (Manage Server) mới dùng được lệnh này.')], ephemeral: true }).catch(() => {});
    return false;
  }
  return true;
}

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('AI Chat — bot trả lời khi được tag @RAPTOR (chỉ Admin)')
    .addSubcommand((s) => s.setName('status').setDescription('Xem trạng thái AI Chat'))
    .addSubcommand((s) => s.setName('on').setDescription('Bật AI Chat cho server này'))
    .addSubcommand((s) => s.setName('off').setDescription('Tắt AI Chat'))
    .addSubcommand((s) => s
      .setName('channel')
      .setDescription('Chọn kênh chat riêng với bot (không chọn = chỉ trả lời khi được tag)')
      .addChannelOption((o) => o.setName('channel').setDescription('Kênh text (để trống = gỡ kênh riêng)').addChannelTypes(ChannelType.GuildText)))
    .addSubcommand((s) => s
      .setName('persona')
      .setDescription('Đặt tính cách/cách trả lời của bot (gõ "reset" để về mặc định)')
      .addStringOption((o) => o.setName('text').setDescription('Mô tả tính cách (tối đa 1000 ký tự)').setRequired(true).setMaxLength(1000))),
  async execute(interaction) {
    if (!needAdmin(interaction)) return;
    const sub = interaction.options.getSubcommand();
    const gs = require('../../utils/guildSettings');
    const st = await gs.getGuildSettings(interaction.guildId).catch(() => ({}));
    const cfg = aiChat.cfgOf(st);
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true }).catch(() => {});

    if (sub === 'status') {
      return interaction.editReply({
        content: [
          `**AI Chat:** ${cfg.enabled ? '🟢 Đang bật' : '⚪ Đang tắt'}`,
          `**API key:** ${aiChat.keyConfigured() ? '✅ Đã có (trong Environment của Botkeep)' : '❌ Chưa có — cần đặt biến AI_API_KEY trong Botkeep'}`,
          `**Model:** ${cfg.model}`,
          `**Kênh chat riêng:** ${cfg.channelId ? `<#${cfg.channelId}>` : 'chưa đặt (chỉ trả lời khi được tag @RAPTOR)'}`,
          `**Tính cách:** ${cfg.persona.slice(0, 200)}${cfg.persona.length > 200 ? '…' : ''}`,
        ].join('\n'),
      });
    }
    if (sub === 'on' || sub === 'off') {
      await gs.saveGuildSettings(interaction.guildId, { aiChatCfg: { ...cfg, enabled: sub === 'on', persona: st.aiChatCfg?.persona || null, model: st.aiChatCfg?.model || null } });
      return interaction.editReply({ embeds: [successEmbed(sub === 'on'
        ? `Đã bật AI Chat. ${aiChat.keyConfigured() ? 'Tag @RAPTOR hoặc chat trong kênh riêng để trò chuyện.' : '⚠️ Nhưng chưa có API key (AI_API_KEY) nên bot chưa trả lời được.'}`
        : 'Đã tắt AI Chat.')] });
    }
    if (sub === 'channel') {
      const ch = interaction.options.getChannel('channel');
      await gs.saveGuildSettings(interaction.guildId, { aiChatCfg: { ...(st.aiChatCfg || {}), channelId: ch ? ch.id : null } });
      return interaction.editReply({ embeds: [successEmbed(ch
        ? `Đã đặt ${ch} làm kênh chat riêng — cứ nhắn trong kênh này là bot trả lời, khỏi cần tag.`
        : 'Đã gỡ kênh chat riêng — bot chỉ trả lời khi được tag @RAPTOR.')] });
    }
    if (sub === 'persona') {
      const text = interaction.options.getString('text', true);
      const persona = text.trim().toLowerCase() === 'reset' ? null : text.trim();
      await gs.saveGuildSettings(interaction.guildId, { aiChatCfg: { ...(st.aiChatCfg || {}), persona } });
      return interaction.editReply({ embeds: [successEmbed(persona ? 'Đã lưu tính cách mới cho bot.' : 'Đã đưa tính cách về mặc định.')] });
    }
  },
};
