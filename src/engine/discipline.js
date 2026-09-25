import { S } from './state.js';
import { MARKETS, LEAGUES } from './markets.js';
import { money, pct, dayKey, todayKey, uid } from './format.js';
import { bankroll, couponBets, couponStatus, couponOdds, couponPL, couponReturn,
  settledCoupons, settleCoupon, stats, equityCurve, drawdown, riskPct, detectChasing,
  avgDailyStake, currentStreak, longest, perfBy, oddsBucket, dailyNet, singleVsParlay,
  insights, riskEngine } from './bankroll.js';
import { discipline } from './score.js';
import { afterLosses, afterWins, avgOddsUsed, simulateBankroll } from './bankroll.js';
import { notify } from './notify.js';
/* ============================================================
   DİSİPLİN MOTORU
   Tümü kullanıcının gerçek verisinden hesaplanır.
   Veri yetersizse sonuç üretilmez — uydurma istatistik yok.
   ============================================================ */

/* ---------- veri yeterliliği eşikleri ---------- */
export const TIERS = [
  {min: 100, key: 'strong', label: 'Güçlü kişisel analiz'},
  {min: 50, key: 'solid', label: 'Anlamlı karşılaştırma yapılabilir'},
  {min: 20, key: 'early', label: 'İlk eğilimler oluşmaya başladı'},
  {min: 5, key: 'thin', label: 'Veri az, sonuçlar oynak'},
  {min: 0, key: 'none', label: 'Yeterli veri yok'}
];
export const dataTier = n => TIERS.find(t => n >= t.min);
export const MIN_N = {dimension: 20, insight: 25, whatif: 20, journal: 15};

/* ---------- sınırlar ---------- */
export function limits() {
  const d = {maxBetPct: S.user.riskLimit, maxDailyPct: 25, maxOpenPct: 30,
             maxDailyBets: 8, afterLossPct: Math.max(1, S.user.riskLimit / 2)};
  return Object.assign(d, S.user.limits || {});
}
export function setLimit(k, v) { S.user.limits = Object.assign({}, limits(), {[k]: v}); }

/* ---------- kasa zirvesi ve düşüş ---------- */
export function peakInfo() {
  const pts = equityCurve(null);
  let peak = -Infinity, peakAt = 0;
  pts.forEach(p => { if (p.v > peak) { peak = p.v; peakAt = p.t; } });
  const now = bankroll().equity;
  const pct = peak > 0 ? (peak - now) / peak * 100 : 0;
  return {peak, peakAt, now, drop: peak - now, pct: Math.max(0, pct)};
}
export function checkDrawdownAlert() {
  const p = peakInfo(), th = S.user.ddAlert || 20;
  if (p.pct >= th && S.user._ddNotified !== Math.round(p.peak)) {
    S.user._ddNotified = Math.round(p.peak);
    notify('manual', 'Kasan zirvesinin altında',
      `Kasan son zirvesinden ${pct(p.pct)} aşağıda (${money(p.peak)} → ${money(p.now)}). Risk seviyeni gözden geçirmen önerilir.`);
  }
  if (p.pct < th / 2) S.user._ddNotified = null;
}

/* ---------- bahis öncesi kontrol ---------- */
export const REASONS = [
  {k: 'stat', l: 'İstatistiğe dayanıyor'},
  {k: 'value', l: 'Değer gördüğümü düşünüyorum'},
  {k: 'fun', l: 'Eğlence'},
  {k: 'chase', l: 'Kaybı telafi etmek'},
  {k: 'unsure', l: 'Emin değilim'},
  {k: 'other', l: 'Diğer'}
];
export const REASON_L = k => (REASONS.find(r => r.k === k) || {l: '—'}).l;

export function windowStats(n) {
  const cs = settledCoupons(null).slice(-n);
  const w = cs.filter(c => couponStatus(c) === 'won').length;
  const l = cs.filter(c => couponStatus(c) === 'lost').length;
  return {n: cs.length, w, l, net: cs.reduce((s, c) => s + couponPL(c), 0)};
}

