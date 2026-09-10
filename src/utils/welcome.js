const path = require('node:path');
const config = require('../config');
const { embed } = require('./embeds');

const RAINBOW_FILE = path.join(__dirname, '..', '..', 'assets', 'rainbow.png');

// 1st, 2nd, 3rd... như trong hình (185th)
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function ch(id, fallback) {
  return id ? `<#${id}>` : fallback;
}

// Trả về { embed, files } — files kèm ảnh gạch cầu vồng nếu bật.
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

  // Cho phép soạn nội dung tùy ý (dashboard/lệnh), biến: {member} {tag} {server} {count} {role} {rules} {announce} {chat}
  let description;
  if (s?.welcomeText) {
    description = s.welcomeText
      .replaceAll('{member}', `${member}`)
      .replaceAll('{tag}', member.user.tag)
      .replaceAll('{server}', `**${server}**`)
      .replaceAll('{count}', `**${count}**`)
      .replaceAll('{role}', ch(roleCh, '**role-sever**'))
      .replaceAll('{rules}', ch(rulesCh, '**rule-discord**'))
      .replaceAll('{announce}', ch(annCh, '**thông-báo**'))
      .replaceAll('{chat}', ch(chatCh, '**chat-chung**'));
  } else {
    description = [
    `➔ Chào mừng ${member} đã tham gia **${server}**.`,
    `➔ Bạn là người thứ : **${count}**`,
    `➔ Nhớ chọn Role ở kênh ✅ ${ch(roleCh, '**role-sever**')} để xem các kênh trong sever nhé.`,
    `➔ Hãy nhớ vào ${ch(rulesCh, '**rule-discord**')} để hiểu rõ luật của Sever phạm sai lầm...!`,
    `➔ Luôn luôn check 🔊 ${ch(annCh, '**thông-báo**')} để không bỏ lỡ những việc quan trọng, điều đó có thể sẽ giúp bạn nha...!`,
    `➔ Có gì khó khăn hãy vào 💬 ${ch(chatCh, '**chat-chung**')} nơi giao lưu của mọi người nhé...!`,
  ].join('\n');
  }

  const em = embed({
    title: author,
    description: description.slice(0, 2000),
    thumbnail: thumb,
    color,
    footer: `${member.user.tag} • ${new Date().toLocaleString('vi-VN')}`,
  });

  // Gạch cầu vồng dưới embed: ưu tiên link banner riêng, không thì ảnh mặc định
  const files = [];
  const banner = s?.bannerUrl || null;
  const rainbow = s?.bannerRainbow ?? true;
  if (banner) {
    em.setImage(banner);
  } else if (rainbow !== false) {
    em.setImage('attachment://rainbow.png');
    files.push({ attachment: RAINBOW_FILE, name: 'rainbow.png' });
  }
  return { embed: em, files };
}

module.exports = { buildWelcome, ordinal };
