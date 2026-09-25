/* Yalnızca geliştirme/tanıtım. Üretim derlemesinde kullanılmaz. */
import { S, setState, freshState } from './state.js';
import { uid, dayKey } from './format.js';
import { MARKETS, LEAGUES, TOP_LEAGUES, MINOR_LEAGUES } from './markets.js';
import { settleCoupon, couponPL, couponBets } from './bankroll.js';
/* ---------- deterministik rastgele ---------- */
export let seed = 20260911;
export let EDGE = 1.0;
export const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pickLeague = () => rnd() < .82 ? TOP_LEAGUES[Math.floor(rnd() * TOP_LEAGUES.length)]
                                     : MINOR_LEAGUES[Math.floor(rnd() * MINOR_LEAGUES.length)];


export const pick = arr => arr[Math.floor(rnd() * arr.length)];

/* ---------- demo verisi ---------- */
export function makeMatch(lg) {
  const t = LEAGUES[lg].teams.slice();
  const h = t.splice(Math.floor(rnd() * t.length), 1)[0];
  const a = t[Math.floor(rnd() * t.length)];
  return {home: h, away: a};
}
export function scoreFor(won, market) {
  // sonucun bahisle tutarlı olduğu bir skor üret
  for (let i = 0; i < 60; i++) {
    const h = Math.floor(rnd() * 4), a = Math.floor(rnd() * 3);
    const f = MARKETS[market].settle;
    if (!f) return {h, a};
    if (f(h, a) === won) return {h, a};
  }
  return {h: 1, a: 1};
}

export function seedDemo(sd) {
  setState(freshState());
  seed = sd || 578087;
  const now = Date.now(), DAY = 86400000;
  S.tx.push({id: uid(), type: 'init', amount: S.bankroll.initial, at: now - 92 * DAY, ref: null});
  S.tx.push({id: uid(), type: 'deposit', amount: 2000, at: now - 41 * DAY, ref: null});
  S.tx.push({id: uid(), type: 'withdraw', amount: 800, at: now - 20 * DAY, ref: null});

  const mkKeys = Object.keys(MARKETS).filter(k => MARKETS[k].settle);
  const lgKeys = Object.keys(LEAGUES);

  const addCoupon = (daysAgo, legs, stake, type, note) => {
    let at = now - daysAgo * DAY - Math.floor(rnd() * 9) * 3600000;
    if (daysAgo === 0) { const mn = new Date(); mn.setHours(0, 0, 0, 0); at = Math.max(at, mn.getTime() + 3600000); }
    const c = {id: uid(), type, stake, createdAt: at, note: note || '', source: rnd() > .35 ? 'screenshot' : 'manual', settledAt: null};
    S.coupons.push(c);
    S.tx.push({id: uid(), type: 'stake', amount: -stake, at, ref: c.id});
    legs.forEach(L => S.bets.push(Object.assign({id: uid(), couponId: c.id, kickoff: at + 6 * 3600000}, L)));
    return c;
  };

  // Oransal bahis: tutar, o andaki kasanın yüzdesi olarak hesaplanır.
  let bal = S.bankroll.initial;
  const stakeOf = frac => Math.max(10, Math.round(bal * frac / 10) * 10);

  for (let d = 90; d >= 3; d--) {
    if (d === 41) bal += 2000;
    if (d === 20) bal -= 800;
    const n = rnd() < .34 ? 0 : 1 + Math.floor(rnd() * 2);
    for (let k = 0; k < n; k++) {
      const isParlay = rnd() < .28;
      const legCount = isParlay ? 2 + Math.floor(rnd() * 2) : 1;
      const frac = isParlay ? [.01, .02, .02, .03][Math.floor(rnd() * 4)]
                            : [.015, .02, .02, .03, .03, .04, .05, .06][Math.floor(rnd() * 8)];
      const stake = stakeOf(frac);
      const legs = [];
      for (let i = 0; i < legCount; i++) {
        const lg = pickLeague(), m = pick(mkKeys), mt = makeMatch(lg);
        const odds = +(1.15 + rnd() * 0.5).toFixed(2);
        const won = rnd() < (1 / odds) * (isParlay ? EDGE * 0.97 : EDGE);
        legs.push({league: lg, home: mt.home, away: mt.away, market: m, odds,
                   status: won ? 'won' : 'lost', score: scoreFor(won, m)});
      }
      const c = addCoupon(d, legs, stake, legCount > 1 ? 'parlay' : 'single');
      settleCoupon(c.id, true);
      bal += couponPL(c);
    }
  }

  // ---- son günler: kayıp sonrası oranı büyütme örüntüsü
  [[.03, 'lost', 3], [.05, 'lost', 2], [.1, 'lost', 2], [.12, 'won', 1]].forEach(([frac, res, day]) => {
    const lg = pickLeague(), m = pick(mkKeys), mt = makeMatch(lg), won = res === 'won';
    const c = addCoupon(day, [{league: lg, home: mt.home, away: mt.away, market: m,
      odds: +(1.2 + rnd() * .45).toFixed(2), status: res, score: scoreFor(won, m)}], stakeOf(frac), 'single');
    settleCoupon(c.id, true);
    bal += couponPL(c);
  });

  // ---- bugün: açık bahisler
  addCoupon(0, [{league: 'Şampiyonlar Ligi', home: 'Fenerbahçe', away: 'Benfica', market: 'MS 1',
    odds: 1.55, status: 'pending', score: null}], stakeOf(.05), 'single', 'Rakipte iki stoper eksik.');
  S.bets.filter(b => b.status === 'pending').forEach(b => { b.kickoff = Date.now() - 25 * 60000; });
  addCoupon(0, [
    {league: 'Premier League', home: 'Arsenal', away: 'Chelsea', market: 'KG Var', odds: 1.42, status: 'pending', score: null},
    {league: 'La Liga', home: 'Real Madrid', away: 'Sevilla', market: 'MS 1', odds: 1.28, status: 'pending', score: null}
  ], stakeOf(.03), 'parlay');
  S.bets.filter(b => b.status === 'pending').forEach((b, i) => {
    b.kickoff = Date.now() - (30 - i * 6) * 60000;
    b.live = {status: 'live', minute: 18 + i * 7, h: i === 0 ? 1 : 0, a: 0, htDone: false};
  });
  [['lost', .05], ['won', .04], ['lost', .03]].forEach(x => {
    const lg = pickLeague(), m = pick(mkKeys), mt = makeMatch(lg), won = x[0] === 'won';
    const c = addCoupon(0, [{league: lg, home: mt.home, away: mt.away, market: m,
      odds: +(1.2 + rnd() * .45).toFixed(2), status: x[0], score: scoreFor(won, m)}], stakeOf(x[1]), 'single');
    settleCoupon(c.id, true);
    bal += couponPL(c);
  });

  S.coupons.sort((a, b) => a.createdAt - b.createdAt);
  S.tx.sort((a, b) => a.at - b.at);
}

