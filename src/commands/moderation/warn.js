const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, embed } = require('../../utils/embeds');
const { addWarn, listWarns, clearWarns } = require('../../utils/warns');
const { checkHierarchy } = require('../../utils/moderation');

module.exports = {
  group: 'moderation',
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Cảnh cáo thành viên')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(s => s
      .setName('add')
      .setDescription('Cảnh cáo 1 người')
      .addUserOption(o => o.setName('user').setDescription('Người cần warn').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Lý do').setMaxLength(500)))
    .addSubcommand(s => s
      .setName('list')
      .setDescription('Xem các warn của 1 người')
      .addUserOption(o => o.setName('user').setDescription('Người cần xem').setRequired(true)))
    .addSubcommand(s => s
      .setName('clear')
      .setDescription('Xóa hết warn của 1 người')
      .addUserOption(o => o.setName('user').setDescription('Người cần xóa warn').setRequired(true)))
    .addSubcommand(s => s
      .setName('escalation')
      .setDescription('Leo thang theo số warn: xem thang phạt, hoặc chỉnh mốc (chỉ Admin)')
      .addBooleanOption(o => o.setName('enabled').setDescription('Bật/tắt leo thang'))
      .addIntegerOption(o => o.setName('timeout_at').setDescription('Số warn thì bị timeout').setMinValue(2).setMaxValue(50))
      .addIntegerOption(o => o.setName('timeout_minutes').setDescription('Timeout bao nhiêu phút').setMinValue(1).setMaxValue(40320))
      .addIntegerOption(o => o.setName('kick_at').setDescription('Số warn thì bị kick').setMinValue(2).setMaxValue(50))
      .addIntegerOption(o => o.setName('ban_at').setDescription('Số warn thì bị ban').setMinValue(2).setMaxValue(50))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === 'escalation') {
      const { getGuildSettings, saveGuildSettings } = require('../../utils/guildSettings');
      const { getEscalation } = require('../../utils/escalation');
      const st = await getGuildSettings(guildId).catch(() => null);
      const cur = getEscalation(st);
      const touched = ['enabled', 'timeout_at', 'timeout_minutes', 'kick_at', 'ban_at']
        .some((k) => interaction.options.get(k) !== null && interaction.options.get(k) !== undefined);
      if (!touched) {
        return interaction.reply({
          embeds: [embed({
            title: '⤴️ Leo thang theo số warn',
            description: `Trạng thái: **${cur.enabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}**\n• Đủ **${cur.timeoutAt} warn** → timeout ${cur.timeoutMinutes} phút\n• Đủ **${cur.kickAt} warn** → kick\n• Đủ **${cur.banAt} warn** → ban\n\nAdmin chỉnh bằng: \`/warn escalation enabled:true timeout_at:3 kick_at:5 ban_at:7\` (điền phần cần đổi).`,
          })],
          ephemeral: true,
        });
      }
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ embeds: [errorEmbed('Chỉ Admin (Manage Server) mới chỉnh được leo thang.')], ephemeral: true });
      }
      const next = { ...cur };
      const en = interaction.options.getBoolean('enabled');
      if (en !== null) next.enabled = en;
      const ta = interaction.options.getInteger('timeout_at');
      if (ta !== null) next.timeoutAt = ta;
      const tm = interaction.options.getInteger('timeout_minutes');
      if (tm !== null) next.timeoutMinutes = tm;
      const ka = interaction.options.getInteger('kick_at');
      if (ka !== null) next.kickAt = ka;
      const ba = interaction.options.getInteger('ban_at');
      if (ba !== null) next.banAt = ba;
      await saveGuildSettings(guildId, { warnEscalation: next });
      return interaction.reply({ embeds: [successEmbed(`Đã lưu leo thang: **${next.enabled ? 'BẬT' : 'TẮT'}** — ${next.timeoutAt} warn → timeout ${next.timeoutMinutes} phút · ${next.kickAt} warn → kick · ${next.banAt} warn → ban.`)] });
    }

    const user = interaction.options.getUser('user', true);

    if (sub === 'add') {
      // Thứ bậc: không warn người có role >= mình, không warn chủ server/bot
      const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (targetMember) {
        const hierErr = checkHierarchy(interaction.member, targetMember, interaction.guild, { blockBotTarget: true });
        if (hierErr) return interaction.reply({ embeds: [errorEmbed(hierErr)], ephemeral: true });
      } else if (user.bot) {
        return interaction.reply({ embeds: [errorEmbed('Không áp dụng với bot.')], ephemeral: true });
      }
      const reason = interaction.options.getString('reason') || 'Không có lý do';
      const count = await addWarn(guildId, user.id, interaction.user.id, interaction.user.tag, reason);
      // Leo thang: đủ mốc warn thì tự timeout/kick/ban (cấu hình: /warn escalation)
      let escDesc = null;
      if (targetMember) {
        try {
          const st = await require('../../utils/guildSettings').getGuildSettings(guildId).catch(() => null);
          escDesc = await require('../../utils/escalation').applyEscalation({
            guild: interaction.guild, member: targetMember, count, st, source: '/warn',
          });
        } catch {}
      }
      try {
        await user.send(`⚠️ Bạn bị warn ở **${interaction.guild.name}** (lần ${count}).\nLý do: ${reason}${escDesc ? `\n⤴️ Vì đạt mốc warn, bạn bị áp dụng thêm: **${escDesc}**.` : ''}`).catch(() => {});
      } catch {}
      await require('../../utils/logger').log(guildId && interaction.guild, 'warn', {
        title: '⚠️ Warn',
        description: `**User:** ${user.tag} (<@${user.id}>)\n**Lần thứ:** ${count}\n**Lý do:** ${reason}`,
        color: 0xFEE75C,
        user,
        moderator: interaction.user,
      });
      return interaction.reply({ embeds: [successEmbed(`Đã warn **${user.tag}** (lần ${count}).\nLý do: ${reason}${escDesc ? `\n⤴️ Leo thang: đã áp dụng **${escDesc}**.` : ''}`)] });
    }
    if (sub === 'list') {
      const list = await listWarns(guildId, user.id);
      if (!list.length) return interaction.reply({ content: `✅ **${user.tag}** chưa có warn nào.`, ephemeral: true });
      const lines = list.map((w, i) => `**${i + 1}.** ${w.reason} — *${w.byTag || w.by}* (<t:${Math.floor(w.at / 1000)}:R>)`);
      return interaction.reply({ embeds: [embed({ title: `⚠️ Warn của ${user.tag} (${list.length})`, description: lines.join('\n').slice(0, 4000) })], ephemeral: true });
    }
    if (sub === 'clear') {
      await clearWarns(guildId, user.id);
      return interaction.reply({ embeds: [successEmbed(`Đã xóa hết warn của **${user.tag}**.`)] });
    }
  },
};
