import { S } from './state.js';
import { MARKETS } from './markets.js';
import { money, pct, dayKey, todayKey, fmtDate, fmtShort, uid, clsOf } from './format.js';
/* ============================================================
   BANKROLL SERVİSİ
   available  = harcanabilir bakiye (stake düşülmüş)
   pending    = açık kuponlarda kilitli para
   equity     = available + pending  → risk % bunun üzerinden
   ============================================================ */
export function bankroll() {
  let available = 0;
  S.tx.forEach(t => {
    if (t.type === 'init' || t.type === 'deposit' || t.type === 'return' || t.type === 'refund') available += t.amount;
    else if (t.type === 'withdraw') available -= t.amount;
    else available += t.amount; // stake negatif kayıtlı
  });
  const pending = S.coupons.filter(c => couponStatus(c) === 'pending').reduce((s, c) => s + c.stake, 0);
  return {available, pending, equity: available + pending};
}

export function couponBets(id) { return S.bets.filter(b => b.couponId === id); }

export function couponStatus(c) {
  const bs = couponBets(c.id);
  if (bs.some(b => b.status === 'lost')) return 'lost';
  if (bs.some(b => b.status === 'pending')) return 'pending';
  if (bs.every(b => b.status === 'void')) return 'void';
  return 'won';
}
export function couponOdds(c) {
  return couponBets(c.id).filter(b => b.status !== 'void')
    .reduce((s, b) => s * b.odds, 1);
}
export function couponReturn(c) {
  const st = couponStatus(c);
  if (st === 'won') return c.stake * couponOdds(c);
  if (st === 'void') return c.stake;
  return 0;
}
export function couponPL(c) {
  const st = couponStatus(c);
  if (st === 'pending') return 0;
  return couponReturn(c) - c.stake;
}

/* kupon sonuçlandığında iade/kazanç hareketini yaz */
export function settleCoupon(id, silent) {
  const c = S.coupons.find(x => x.id === id);
  const st = couponStatus(c);
  S.tx = S.tx.filter(t => !(t.ref === id && (t.type === 'return' || t.type === 'refund')));
  c.settledAt = null;
  if (st === 'pending') return;
  const bs = couponBets(id);
  const at = Math.max(...bs.map(b => b.kickoff || c.createdAt)) + 2 * 3600000;
  c.settledAt = at;
  const ret = couponReturn(c);
  if (ret > 0) S.tx.push({id: uid(), type: st === 'void' ? 'refund' : 'return', amount: ret, at, ref: id});
  if (!silent) { S.tx.sort((a, b) => a.at - b.at); }
}

/* ============================================================
   İSTATİSTİK MOTORU
   ============================================================ */