export function preCheck(stake) {
  const b = bankroll(), L = limits();
  const today = S.coupons.filter(c => dayKey(c.createdAt) === todayKey());
  const todayStake = today.reduce((s, c) => s + c.stake, 0);
  const cs = settledCoupons(null);
  const lastTwo = cs.slice(-2).map(couponStatus);
  const onLossRun = lastTwo.length === 2 && lastTwo.every(x => x === 'lost');
  const velocity = S.coupons.filter(c => c.createdAt > Date.now() - 45 * 60000).length;
  const avgDaily = avgDailyStake(30);
  const chase = detectChasing();
  return {
    stake,
    pctEquity: b.equity ? stake / b.equity * 100 : 0,
    pctAvailable: b.available ? stake / b.available * 100 : 0,
    limit: L.maxBetPct,
    overBet: b.equity ? stake / b.equity * 100 > L.maxBetPct : false,
    todayCount: today.length, todayStake,
    todayPct: b.equity ? (todayStake + stake) / b.equity * 100 : 0,
    overDaily: b.equity ? (todayStake + stake) / b.equity * 100 > L.maxDailyPct : false,
    overCount: today.length + 1 > L.maxDailyBets,
    openLocked: b.pending,
    openPct: b.equity ? (b.pending + stake) / b.equity * 100 : 0,
    overOpen: b.equity ? (b.pending + stake) / b.equity * 100 > L.maxOpenPct : false,
    onLossRun,
    overAfterLoss: onLossRun && b.equity && stake / b.equity * 100 > L.afterLossPct,
    afterLossLimit: L.afterLossPct,
    last5: windowStats(5), last10: windowStats(10),
    chase, velocity, avgDaily,
    dailyRatio: avgDaily ? (todayStake + stake) / avgDaily : 0,
    limits: L
  };
}
export const preCheckFlags = p => [p.overBet, p.overDaily, p.overCount, p.overOpen, p.overAfterLoss].filter(Boolean).length;

/* ---------- tilt / kayıp kovalama motoru ---------- */
export function tiltEngine() {
  const out = [];
  const cs = settledCoupons(null);
  if (!S.coupons.length) return out;
  const b = bankroll(), L = limits();

  const chase = detectChasing();
  if (chase) out.push({lvl: 'warn', t: 'Kayıp sonrası tutar artışı',
    d: `Kayıptan sonraki bahislerinde ortalama tutar ${money(chase.base)} yerine ${money(chase.after)} — ${pct(chase.rise, 1)} fark.`});

  const cur = currentStreak(cs.map(couponStatus));
  if (cur.type === 'lost' && cur.n >= 3) out.push({lvl: 'warn', t: `${cur.n} bahislik kayıp serisi`,
    d: `Son ${cur.n} kuponun sonuçsuz kapandı. Bu bir örüntü olabilir ya da normal dalgalanma.`});

  const recent = S.coupons.filter(c => c.createdAt > Date.now() - 45 * 60000);
  if (recent.length >= 4) out.push({lvl: 'warn', t: 'Kısa sürede yoğun bahis',
    d: `Son 45 dakikada ${recent.length} bahis eklendi. Normal ritminin üzerinde.`});

  const today = S.coupons.filter(c => dayKey(c.createdAt) === todayKey());
  const todayStake = today.reduce((s, c) => s + c.stake, 0);
  const avgDaily = avgDailyStake(30);
  if (avgDaily > 0 && todayStake > avgDaily * 2) out.push({lvl: 'warn', t: 'Bugünkü hacim olağandışı',
    d: `Bugünkü yatırımın ${money(todayStake)}, son 30 günlük ortalamanın ${pct((todayStake / avgDaily - 1) * 100)} üzerinde.`});

  const last20 = S.coupons.slice(-20);
  const breaches = last20.filter(c => riskPct(c.stake) > L.maxBetPct).length;
  if (breaches >= 4) out.push({lvl: 'warn', t: 'Sınır tekrar tekrar aşılıyor',
    d: `Son ${last20.length} kuponun ${breaches} tanesi kendi belirlediğin %${String(L.maxBetPct).replace('.', ',')} sınırını aştı.`});

  const lossRun = cs.slice(-6).filter(c => couponStatus(c) === 'lost').length;
  const recentCount = S.coupons.filter(c => c.createdAt > Date.now() - 3 * 3600000).length;
  if (lossRun >= 4 && recentCount >= 3) out.push({lvl: 'stop', t: 'Kayıp sonrası yoğunlaşma',
    d: `Son 6 kuponun ${lossRun} tanesi kayıp ve son 3 saatte ${recentCount} yeni bahis eklendi. Ara vermeyi düşünebilirsin.`});

  return out;
}

