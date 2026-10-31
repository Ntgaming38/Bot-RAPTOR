// Hộp gacha: chọn quà theo trọng số (weight càng lớn càng dễ trúng).
function totalWeight(prizes) {
  return (prizes || []).reduce((a, p) => a + Math.max(0, parseInt(p.weight, 10) || 0), 0);
}
function pick(prizes, rand = Math.random()) {
  const list = (prizes || []).filter((p) => (parseInt(p.weight, 10) || 0) > 0);
  const total = totalWeight(list);
  if (!list.length || total <= 0) return null;
  let x = rand * total;
  for (const p of list) {
    x -= parseInt(p.weight, 10) || 0;
    if (x < 0) return p;
  }
  return list[list.length - 1];
}
function odds(prizes) {
  const total = totalWeight(prizes);
  return (prizes || []).map((p) => ({ ...p, pct: total > 0 ? Math.round(((parseInt(p.weight, 10) || 0) / total) * 1000) / 10 : 0 }));
}
module.exports = { pick, odds, totalWeight };
