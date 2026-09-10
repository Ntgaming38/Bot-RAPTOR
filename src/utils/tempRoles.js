const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'data', 'temp-roles.json');

function loadAll() {
  try {
    if (!fs.existsSync(FILE)) return [];
    const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}
function saveAll(list) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list.slice(-500), null, 2));
}
function useMongo() {
  try {
    return require('../db').isMongo();
  } catch { return false; }
}

// Cấp role tạm thời (gỡ tự động khi hết hạn)
async function grantTempRole(guildId, userId, roleId, ms, byTag) {
  const rec = { guildId, userId, roleId, expiresAt: Date.now() + ms, byTag: byTag || '' };
  if (useMongo()) {
    const { TempRole } = require('../db');
    await TempRole.updateOne({ guildId, userId, roleId }, { $set: rec }, { upsert: true });
    return rec;
  }
  const all = loadAll().filter((r) => !(r.guildId === guildId && r.userId === userId && r.roleId === roleId));
  all.push({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, ...rec });
  saveAll(all);
  return rec;
}

async function revokeTempRole(guildId, userId, roleId) {
  if (useMongo()) {
    const { TempRole } = require('../db');
    await TempRole.deleteOne({ guildId, userId, roleId });
    return;
  }
  saveAll(loadAll().filter((r) => !(r.guildId === guildId && r.userId === userId && r.roleId === roleId)));
}

async function listTempRoles(guildId) {
  const now = Date.now();
  if (useMongo()) {
    const { TempRole } = require('../db');
    return await TempRole.find({ guildId, expiresAt: { $gt: now } }).lean().catch(() => []);
  }
  return loadAll().filter((r) => r.guildId === guildId && r.expiresAt > now);
}

// Quét gỡ role hết hạn (gọi mỗi 5 phút)
async function sweepTempRoles(client) {
  const now = Date.now();
  const due = useMongo()
    ? await require('../db').TempRole.find({ expiresAt: { $lte: now } }).limit(50).lean().catch(() => [])
    : loadAll().filter((r) => r.expiresAt <= now).slice(0, 50);
  for (const r of due) {
    try {
      const guild = await client.guilds.fetch(r.guildId).catch(() => null);
      const member = guild && await guild.members.fetch(r.userId).catch(() => null);
      if (member && member.roles.cache.has(r.roleId)) {
        await member.roles.remove(r.roleId, 'Hết hạn role tạm thời').catch(() => {});
      }
    } catch {}
    try {
      if (useMongo()) {
        await require('../db').TempRole.deleteOne({ guildId: r.guildId, userId: r.userId, roleId: r.roleId });
      } else {
        saveAll(loadAll().filter((x) => !(x.guildId === r.guildId && x.userId === r.userId && x.roleId === r.roleId)));
      }
    } catch {}
  }
  if (due.length) console.log(`[temprole] đã gỡ ${due.length} role hết hạn`);
}

module.exports = { grantTempRole, revokeTempRole, listTempRoles, sweepTempRoles };
