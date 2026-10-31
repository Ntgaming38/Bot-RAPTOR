const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed } = require('../../utils/embeds');
const { getProfile, addCredits } = require('../../utils/social');
const { getGuildSettings } = require('../../utils/guildSettings');

async function items(guildId) {
  const st = await getGuildSettings(guildId).catch(() => null);
  return Array.isArray(st?.shopItems) ? st.shopItems : [];
}

module.exports = {
  group: 'fun',
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Cửa hàng đổi credits lấy role (quản lý mặt hàng trên dashboard)')
    .addSubcommand((sc) => sc.setName('list').setDescription('Xem các mặt hàng đang bán'))
    .addSubcommand((sc) => sc.setName('buy').setDescription('Mua một mặt hàng bằng credits')
      .addStringOption((o) => o.setName('id').setDescription('Mã mặt hàng (xem trong /shop list)').setRequired(true))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const list = await items(interaction.guildId);
    if (sub === 'list') {
      if (!list.length) {
        return interaction.reply({ content: '🛒 Cửa hàng đang trống — quản trị viên có thể thêm mặt hàng ở dashboard, mục **Shop**.', ephemeral: true });
      }
      const bal = (await getProfile(interaction.guildId, interaction.user.id)).credits;
      const desc = list.map((it) => `**${it.id}** — ${it.name} · **${it.price}** credits${it.roleId ? ` · <@&${it.roleId}>` : ''}${it.desc ? `\n　${it.desc}` : ''}`).join('\n');
      return interaction.reply({ embeds: [embed({ title: '🛒 Cửa hàng', description: `${desc}\n\n💰 Số dư của bạn: **${bal}** credits — mua bằng lệnh \`/shop buy id:<mã>\`` })] });
    }
    // buy
    const id = interaction.options.getString('id').trim().toLowerCase();
    const it = list.find((x) => String(x.id).toLowerCase() === id);
    if (!it) return interaction.reply({ content: `⚠️ Không thấy mặt hàng **${id}** — xem danh sách bằng \`/shop list\`.`, ephemeral: true });
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) return interaction.reply({ content: '⚠️ Không tìm thấy thông tin thành viên của bạn.', ephemeral: true });
    if (it.roleId && member.roles.cache.has(it.roleId)) {
      return interaction.reply({ content: 'ℹ️ Bạn đã có role này rồi.', ephemeral: true });
    }
    const profile = await getProfile(interaction.guildId, interaction.user.id);
    if ((profile.credits || 0) < it.price) {
      return interaction.reply({ content: `⚠️ Chưa đủ credits: cần **${it.price}**, bạn có **${profile.credits || 0}**. Nhận thêm bằng \`/credits daily\` nhé.`, ephemeral: true });
    }
    if (it.roleId) {
      const role = await interaction.guild.roles.fetch(it.roleId).catch(() => null);
      if (!role) return interaction.reply({ content: '⚠️ Role của mặt hàng này không còn tồn tại — báo quản trị viên kiểm tra lại Shop trên dashboard.', ephemeral: true });
      const me = interaction.guild.members.me;
      if (!me?.permissions.has(PermissionFlagsBits.ManageRoles) || role.position >= me.roles.highest.position) {
        return interaction.reply({ content: '⚠️ Bot không gán được role này (thiếu quyền Manage Roles hoặc role ở cao hơn bot).', ephemeral: true });
      }
      await member.roles.add(role.id).catch(() => null);
      if (!member.roles.cache.has(role.id)) {
        return interaction.reply({ content: '⚠️ Gán role thất bại — chưa trừ credits. Thử lại sau nhé.', ephemeral: true });
      }
    }
    const balance = await addCredits(interaction.guildId, interaction.user.id, -Math.abs(it.price));
    await require('../../utils/activity').record(interaction.guildId, 'shop', `@${interaction.user.tag} mua “${it.name}” (${it.price} credits)`).catch(() => {});
    return interaction.reply({ embeds: [embed({ title: '✅ Mua thành công', description: `Bạn đã mua **${it.name}** với **${it.price}** credits.${it.roleId ? `\nĐã gán role <@&${it.roleId}>.` : ''}\n💰 Số dư còn lại: **${balance}** credits.` })] });
  },
};
