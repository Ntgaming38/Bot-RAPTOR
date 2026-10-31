const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, errorEmbed } = require('../../utils/embeds');
const { getProfile, addCredits } = require('../../utils/social');
const { getGuildSettings } = require('../../utils/guildSettings');
const gacha = require('../../utils/gacha');

async function cfg(guildId) {
  const st = await getGuildSettings(guildId).catch(() => null);
  const c = st?.gachaCfg || {};
  return { cost: Math.max(1, parseInt(c.cost, 10) || 100), prizes: Array.isArray(c.prizes) ? c.prizes : [] };
}

module.exports = {
  group: 'fun',
  data: new SlashCommandBuilder()
    .setName('gacha')
    .setDescription('Mở hộp gacha bằng credits — trúng role và quà ngẫu nhiên')
    .addSubcommand((sc) => sc.setName('info').setDescription('Xem giá mở hộp và tỉ lệ các phần quà'))
    .addSubcommand((sc) => sc.setName('open').setDescription('Mở 1 hộp gacha')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const { cost, prizes } = await cfg(interaction.guildId);
    if (!prizes.length) {
      return interaction.reply({ content: '🎁 Hộp gacha chưa được cấu hình — quản trị viên thêm phần quà ở dashboard, mục **Shop → Hộp gacha**.', ephemeral: true });
    }
    if (sub === 'info') {
      const list = gacha.odds(prizes).map((p) => `• **${p.name}** — ${p.pct}%`).join('\n');
      const bal = getProfile(interaction.guildId, interaction.user.id).credits;
      return interaction.reply({ embeds: [embed({ title: '🎁 Hộp gacha', description: `Giá mở: **${cost}** credits/hộp\n\n${list}\n\n💰 Số dư của bạn: **${bal}** credits — mở bằng \`/gacha open\`` })] });
    }
    const profile = getProfile(interaction.guildId, interaction.user.id);
    if ((profile.credits || 0) < cost) {
      return interaction.reply({ embeds: [errorEmbed(`Chưa đủ credits: mở hộp cần **${cost}**, bạn có **${profile.credits || 0}**. Làm nhiệm vụ /quests hoặc /credits daily để kiếm thêm nhé.`)], ephemeral: true });
    }
    const prize = gacha.pick(prizes);
    if (!prize) return interaction.reply({ embeds: [errorEmbed('Hộp gacha đang lỗi cấu hình (tỉ lệ trống).')], ephemeral: true });
    let balance = addCredits(interaction.guildId, interaction.user.id, -cost);
    let granted = '';
    if (prize.roleId) {
      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      const role = await interaction.guild.roles.fetch(prize.roleId).catch(() => null);
      const me = interaction.guild.members.me;
      if (member && role && me?.permissions.has(PermissionFlagsBits.ManageRoles) && role.position < me.roles.highest.position && !member.roles.cache.has(role.id)) {
        await member.roles.add(role.id).catch(() => {});
        if (member.roles.cache.has(role.id)) granted = `\nĐã gán role <@&${role.id}> cho bạn.`;
      }
    }
    await require('../../utils/activity').record(interaction.guildId, 'gacha', `@${interaction.user.tag} mở gacha trúng “${prize.name}”`).catch(() => {});
    return interaction.reply({
      embeds: [embed({
        title: '🎉 Mở hộp gacha!',
        description: `${interaction.user} mở hộp và trúng...\n\n🏆 **${prize.name}**${granted}\n\n💰 Số dư còn lại: **${balance}** credits.`,
      })],
    });
  },
};