export function settledCoupons(days) {
  const cut = days ? Date.now() - days * 86400000 : 0;
  return S.coupons.filter(c => couponStatus(c) !== 'pending' && c.createdAt >= cut)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function stats(days) {
  const cs = settledCoupons(days);
  const all = S.coupons.filter(c => !days || c.createdAt >= Date.now() - days * 86400000);
  const won = cs.filter(c => couponStatus(c) === 'won');
  const lost = cs.filter(c => couponStatus(c) === 'lost');
  const totalStake = cs.reduce((s, c) => s + c.stake, 0);
  const net = cs.reduce((s, c) => s + couponPL(c), 0);
  const profit = won.reduce((s, c) => s + couponPL(c), 0);
  const loss = lost.reduce((s, c) => s + Math.abs(couponPL(c)), 0);
  const oddsList = cs.map(c => couponOdds(c));
  const seq = cs.map(c => couponStatus(c));
  return {
    total: all.length, won: won.length, lost: lost.length,
    pending: all.filter(c => couponStatus(c) === 'pending').length,
    winRate: cs.length ? won.length / cs.length * 100 : 0,
    totalStake, net, profit, loss,
    roi: totalStake ? net / totalStake * 100 : 0,
    avgOdds: oddsList.length ? oddsList.reduce((a, b) => a + b, 0) / oddsList.length : 0,
    avgStake: cs.length ? totalStake / cs.length : 0,
    best: cs.length ? Math.max(...cs.map(couponPL)) : 0,
    worst: cs.length ? Math.min(...cs.map(couponPL)) : 0,
    winStreak: longest(seq, 'won'), lossStreak: longest(seq, 'lost'),
    current: currentStreak(seq)
  };
}
export function longest(seq, v) { let m = 0, c = 0; seq.forEach(s => { c = s === v ? c + 1 : 0; m = Math.max(m, c); }); return m; }
export function currentStreak(seq) {
  if (!seq.length) return {type: null, n: 0};
  const last = seq[seq.length - 1]; let n = 0;
  for (let i = seq.length - 1; i >= 0 && seq[i] === last; i--) n++;
  return {type: last, n};
}

/* gün bazlı net */
export function dailyNet(days) {
  const map = {};
  settledCoupons(days).forEach(c => {
    const k = dayKey(c.createdAt);
    map[k] = (map[k] || 0) + couponPL(c);
  });
  return map;
}

/* bakiye eğrisi (equity curve) */
export function equityCurve(days) {
  const cut = days ? Date.now() - days * 86400000 : 0;
  const tx = S.tx.slice().sort((a, b) => a.at - b.at);
  let bal = 0; const pts = [];
  tx.forEach(t => {
    bal += (t.type === 'withdraw') ? -t.amount : t.amount;
    if (t.at >= cut) pts.push({t: t.at, v: bal});
  });
  if (!pts.length) pts.push({t: Date.now(), v: bankroll().equity});
  return pts;
}
export function drawdown() {
  const pts = equityCurve(null);
  let peak = -Infinity, maxDD = 0, maxPct = 0, peakV = 0, troughV = 0;
  pts.forEach(p => {
    if (p.v > peak) peak = p.v;
    const dd = peak - p.v;
    if (dd > maxDD) { maxDD = dd; maxPct = dd / peak * 100; peakV = peak; troughV = p.v; }
  });
  return {amount: maxDD, pct: maxPct, peak: peakV, trough: troughV};
}

/* tekli seçim bazlı performans — kombine bacakları hariç.
   Sebep: kombinede stake kupon başınadır, bacağa pay edilirse ROI bozulur. */
export function perfBy(keyFn, days) {
  const cut = days ? Date.now() - days * 86400000 : 0;
  const out = {};
  S.coupons.filter(c => c.type === 'single' && c.createdAt >= cut && couponStatus(c) !== 'pending')
    .forEach(c => {
      const b = couponBets(c.id)[0]; if (!b) return;
      const k = keyFn(b, c); if (!k) return;
      out[k] = out[k] || {n: 0, w: 0, stake: 0, net: 0};
      const o = out[k];
      o.n++; o.stake += c.stake; o.net += couponPL(c);
      if (couponStatus(c) === 'won') o.w++;
    });
  return Object.entries(out).map(([k, v]) => ({
    key: k, ...v, roi: v.stake ? v.net / v.stake * 100 : 0, wr: v.n ? v.w / v.n * 100 : 0
  })).sort((a, b) => b.n - a.n);
}
export function oddsBucket(o) {
  if (o < 1.2) return '1.00 – 1.20';
  if (o < 1.35) return '1.20 – 1.35';
  if (o < 1.5) return '1.35 – 1.50';
  if (o < 1.65) return '1.50 – 1.65';
  if (o < 2) return '1.65 – 2.00';
  return '2.00 +';
}
export function singleVsParlay(days) {
  const cut = days ? Date.now() - days * 86400000 : 0;
  const r = {single: {n: 0, stake: 0, net: 0, w: 0}, parlay: {n: 0, stake: 0, net: 0, w: 0}};
  S.coupons.filter(c => couponStatus(c) !== 'pending' && c.createdAt >= cut).forEach(c => {
    const o = r[c.type]; o.n++; o.stake += c.stake; o.net += couponPL(c);
    if (couponStatus(c) === 'won') o.w++;
  });
  Object.values(r).forEach(o => { o.roi = o.stake ? o.net / o.stake * 100 : 0; o.wr = o.n ? o.w / o.n * 100 : 0; });
  return r;
}
/* ============================================================
   RİSK MOTORU — tamamen kural tabanlı, AI yok
   ============================================================ */
/* Sabit oranla oynarken n kayıp sonrası kasada kalan oran */
export const afterLosses = (pctPerBet, n) => Math.pow(1 - pctPerBet / 100, n) * 100;
export const afterWins = (pctPerBet, n, odds) => Math.pow(1 + (pctPerBet / 100) * ((odds || 2) - 1), n) * 100;
/* Kullanıcının gerçek ortalama oranı; veri yoksa 1.60 varsayılır. */
export function avgOddsUsed() {
  const o = S && S.bets ? S.bets.filter(b => b.status !== 'pending').map(b => b.odds) : [];
  if (o.length < 10) return 1.6;
  return +(o.reduce((a, b) => a + b, 0) / o.length).toFixed(2);
}

/* Aynı oranla üst üste kazanç ve kayıp serilerinin kasaya etkisi.
   Adil oran (2.00) varsayılır: kazanan bahis yatırılan kadar kâr getirir. */
export function streakTable(r, odds) {
  const o = odds || avgOddsUsed();
  const row = n => `<tr><td>${n} bahis</td>
    <td class="pos">${pct(afterWins(r, n, o) - 100, 1)}</td>
    <td class="neg">${pct(afterLosses(r, n) - 100, 1)}</td></tr>`;
  return `<table class="streak">
    <thead><tr><th>Üst üste</th><th>Kazanırsa</th><th>Kaybederse</th></tr></thead>
    <tbody>${row(3)}${row(5)}${row(10)}</tbody></table>
    <p class="note">${o.toFixed(2).replace('.', ',')} ortalama oran üzerinden. Düşük oranda kazanç küçük kalır, kayıp ise her zaman koyduğun tutarın tamamıdır — bu yüzden iki taraf eşit değildir.</p>`;
}
export function streakLine(rp) {
  const o = avgOddsUsed();
  return `Bu büyüklükte devam edersen ${o.toFixed(2).replace('.', ',')} ortalama oranla 5 kazançlık seri kasanı ${pct(afterWins(rp, 5, o) - 100)} büyütür, 5 kayıplık seri ${pct(100 - afterLosses(rp, 5))} küçültür.`;
}
/* Monte Carlo: sabit oranla n bahis sonunda kasanın nerede olduğu.
   Adil oran (2.00 / %50 isabet) varsayılır — yani avantaj da dezavantaj da yok.
   Fark tamamen oran büyüklüğünden gelir. */
export function simulateBankroll(riskR, bets, odds) {
  bets = bets || 100;
  const o = odds || avgOddsUsed();
  const p = 1 / o;                       // adil isabet oranı
  const up = 1 + (riskR / 100) * (o - 1);
  const down = 1 - riskR / 100;
  let sd = 987654321;
  const rr = () => { sd = (sd * 1664525 + 1013904223) % 4294967296; return sd / 4294967296; };
  const ends = []; let ruin = 0;
  for (let k = 0; k < 400; k++) {
    let v = 1;
    for (let i = 0; i < bets; i++) v = rr() < p ? v * up : v * down;
    if (v < .25) ruin++;
    ends.push(v);
  }
  ends.sort((a, b) => a - b);
  const q = f => ends[Math.floor(ends.length * f)];
  return {p10: q(.1), p50: q(.5), p90: q(.9), ruin: ruin / 400 * 100, bets, odds: o};
}

export function simBox(riskR, odds) {
  const s = simulateBankroll(riskR, 100, odds);
  const row = (l, v) => `<div><span>${l}</span><b class="${v < .9 ? 'neg' : v > 1.1 ? 'pos' : ''}">${v < 10 ? v.toFixed(2) + '×' : '—'}</b></div>`;
  return `<div class="obmath">
    ${row('Kötü giden 10%', s.p10)}${row('Ortanca sonuç', s.p50)}${row('İyi giden 10%', s.p90)}
    <div><span>Kasanın dörtte birine düşme ihtimali</span><b class="${s.ruin > 25 ? 'neg' : s.ruin > 8 ? 'warn' : ''}">%${s.ruin.toFixed(0)}</b></div>
  </div>
  <p class="note">Kasanın %${String(riskR).replace('.', ',')}'i ile 100 bahis, ${s.odds.toFixed(2).replace('.', ',')} oran ve buna denk gelen %${(100 / s.odds).toFixed(0)} isabetle 400 kez simüle edildi. Avantajın olmadığı varsayıldı; fark yalnızca bahis büyüklüğünden ve orandan geliyor.</p>`;
}

export function riskPct(stake) { const b = bankroll(); return b.equity ? stake / b.equity * 100 : 0; }

export function riskEngine() {
  const out = [];
  const cs = settledCoupons(null);
  const last = cs.slice(-10);
  const st = stats(30);

  // 1) kayıp serisi
  const cur = currentStreak(cs.map(couponStatus));
  if (cur.type === 'lost' && cur.n >= 3)
    out.push({lvl: 'warn', t: `${cur.n} bahislik kayıp serisi`,
      d: `Son ${cur.n} kuponun sonuçsuz kapandı. Bu bir örüntü olabilir ya da normal dalgalanma — karar vermeden önce verine bak.`});

  // 2) kayıp kovalama: kayıptan sonraki stake, ortalamanın 1.5 katı
  const chase = detectChasing();
  if (chase)
    out.push({lvl: 'warn', t: 'Kayıp sonrası bahis tutarı artışı',
      d: `Kayıptan sonraki bahislerinde ortalama tutar ${money(chase.base)} yerine ${money(chase.after)} — ${pct(chase.rise, 1)} fark. Miktarı büyütmek geçmiş kaybı geri getirmez.`});

  // 3) günlük aktivite
  const today = S.coupons.filter(c => dayKey(c.createdAt) === todayKey());
  const todayStake = today.reduce((s, c) => s + c.stake, 0);
  const avgDaily = avgDailyStake(30);
  if (avgDaily > 0 && todayStake > avgDaily * 2)
    out.push({lvl: 'warn', t: 'Bugünkü hacim olağandışı',
      d: `Bugün ${money(todayStake)} yatırdın. Son 30 günlük ortalaman ${money(avgDaily)}.`});

  // 4) mola önerisi — iki koşul birden
  if (last.length >= 10) {
    const l = last.filter(c => couponStatus(c) === 'lost').length;
    if (l >= 7 && chase)
      out.push({lvl: 'stop', t: 'Ara vermeyi düşün',
        d: `Son 10 kuponunun ${l} tanesi kayıpla kapandı ve bahis miktarın da artıyor. Bir süre ara verip sonuçlarını gözden geçirmek iyi bir fikir olabilir.`});
  }
  return out;
}

export function avgDailyStake(days) {
  const cut = Date.now() - days * 86400000;
  const map = {};
  S.coupons.filter(c => c.createdAt >= cut).forEach(c => {
    const k = dayKey(c.createdAt); map[k] = (map[k] || 0) + c.stake;
  });
  const vals = Object.values(map);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

export function detectChasing() {
  /* Kural: bir kaybın hemen ardından gelen kuponların ortalama stake'i,
     kayıp olmayan sonuçların ardından gelenlerin ortalamasından belirgin
     şekilde yüksekse "kayıp kovalama" örüntüsü işaretlenir. */
  const cs = settledCoupons(null).slice(-15);
  if (cs.length < 8) return null;
  const after = [], base = [];
  let losses = 0;
  for (let i = 1; i < cs.length; i++) {
    if (couponStatus(cs[i - 1]) === 'lost') { after.push(cs[i].stake); losses++; }
    else base.push(cs[i].stake);
  }
  if (losses < 3 || after.length < 3 || base.length < 3) return null;
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const aAvg = avg(after), bAvg = avg(base);
  if (bAvg <= 0 || aAvg <= bAvg * 1.25) return null;
  return {losses, rise: (aAvg / bAvg - 1) * 100, after: aAvg, base: bAvg};
}

/* ---------- içgörüler: istatistiksel, öneri değil ---------- */
export function insights() {
  const out = [];
  const ob = perfBy(b => oddsBucket(b.odds), 90).filter(x => x.n >= 12);
  if (ob.length > 1) {
    const best = ob.slice().sort((a, b) => b.roi - a.roi)[0];
    out.push(`Son 90 günde en yüksek getirin ${best.key} oran aralığında: ${pct(best.roi, 1)} (${best.n} bahis).`);
  }
  const lg = perfBy(b => b.league, 90).filter(x => x.n >= 15);
  if (lg.length > 1) {
    const s = lg.slice().sort((a, b) => b.roi - a.roi);
    out.push(`${s[0].key} bahislerinde getirin ${pct(s[0].roi, 1)}, ${s[s.length - 1].key} bahislerinde ${pct(s[s.length - 1].roi, 1)}.`);
  }
  const sp = singleVsParlay(90);
  if (sp.single.n >= 10 && sp.parlay.n >= 5)
    out.push(`Tekli kuponlarında getirin ${pct(sp.single.roi, 1)}, kombinelerinde ${pct(sp.parlay.roi, 1)}.`);
  const cs = settledCoupons(null);
  if (cs.length >= 20) {
    const a = cs.slice(-10).reduce((s, c) => s + c.stake, 0) / 10;
    const b = cs.slice(-30, -10).reduce((s, c) => s + c.stake, 0) / Math.max(1, cs.slice(-30, -10).length);
    if (b > 0 && Math.abs(a / b - 1) > .12)
      out.push(`Son 10 bahsinde ortalama tutar ${pct((a / b - 1) * 100, 1)} değişti (${money(b)} → ${money(a)}).`);
  }
  return out;
}

