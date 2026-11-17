const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, embed } = require('../../utils/embeds');
const cc = require('../../utils/customCommands');
const { getGuildSettings, saveGuildSettings } = require('../../utils/guildSettings');

function needAdmin(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    interaction.reply({ embeds: [errorEmbed('Chỉ Admin (Manage Server) mới dùng được phần này.')], ephemeral: true }).catch(() => {});
    return false;
  }
  return true;
}

module.exports = {
  group: 'utility',
  data: new SlashCommandBuilder()
    .setName('custom')
    .setDescription('Lệnh tự tạo của server: gõ !tên trong chat, bot trả lời sẵn')
    .addSubcommand(s => s
      .setName('add')
      .setDescription('Tạo hoặc sửa 1 lệnh tự tạo (chỉ Admin)')
      .addStringOption(o => o.setName('name').setDescription('Tên lệnh, VD: discord (gõ !discord để gọi)').setRequired(true).setMaxLength(32))
      .addStringOption(o => o.setName('response').setDescription('Nội dung bot trả lời — dùng được {user} {username} {server} {args}').setRequired(true).setMaxLength(cc.MAX_RESPONSE)))
    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Xóa 1 lệnh tự tạo (chỉ Admin)')
      .addStringOption(o => o.setName('name').setDescription('Tên lệnh cần xóa').setRequired(true).setMaxLength(32)))
    .addSubcommand(s => s.setName('list').setDescription('Xem mọi lệnh tự tạo của server'))
    .addSubcommand(s => s
      .setName('toggle')
      .setDescription('Bật/tắt toàn bộ lệnh tự tạo (chỉ Admin)')
      .addBooleanOption(o => o.setName('enabled').setDescription('true = bật, false = tắt').setRequired(true))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const st = await getGuildSettings(guildId).catch(() => null);
    const prefix = String(st?.prefix || '!').trim() || '!';

    if (sub === 'list') {
      const list = await cc.listCommands(guildId);
      if (!list.length) {
        return interaction.reply({ embeds: [errorEmbed(`Server chưa có lệnh tự tạo nào. Admin tạo bằng \`/custom add\` rồi gõ \`${prefix}tên\` trong chat để gọi.`)], ephemeral: true });
      }
      const lines = list.map((c) => `\`${prefix}${c.name}\` — đã dùng ${c.uses || 0} lần`);
      return interaction.reply({
        embeds: [embed({ title: `🧩 Lệnh tự tạo (${list.length}/${cc.MAX_PER_GUILD})`, description: lines.join('\n').slice(0, 4000) })],
        ephemeral: true,
      });
    }

    if (!needAdmin(interaction)) return;

    if (sub === 'add') {
      const name = cc.validateName(interaction.options.getString('name', true));
      if (!name) {
        return interaction.reply({ embeds: [errorEmbed('Tên lệnh không hợp lệ: chỉ chữ thường/số/dấu - hoặc _ (1–32 ký tự, bắt đầu bằng chữ hoặc số) và không trùng tên hệ thống.')], ephemeral: true });
      }
      const response = interaction.options.getString('response', true);
      try {
        const { created } = await cc.saveCommand(guildId, { name, response, createdBy: interaction.user.id });
        return interaction.reply({ embeds: [successEmbed(`${created ? 'Đã tạo' : 'Đã cập nhật'} lệnh \`${prefix}${name}\`. Gõ \`${prefix}${name}\` trong chat để thử.`)] });
      } catch (e) {
        if (e?.message === 'LIMIT') {
          return interaction.reply({ embeds: [errorEmbed(`Server đã đủ ${cc.MAX_PER_GUILD} lệnh tự tạo. Xóa bớt bằng \`/custom remove\` trước.`)], ephemeral: true });
        }
        throw e;
      }
    }

    if (sub === 'remove') {
      const name = cc.validateName(interaction.options.getString('name', true));
      if (!name) return interaction.reply({ embeds: [errorEmbed('Tên lệnh không hợp lệ.')], ephemeral: true });
      const ok = await cc.deleteCommand(guildId, name);
      return interaction.reply({ embeds: [ok ? successEmbed(`Đã xóa lệnh \`${prefix}${name}\`.`) : errorEmbed(`Không có lệnh \`${prefix}${name}\` nào.`)] });
    }

    if (sub === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled', true);
      await saveGuildSettings(guildId, { customCmdCfg: { ...(st?.customCmdCfg || {}), enabled } });
      return interaction.reply({ embeds: [successEmbed(`Đã ${enabled ? 'BẬT' : 'TẮT'} lệnh tự tạo cho server.`)] });
    }
  },
};
