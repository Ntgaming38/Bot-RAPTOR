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
// s: setting đã merge (từ /welcome setup). Không truyền = dùng .env.
function buildWelcome(member, s) {
  const guild = member.guild;
  const server = guild.name;
  const author = (s?.title) || config.welcomeTitle || `By ${server}`;
  const count = ordinal(guild.memberCount);
  const thumb = (s?.imageUrl) || config.welcomeImageUrl || guild.iconURL({ size: 256 }) || member.user.displayAvatarURL({ size: 256 });
  const color = (s?.color) || config.welcomeColor;

  const roleCh = (s?.roleChannelId) ?? config.welcomeRoleChannelId;
  const rulesCh = (s?.rulesChannelId) ?? config.welcomeRulesChannelId;
  const annCh = (s?.announceChannelId) ?? config.welcomeAnnounceChannelId;
  const chatCh = (s?.chatChannelId) ?? config.welcomeChatChannelId;

  const description = [
    `➔ Chào mừng ${member} đã tham gia **${server}**.`,
    `➔ Bạn là người thứ : **${count}**`,
    `➔ Nhớ chọn Role ở kênh ✅ ${ch(roleCh, '**role-sever**')} để xem các kênh trong sever nhé.`,
    `➔ Hãy nhớ vào ${ch(rulesCh, '**rule-discord**')} để hiểu rõ luật của Sever phạm sai lầm...!`,
    `➔ Luôn luôn check 🔊 ${ch(annCh, '**thông-báo**')} để không bỏ lỡ những việc quan trọng, điều đó có thể sẽ giúp bạn nha...!`,
    `➔ Có gì khó khăn hãy vào 💬 ${ch(chatCh, '**chat-chung**')} nơi giao lưu của mọi người nhé...!`,
  ].join('\n');

  return embed({
    title: author,
    description,
    thumbnail: thumb,
    color,
    footer: `${member.user.tag} • ${new Date().toLocaleString('vi-VN')}`,
  });
}

module.exports = { buildWelcome, ordinal };