/* ---------- mola ---------- */
export function coolActive() { return S.cooldown && S.cooldown.until > Date.now(); }
export function coolLeft() { return Math.max(0, Math.ceil((S.cooldown.until - Date.now()) / 60000)); }
export function startCooldown(min) {
  S.cooldown = {until: Date.now() + min * 60000, started: Date.now(), minutes: min};
  notify('manual', 'Mola başladı', `${min} dakika boyunca yeni bahis eklenmeyecek.`);
}

/* ---------- performans profili: sekiz boyut ---------- */
export const HOUR_BANDS = [[0, 6, 'Gece 00–06'], [6, 12, 'Sabah 06–12'], [12, 18, 'Öğleden sonra 12–18'], [18, 24, 'Akşam 18–24']];
export const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
export const hourBand = t => (HOUR_BANDS.find(([a, b]) => new Date(t).getHours() >= a && new Date(t).getHours() < b) || [0, 0, '—'])[2];
export function stakeBand(c) {
  const u = c.stake / S.user.unitValue;
  if (u < .5) return '0,5 birim altı';
  if (u < 1) return '0,5 – 1 birim';
  if (u < 2) return '1 – 2 birim';
  if (u < 3) return '2 – 3 birim';
  return '3 birim üzeri';
}
export function riskBand(c) {
  const r = riskPct(c.stake);
  if (r < 2) return '%2 altı';
  if (r < 5) return '%2 – %5';
  if (r < 10) return '%5 – %10';
  if (r < 20) return '%10 – %20';
  return '%20 üzeri';
}
/* kupon seviyesinde boyut analizi (tüm kuponlar) */
export function perfByCoupon(keyFn, days) {
  const cut = days ? Date.now() - days * 86400000 : 0;
  const out = {};
  S.coupons.filter(c => c.createdAt >= cut && couponStatus(c) !== 'pending').forEach(c => {
    const k = keyFn(c); if (!k) return;
    const o = out[k] = out[k] || {n: 0, w: 0, stake: 0, net: 0};
    o.n++; o.stake += c.stake; o.net += couponPL(c);
    if (couponStatus(c) === 'won') o.w++;
  });
  return Object.entries(out).map(([k, v]) => ({key: k, ...v,
    roi: v.stake ? v.net / v.stake * 100 : 0, wr: v.n ? v.w / v.n * 100 : 0,
    units: v.net / S.user.unitValue})).sort((a, b) => b.n - a.n);
}
export const DIMENSIONS = [
  {k: 'odds', l: 'Oran aralığı', leg: 1, fn: b => oddsBucket(b.odds)},
  {k: 'market', l: 'Bahis türü', leg: 1, fn: b => b.market},
  {k: 'league', l: 'Lig', leg: 1, fn: b => b.league},
  {k: 'type', l: 'Tekli / kombine', fn: c => c.type === 'single' ? 'Tekli' : 'Kombine'},
  {k: 'hour', l: 'Günün saati', fn: c => hourBand(c.createdAt)},
  {k: 'day', l: 'Haftanın günü', fn: c => WEEKDAYS[new Date(c.createdAt).getDay()]},
  {k: 'stake', l: 'Bahis tutarı', fn: stakeBand},
  {k: 'risk', l: 'Risk yüzdesi', fn: riskBand}
];
export function dimension(key, days) {
  const d = DIMENSIONS.find(x => x.k === key);
  const rows = d.leg ? perfBy(d.fn, days) : perfByCoupon(d.fn, days);
  return {def: d, rows, enough: rows.filter(r => r.n >= MIN_N.dimension)};
}
export function bestDimension(key) {
  const {enough} = dimension(key, null);
  if (enough.length < 2) return null;
  const s = enough.slice().sort((a, b) => b.roi - a.roi);
  return {best: s[0], worst: s[s.length - 1]};
}

