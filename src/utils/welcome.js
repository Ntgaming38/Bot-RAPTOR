const config = require('../config');
const { embed } = require('./embeds');

// 1st, 2nd, 3rd... như trong hình (185th)
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function ch(id, fallback) {
  return id ? `<#${id}>` : fallback;
}

// member: GuildMember (có .user + .guild). Dùng chung cho event join thật + lệnh xem trước.
function buildWelcome(member) {
  const guild = member.guild;
  const server = guild.name;
  const author = config.welcomeTitle || `By ${server}`;
  const count = ordinal(guild.memberCount);
  const thumb = config.welcomeImageUrl || guild.iconURL({ size: 256 }) || member.user.displayAvatarURL({ size: 256 });

  const description = [
    `➔ Chào mừng ${member} đã tham gia **${server}**.`,
    `➔ Bạn là người thứ : **${count}**`,
    `➔ Nhớ chọn Role ở kênh ✅ ${ch(config.welcomeRoleChannelId, '**role-sever**')} để xem các kênh trong sever nhé.`,
    `➔ Hãy nhớ vào ${ch(config.welcomeRulesChannelId, '**rule-discord**')} để hiểu rõ luật của Sever phạm sai lầm...!`,
    `➔ Luôn luôn check 🔊 ${ch(config.welcomeAnnounceChannelId, '**thông-báo**')} để không bỏ lỡ những việc quan trọng, điều đó có thể sẽ giúp bạn nha...!`,
    `➔ Có gì khó khăn hãy vào 💬 ${ch(config.welcomeChatChannelId, '**chat-chung**')} nơi giao lưu của mọi người nhé...!`,
  ].join('\n');

  return embed({
    title: author,
    description,
    thumbnail: thumb,
    color: config.welcomeColor,
    footer: `${member.user.tag} • ${new Date().toLocaleString('vi-VN')}`,
  });
}

module.exports = { buildWelcome, ordinal };
