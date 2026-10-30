// Role theo link mời + thống kê người mời.
// Nguyên lý: chụp lại số lượt dùng của mọi link mời; khi có thành viên mới,
// link nào vừa tăng lượt dùng thì đó là link họ đã dùng -> biết người mời + gán role theo quy tắc.
// Cấu hình (lưu trong guildSettings): inviteCfg = { enabled, rules: [{ code, roleId }] }
const fs = require('node:fs');
const path = require('node:path');
const { writeJsonAtomic } = require('./jsonStore');

const FILE = path.join(__dirname, '..', '..', 'data', 'invite-stats.json');
const cache = new Map(); // guildId -> Map(code -> { uses, inviterId })

function useMongo() {
  try { return require('../db').isMongo(); } catch { return false; }
}
function loadAll() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch { return {}; }
}

// ---- Cache link mời ----
async function snapshot(guild) {
  try {
    const invites = await guild.invites.fetch();
    const m = new Map();
    for (const inv of invites.values()) m.set(inv.code, { uses: inv.uses || 0, inviterId: inv.inviter?.id || null });
    cache.set(guild.id, m);
    return m;
  } catch { return cache.get(guild.id) || new Map(); }
}
async function primeAll(client) {
  for (const guild of client.guilds.cache.values()) await snapshot(guild);
  console.log('🔗 Đã chụp link mời của các server (role theo link mời)');
}
function onInviteCreate(invite) {
  const m = cache.get(invite.guild.id) || new Map();
  m.set(invite.code, { uses: invite.uses || 0, inviterId: invite.inviter?.id || null });
  cache.set(invite.guild.id, m);
}
function onInviteDelete(invite) {
  cache.get(invite.guild.id)?.delete(invite.code);
}

// ---- Thống kê ----
async function bumpStat(guildId, inviterId, code) {
  if (useMongo()) {
    const { InviteStat } = require('../db');
    const doc = await InviteStat.findOne({ guildId, userId: inviterId }).lean().catch(() => null);
    const byCode = { ...(doc?.byCode || {}) };
    byCode[code] = (byCode[code] || 0) + 1;
    await InviteStat.updateOne({ guildId, userId: inviterId }, { $set: { byCode }, $inc: { total: 1 } }, { upsert: true });
    return;
  }
  const db = loadAll();
  db[guildId] = db[guildId] || {};
  const row = db[guildId][inviterId] || { total: 0, byCode: {} };
  row.total += 1;
  row.byCode[code] = (row.byCode[code] || 0) + 1;
  db[guildId][inviterId] = row;
  writeJsonAtomic(FILE, db);
}

async function getStats(guildId) {
  if (useMongo()) {
    const { InviteStat } = require('../db');
    const rows = await InviteStat.find({ guildId }).lean().catch(() => []);
    return rows.map((r) => ({ userId: r.userId, total: r.total || 0, byCode: r.byCode || {} }));
  }
  const g = loadAll()[String(guildId)] || {};
  return Object.entries(g).map(([userId, v]) => ({ userId, total: v.total || 0, byCode: v.byCode || {} }));
}

// ---- Xử lý khi có thành viên mới ----
async function onJoin(member) {
  try {
    const before = cache.get(member.guild.id) || new Map();
    const after = await snapshot(member.guild);
    let usedCode = null;
    for (const [code, info] of after) {
      const prev = before.get(code);
      if (!prev || info.uses > prev.uses) { usedCode = code; break; }
    }
    if (!usedCode) return null;
    const inviterId = after.get(usedCode)?.inviterId || null;
    if (inviterId) await bumpStat(member.guild.id, inviterId, usedCode);

    const st = await require('./guildSettings').getGuildSettings(member.guild.id).catch(() => null);
    const cfg = st?.inviteCfg || {};
    if (cfg.enabled) {
      const rule = (cfg.rules || []).find((r) => r.code === usedCode && r.roleId);
      if (rule) {
        await member.roles.add(rule.roleId).catch((e) => console.warn('[invite-role] gán role lỗi:', e?.message));
      }
    }
    return { code: usedCode, inviterId };
  } catch (e) {
    console.warn('[invite-role] lỗi:', e?.message);
    return null;
  }
}

module.exports = { snapshot, primeAll, onInviteCreate, onInviteDelete, onJoin, getStats };