/* ---------- bahis günlüğü ---------- */
export const JOURNAL_Q = [
  {k: 'why', q: 'Bu bahsi neden yaptım?'},
  {k: 'expect', q: 'Ne olmasını bekliyordum?'},
  {k: 'result', q: 'Sonuç neden böyle geldi?'},
  {k: 'mistake', q: 'Bahiste bir hata yaptım mı?'},
  {k: 'again', q: 'Aynı durum tekrar olsa yine oynar mıydım?', opts: ['Evet', 'Hayır', 'Emin değilim']}
];
export function journalStats() {
  const withReason = S.coupons.filter(c => c.reason && couponStatus(c) !== 'pending');
  const byReason = {};
  withReason.forEach(c => {
    const o = byReason[c.reason] = byReason[c.reason] || {n: 0, stake: 0, net: 0, w: 0};
    o.n++; o.stake += c.stake; o.net += couponPL(c);
    if (couponStatus(c) === 'won') o.w++;
  });
  const rows = Object.entries(byReason).map(([k, v]) => ({key: REASON_L(k), raw: k, ...v,
    roi: v.stake ? v.net / v.stake * 100 : 0, wr: v.n ? v.w / v.n * 100 : 0})).sort((a, b) => b.n - a.n);
  const again = S.coupons.filter(c => c.journal && c.journal.again);
  const regret = again.filter(c => c.journal.again === 'Hayır');
  return {rows, total: withReason.length, journaled: S.coupons.filter(c => c.journal).length,
    regret: regret.length, againN: again.length};
}

/* ---------- what-if ---------- */
export function whatIf(kind, param) {
  const cs = settledCoupons(null);
  if (cs.length < MIN_N.whatif)
    return {err: `Senaryo için en az ${MIN_N.whatif} sonuçlanmış kupon gerekiyor. Şu an ${cs.length} tane var.`};
  const start = S.bankroll.initial;
  const realNet = cs.reduce((s, c) => s + couponPL(c), 0);
  let altNet = 0, touched = 0, label = '';

  if (kind === 'singles') {
    label = 'Kombineleri tekliye bölseydim';
    cs.forEach(c => {
      const bs = couponBets(c.id);
      if (c.type === 'single' || bs.length < 2) { altNet += couponPL(c); return; }
      touched++;
      const per = c.stake / bs.length;
      bs.forEach(b => { altNet += b.status === 'won' ? per * (b.odds - 1) : b.status === 'void' ? 0 : -per; });
    });
  } else if (kind === 'risk') {
    label = `Her kupona kasanın %${String(param).replace('.', ',')}'i kadar koysaydım`;
    let bal = start;
    cs.forEach(c => {
      const st = bal * param / 100;
      const ret = couponStatus(c) === 'won' ? st * couponOdds(c) : couponStatus(c) === 'void' ? st : 0;
      bal += ret - st; touched++;
    });
    altNet = bal - start;
  } else if (kind === 'maxOdds') {
    label = `${param.toFixed(2)} üzeri oranları oynamasaydım`;
    cs.forEach(c => { if (couponOdds(c) > param) touched++; else altNet += couponPL(c); });
  } else if (kind === 'dropWorst') {
    const d = dimension('market', 30);
    const worst = d.enough.slice().sort((a, b) => a.roi - b.roi)[0];
    if (!worst) return {err: `Bu senaryo için son 30 günde tür başına en az ${MIN_N.dimension} kupon gerekiyor. Şu an hiçbir bahis türünde bu kadar veri yok.`};
    label = `Son 30 günün en kötü bahis türünü (${worst.key}) oynamasaydım`;
    cs.forEach(c => {
      const hit = couponBets(c.id).some(b => b.market === worst.key);
      if (hit) touched++; else altNet += couponPL(c);
    });
  } else return {err: 'Bilinmeyen senaryo.'};

  return {label, realNet, altNet, diff: altNet - realNet, touched,
    realFinal: start + realNet, altFinal: start + altNet, n: cs.length};
}

/* ---------- seri laboratuvarı ---------- */
export function seriesLab(o) {
  const bets = o.bets || 100, paths = 400;
  const p = o.winRate / 100, up = 1 + (o.risk / 100) * (o.odds - 1), down = 1 - o.risk / 100;
  let sd = 20260911;
  const rr = () => { sd = (sd * 1664525 + 1013904223) % 4294967296; return sd / 4294967296; };
  const ends = []; let ruin25 = 0, ruin50 = 0, s3 = 0, s5 = 0, s10 = 0;
  let minAll = Infinity, maxAll = 0, sum = 0;
  for (let k = 0; k < paths; k++) {
    let v = 1, run = 0, m3 = 0, m5 = 0, m10 = 0, lo = 1, hi = 1;
    for (let i = 0; i < bets; i++) {
      if (rr() < p) { v *= up; run = 0; }
      else { v *= down; run++; if (run >= 3) m3 = 1; if (run >= 5) m5 = 1; if (run >= 10) m10 = 1; }
      lo = Math.min(lo, v); hi = Math.max(hi, v);
    }
    ends.push(v); sum += v;
    if (lo < .25) ruin25++;
    if (lo < .5) ruin50++;
    s3 += m3; s5 += m5; s10 += m10;
    minAll = Math.min(minAll, lo); maxAll = Math.max(maxAll, hi);
  }
  ends.sort((a, b) => a - b);
  const q = f => ends[Math.floor(ends.length * f)];
  return {
    bank: o.bank, bets, paths,
    mean: sum / paths, median: q(.5), best: ends[ends.length - 1], worst: ends[0],
    p10: q(.1), p90: q(.9), minBank: minAll, maxBank: maxAll,
    ruin25: ruin25 / paths * 100, ruin50: ruin50 / paths * 100,
    s3: s3 / paths * 100, s5: s5 / paths * 100, s10: s10 / paths * 100
  };
}

