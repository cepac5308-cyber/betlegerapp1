/* Motor modüllerinin prototiple birebir aynı davrandığını doğrular. */
import { S, setState, freshState } from './state.js';
import { seedDemo } from './demo.js';
import * as E from './index.js';

let pass = 0, fail = 0; const bad = [];
const ok = (n, c, d) => c ? pass++ : (fail++, bad.push(n + (d ? ' → ' + d : '')));
const near = (a, b, e = .5) => Math.abs(a - b) < e;

seedDemo();
const b = E.bankroll(), st = E.stats(null), dd = E.drawdown(), D = E.discipline();

let manual = 0;
S.tx.forEach(t => { manual += t.type === 'withdraw' ? -t.amount : t.amount; });
ok('defter = hesaplanan bakiye', near(manual, b.available), `${manual} ≠ ${b.available}`);
ok('toplam = harcanabilir + bekleyen', near(b.equity, b.available + b.pending));
ok('kupon sayısı beklenen aralıkta', S.coupons.length > 90, S.coupons.length);
ok('getiri = net / yatırım', near(st.roi, st.net / st.totalStake * 100, .01));
ok('düşüş 0–100', dd.pct >= 0 && dd.pct <= 100, dd.pct);
ok('disiplin skoru 0–1000', D.score >= 0 && D.score <= 1000, D.score);
ok('skor ağırlıkları toplamı 1', near(D.factors.reduce((s, f) => s + f.w, 0), 1, .001));

ok('MS 1 kuralı', E.MARKETS['MS 1'].settle(2, 1) && !E.MARKETS['MS 1'].settle(1, 1));
ok('KG Var kuralı', E.MARKETS['KG Var'].settle(1, 1) && !E.MARKETS['KG Var'].settle(2, 0));
ok('2.5 Üst kuralı', E.MARKETS['2.5 Üst'].settle(2, 1) && !E.MARKETS['2.5 Üst'].settle(1, 1));
ok('hesaplanamayan tür işaretli', E.MARKETS['Korner 9.5 Üst'].settle === null);

const plOk = S.coupons.filter(c => E.couponStatus(c) !== 'pending')
  .every(c => near(E.couponPL(c), E.couponReturn(c) - c.stake, .01));
ok('kâr/zarar = getiri − tutar', plOk);

const pc = E.preCheck(1000);
ok('ön kontrol alanları dolu', ['pctEquity', 'todayCount', 'openLocked', 'last5', 'limits']
  .every(k => pc[k] !== undefined));
ok('sekiz boyut tanımlı', E.DIMENSIONS.length === 8);
E.DIMENSIONS.forEach(d => ok('boyut çalışıyor: ' + d.k, Array.isArray(E.dimension(d.k, null).rows)));
ok('dokuz rozet', E.badges().length === 9);
ok('rozet kriterleri yazılı', E.badges().every(x => x.d && x.d.length > 15));

const lab = E.seriesLab({bank: 10000, odds: 1.6, risk: 10, bets: 100, winRate: 62.5});
ok('lab yüzdelikleri sıralı', lab.worst <= lab.median && lab.median <= lab.best);
ok('lab iflas olasılığı 0–100', lab.ruin25 >= 0 && lab.ruin25 <= 100);
ok('what-if sonuç döndürüyor', !!E.whatIf('risk', 2).altFinal);
ok('veri kademesi', E.dataTier(120).key === 'strong' && E.dataTier(3).key === 'none');

setState(freshState());
ok('boş durumda NaN yok', [E.stats(null).roi, E.drawdown().pct, E.discipline().score].every(Number.isFinite));
ok('boş durumda sinyal yok', E.riskEngine().length === 0 && E.tiltEngine().length === 0);

console.log(`\nMOTOR MODÜL TESTİ: ${pass} geçti, ${fail} kaldı`);
bad.forEach(x => console.log('  ✗ ' + x));
process.exit(fail ? 1 : 0);
