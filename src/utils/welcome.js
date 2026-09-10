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

// Trả về { embed, files, components } — files kèm card/banner, components gồm nút link + nút đồng ý luật.
async function buildWelcome(member, s) {
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

  // Biến builder: {user} {username} {mention} {tag} {server} {membercount} {count} {created} + kênh
  const created = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`;
  const vars = {
    member: `${member}`, mention: `${member}`, user: `${member}`,
    username: member.user.username, tag: member.user.tag,
    server: `**${server}**`, count: `**${count}**`, membercount: `**${guild.memberCount}**`,
    created,
    role: ch(roleCh, '**role-sever**'), rules: ch(rulesCh, '**rule-discord**'),
    announce: ch(annCh, '**thông-báo**'), chat: ch(chatCh, '**chat-chung**'),
  };
  const fill = (t) => {
    let out = String(t || '');
    for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, v);
    return out;
  };

  // Cho phép soạn nội dung tùy ý (dashboard/lệnh)
  let description;
  if (s?.welcomeText) {
    description = fill(s.welcomeText);
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

  // Ảnh dưới embed: link banner riêng > card tự vẽ (avatar + cầu vồng) > gạch cầu vồng
  const files = [];
  const banner = s?.bannerUrl || null;
  const rainbow = s?.bannerRainbow ?? true;
  const cardOn = s?.cardEnabled ?? true;
  if (banner) {
    em.setImage(banner);
  } else if (cardOn !== false) {
    try {
      const { drawWelcomeCard } = require('./welcomeCard');
      const buf = await drawWelcomeCard({ avatarUrl: member.user.displayAvatarURL({ extension: 'png', size: 128 }) });
      em.setImage('attachment://welcome-card.png');
      files.push({ attachment: buf, name: 'welcome-card.png' });
    } catch {
      if (rainbow !== false) {
        em.setImage('attachment://rainbow.png');
        files.push({ attachment: RAINBOW_FILE, name: 'rainbow.png' });
      }
    }
  } else if (rainbow !== false) {
    em.setImage('attachment://rainbow.png');
    files.push({ attachment: RAINBOW_FILE, name: 'rainbow.png' });
  }

  // Nút: đồng ý luật (cấp role) + tối đa 4 nút link
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
  const row = new ActionRowBuilder();
  if (s?.acceptRoleId) {
    row.addComponents(
      new ButtonBuilder().setCustomId('welcome-accept').setLabel('✅ Tôi đồng ý luật').setStyle(ButtonStyle.Success),
    );
  }
  const links = Array.isArray(s?.welcomeButtons) ? s.welcomeButtons.filter((b) => b?.label && /^https?:\/\//i.test(b.url || '')).slice(0, 4) : [];
  for (const b of links) {
    row.addComponents(
      new ButtonBuilder().setLabel(String(b.label).slice(0, 80)).setStyle(ButtonStyle.Link).setURL(b.url),
    );
  }
  return { embed: em, files, components: row.components.length ? [row] : [] };
}

module.exports = { buildWelcome, ordinal };