/* ---------- rozetler (hacim değil disiplin ölçer) ---------- */
export function badges() {
  const cs = settledCoupons(null), all = S.coupons, L = limits();
  const st = stats(null);
  const days = new Set(all.map(c => dayKey(c.createdAt)));
  const last30 = all.filter(c => c.createdAt > Date.now() - 30 * 86400000);
  const breach30 = last30.filter(c => riskPct(c.stake) > L.maxBetPct).length;
  const chase = detectChasing();
  const stk = all.slice(-30).map(c => c.stake);
  const m = stk.length ? stk.reduce((a, b) => a + b, 0) / stk.length : 0;
  const sd = stk.length ? Math.sqrt(stk.reduce((s, x) => s + (x - m) ** 2, 0) / stk.length) : 0;
  const cv = m ? sd / m : 1;
  const journaled = S.coupons.filter(c => c.journal).length;
  const reasoned = S.coupons.filter(c => c.reason).length;
  const span = all.length ? (Date.now() - Math.min(...all.map(c => c.createdAt))) / 86400000 : 0;
  const noBreach90 = all.filter(c => c.createdAt > Date.now() - 90 * 86400000).every(c => riskPct(c.stake) <= L.maxBetPct);

  return [
    {i: 'shield', n: 'Risk disiplini', on: last30.length >= 20 && breach30 === 0,
     d: 'Son 30 günde en az 20 kupon ve tek bir sınır aşımı yok.',
     p: last30.length >= 20 ? `${breach30} aşım` : `${last30.length}/20 kupon`},
    {i: 'pen', n: 'Düzenli kayıt', on: days.size >= 20,
     d: '20 farklı günde kupon kaydedildi.', p: `${days.size}/20 gün`},
    {i: 'target', n: 'Kayıp sonrası sakinlik', on: cs.length >= 20 && !chase,
     d: 'Kayıptan sonra bahis tutarını belirgin şekilde artırmadın.',
     p: chase ? `${pct(chase.rise)} artış` : cs.length >= 20 ? 'temiz' : `${cs.length}/20 kupon`},
    {i: 'layers', n: 'İstikrarlı tutar', on: all.length >= 20 && cv < .45,
     d: 'Son 30 kuponda tutar sapması ortalamanın yarısının altında.',
     p: all.length >= 20 ? `sapma ${(cv * 100).toFixed(0)}%` : `${all.length}/20 kupon`},
    {i: 'flame', n: 'Kazanç serisi', on: st.winStreak >= 5,
     d: '5 ardışık kazanan kupon.', p: `en uzun ${st.winStreak}`},
    {i: 'clock', n: 'Ara verme disiplini', on: !!(S.cooldown && S.cooldown.started),
     d: 'Riskli bir dönemde kendi isteğinle mola verdin.',
     p: S.cooldown && S.cooldown.started ? 'kullanıldı' : 'henüz yok'},
    {i: 'crosshair', n: 'Planına sadakat', on: reasoned >= 20 && S.coupons.filter(c => c.reason === 'chase').length === 0,
     d: '20+ kuponda gerekçe kaydedildi ve hiçbiri "kaybı telafi" değil.',
     p: `${reasoned}/20 gerekçe`},
    {i: 'bulb', n: 'Veri ustası', on: journaled >= 15,
     d: '15 kupon için bahis günlüğü dolduruldu.', p: `${journaled}/15 günlük`},
    {i: 'trophy', n: 'Uzun vadeli disiplin', on: span >= 90 && all.length >= 100 && noBreach90,
     d: '90 gün, 100+ kupon ve bu süre boyunca sınır aşımı yok.',
     p: `${Math.floor(span)} gün · ${all.length} kupon`}
  ];
}

