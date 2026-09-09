// Tự động rời voice khi không còn ai (kèm thời gian chờ để người ta quay lại).
// Discord rate-limit rename... không liên quan — đây chỉ là timer rời kênh.

const ALONE_TIMEOUT_MS = 60_000;
const timers = new Map(); // guildId -> timeout

function aloneTimerKey(guildId) {
  return `alone:${guildId}`;
}

function cancelAloneTimer(guildId) {
  const t = timers.get(aloneTimerKey(guildId));
  if (t) {
    clearTimeout(t);
    timers.delete(aloneTimerKey(guildId));
  }
}

// Gọi mỗi khi voiceStateUpdate: còn người thật thì hủy hẹn, hết người thì hẹn rời.
function watchAlone(client, guild) {
  const gid = guild.id;
  const me = guild.members.me?.voice?.channel;
  if (!me) {
    cancelAloneTimer(gid);
    return;
  }
  const humansLeft = me.members.filter((m) => !m.user.bot).size;
  if (humansLeft > 0) {
    cancelAloneTimer(gid);
    return;
  }
  if (timers.has(aloneTimerKey(gid))) return; // đã hẹn rồi
  console.log(`[voice] không còn ai ở ${me.name}, rời sau 60s nếu không ai vào...`);
  timers.set(
    aloneTimerKey(gid),
    setTimeout(() => {
      timers.delete(aloneTimerKey(gid));
      try {
        const queue = client?.player?.nodes?.get(gid);
        const stillAlone = (() => {
          const g = client?.guilds?.cache?.get(gid);
          const vc = g?.members?.me?.voice?.channel;
          return vc && vc.members.filter((m) => !m.user.bot).size === 0;
        })();
        if (!stillAlone) return;
        const textCh = queue?.metadata?.channel;
        if (queue?.delete) queue.delete();
        textCh?.send?.('👋 Không còn ai trong voice nên bot out nhé!')?.catch?.(() => {});
      } catch {}
    }, ALONE_TIMEOUT_MS)
  );
  if (timers.get(aloneTimerKey(gid))?.unref) timers.get(aloneTimerKey(gid)).unref();
}

module.exports = { watchAlone, cancelAloneTimer, ALONE_TIMEOUT_MS };
