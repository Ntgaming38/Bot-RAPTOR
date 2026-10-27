// Thẻ rank dạng ảnh PNG kiểu ProBot, vẽ bằng @napi-rs/canvas (binary prebuilt, không cần biên dịch).
// Nếu thư viện không nạp được (thiếu font/binary trên máy chạy) → trả null, lệnh /rank tự quay về embed chữ.
let canvasLib = null;
try {
  canvasLib = require('@napi-rs/canvas');
} catch {
  canvasLib = null;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// user: discord User, rankInfo: { level, xp, needed, rank, total }
async function buildRankCard(user, rankInfo) {
  if (!canvasLib) return null;
  try {
    const { createCanvas, loadImage } = canvasLib;
    const W = 900;
    const H = 280;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // Nền gradient navy
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0c1322');
    bg.addColorStop(1, '#1b2a4a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Dải vàng dưới đáy (điểm nhấn kiểu TCG)
    ctx.fillStyle = '#e9c33c';
    ctx.fillRect(0, H - 8, W, 8);

    // Avatar tròn
    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarUrl);
    const AV = 176;
    const ax = 52;
    const ay = (H - AV) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ax + AV / 2, ay + AV / 2, AV / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, ax, ay, AV, AV);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(ax + AV / 2, ay + AV / 2, AV / 2, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#e9c33c';
    ctx.stroke();

    const tx = ax + AV + 44;
    // Tên + hạng
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    const name = String(user.username || '').slice(0, 24);
    ctx.fillText(name, tx, 96);
    const nameW = ctx.measureText(name).width;
    if (rankInfo.rank) {
      ctx.font = '600 30px sans-serif';
      ctx.fillStyle = '#e9c33c';
      ctx.fillText(`#${rankInfo.rank}`, tx + nameW + 18, 96);
    }

    // Level / XP
    ctx.font = '600 30px sans-serif';
    ctx.fillStyle = '#aeb8ca';
    ctx.fillText(`LEVEL ${rankInfo.level}`, tx, 148);
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#ffffff';
    const xpText = `${rankInfo.xp} / ${rankInfo.needed} XP`;
    const xpW = ctx.measureText(xpText).width;
    ctx.fillText(xpText, W - 52 - xpW, 148);

    // Thanh tiến trình
    const barX = tx;
    const barY = 178;
    const barW = W - 52 - barX;
    const barH = 34;
    ctx.fillStyle = '#0a0f1c';
    roundRect(ctx, barX, barY, barW, barH, barH / 2);
    ctx.fill();
    const pct = rankInfo.needed > 0 ? Math.min(1, rankInfo.xp / rankInfo.needed) : 0;
    if (pct > 0) {
      const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      grad.addColorStop(0, '#e9c33c');
      grad.addColorStop(1, '#f0662a');
      ctx.fillStyle = grad;
      roundRect(ctx, barX, barY, Math.max(barH, barW * pct), barH, barH / 2);
      ctx.fill();
    }
    ctx.font = '600 22px sans-serif';
    ctx.fillStyle = '#7e8aa0';
    ctx.fillText(`Còn ${Math.max(0, rankInfo.needed - rankInfo.xp)} XP nữa lên level ${rankInfo.level + 1}`, tx, 248);

    return canvas.toBuffer('image/png');
  } catch {
    return null;
  }
}

module.exports = { buildRankCard, available: !!canvasLib };
