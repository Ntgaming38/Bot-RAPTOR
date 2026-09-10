// Vẽ welcome card PNG thuần Node (không cần canvas/Cairo/node-gyp).
// Card 800x240: nền gradient tối + avatar tròn + dải cầu vồng dưới cùng.
const zlib = require('node:zlib');

const W = 800;
const H = 240;
const AV = 150; // avatar vuông trước khi cắt tròn

function crc32(buf) {
  let table = crc32.t;
  if (!table) {
    table = crc32.t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodeRGB(w, h, px) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 3;
      raw.set([px[o], px[o + 1], px[o + 2]], y * (w * 3 + 1) + 1 + x * 3);
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', (() => {
      const b = Buffer.alloc(13);
      b.writeUInt32BE(w, 0);
      b.writeUInt32BE(h, 4);
      b[8] = 8; b[9] = 2;
      return b;
    })()),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function hsl(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
}

// Giải mã PNG đơn giản (avatar Discord: 8-bit RGB/RGBA, không interlace)
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not-png');
  let pos = 8;
  let w, h, bitDepth, colorType, interlace;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6) || interlace !== 0) throw new Error('unsupported');
  const ch = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const px = Buffer.alloc(w * h * 3);
  let p = 0;
  const a = Buffer.alloc(stride);
  const b = Buffer.alloc(stride);
  const paeth = (x, y, z) => {
    const q = x + y - z;
    const qx = Math.abs(q - x), qy = Math.abs(q - y), qz = Math.abs(q - z);
    return qx <= qy && qx <= qz ? x : qy <= qz ? y : z;
  };
  for (let y = 0; y < h; y++) {
    const f = raw[p++];
    b.set(a);
    for (let i = 0; i < stride; i++) {
      const left = i >= ch ? a[i - ch] : 0;
      const up = b[i];
      const upLeft = i >= ch ? b[i - ch] : 0;
      let v = raw[p++];
      if (f === 1) v = (v + left) & 0xff;
      else if (f === 2) v = (v + up) & 0xff;
      else if (f === 3) v = (v + ((left + up) >> 1)) & 0xff;
      else if (f === 4) v = (v + paeth(left, up, upLeft)) & 0xff;
      a[i] = v;
    }
    // Nền tối thay chỗ trong suốt
    for (let x = 0; x < w; x++) {
      const alpha = ch === 4 ? a[x * ch + 3] / 255 : 1;
      const o = (y * w + x) * 3;
      px[o] = Math.round(a[x * ch] * alpha + 24 * (1 - alpha));
      px[o + 1] = Math.round(a[x * ch + 1] * alpha + 26 * (1 - alpha));
      px[o + 2] = Math.round(a[x * ch + 2] * alpha + 40 * (1 - alpha));
    }
  }
  return { w, h, px };
}

async function fetchAvatar(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 2_000_000) return null;
    return decodePNG(buf);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Vẽ card, trả về Buffer PNG (luôn thành công — ít nhất nền + cầu vồng)
async function drawWelcomeCard({ avatarUrl } = {}) {
  const px = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    const f = y / H;
    const r = Math.round(26 + f * 30);
    const g = Math.round(28 + f * 26);
    const b = Math.round(46 + f * 30);
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 3;
      px[o] = r; px[o + 1] = g; px[o + 2] = b;
    }
  }
  // Dải cầu vồng dưới cùng
  for (let y = H - 12; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b] = hsl((x / W) * 360, 1, 0.55);
      const o = (y * W + x) * 3;
      px[o] = r; px[o + 1] = g; px[o + 2] = b;
    }
  }
  // Avatar tròn bên trái
  try {
    if (avatarUrl) {
      const av = await fetchAvatar(avatarUrl);
      if (av) {
        const cx = 30 + AV / 2, cy = (H - 12) / 2, rad = AV / 2;
        for (let y = 0; y < AV; y++) {
          for (let x = 0; x < AV; x++) {
            const dx = x - AV / 2, dy = y - AV / 2;
            if (dx * dx + dy * dy > rad * rad) continue;
            const sx = Math.min(av.w - 1, Math.floor((x / AV) * av.w));
            const sy = Math.min(av.h - 1, Math.floor((y / AV) * av.h));
            const so = (sy * av.w + sx) * 3;
            const dx2 = cx - AV / 2 + x, dy2 = Math.round(cy - AV / 2) + y;
            if (dx2 < 0 || dx2 >= W || dy2 < 0 || dy2 >= H - 12) continue;
            const o = (dy2 * W + dx2) * 3;
            px[o] = av.px[so]; px[o + 1] = av.px[so + 1]; px[o + 2] = av.px[so + 2];
          }
        }
        // Viền trắng quanh avatar
        for (let a = 0; a < 360; a += 1) {
          const rad2 = a * Math.PI / 180;
          for (let wdt = 0; wdt < 4; wdt++) {
            const dx2 = Math.round(cx + Math.cos(rad2) * (rad + wdt));
            const dy2 = Math.round(cy + Math.sin(rad2) * (rad + wdt));
            if (dx2 < 0 || dx2 >= W || dy2 < 0 || dy2 >= H - 12) continue;
            const o = (dy2 * W + dx2) * 3;
            px[o] = 255; px[o + 1] = 255; px[o + 2] = 255;
          }
        }
      }
    }
  } catch {}
  return encodeRGB(W, H, px);
}

module.exports = { drawWelcomeCard };
