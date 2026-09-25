/* Ekranların kullandığı motor çağrıları gerçekten çalışıyor mu? */
import { S, setState, freshState } from './src/engine/state.js';
import { seedDemo } from './src/engine/demo.js';
import * as E from './src/engine/index.js';
let ok=0, bad=0; const f=[];
const T=(n,fn)=>{try{fn();ok++;}catch(e){bad++;f.push(n+' → '+e.message);}};

seedDemo();
T('bankroll', ()=>{const b=E.bankroll(); if(!(b.equity>0)) throw new Error('kasa yok');});
T('stats', ()=>{const s=E.stats(30); if(!Number.isFinite(s.roi)) throw new Error('roi NaN');});
T('discipline', ()=>{const d=E.discipline(); if(!(d.score>=0&&d.score<=1000)) throw new Error('skor aralık dışı');
  if(!d.factors.every(x=>x.k&&x.d)) throw new Error('bileşen metni eksik');});
T('tiltEngine', ()=>{E.tiltEngine().forEach(x=>{if(!x.t||!x.d) throw new Error('sinyal metni eksik');});});
T('insights', ()=>{E.insights().forEach(x=>{if(typeof x!=='string') throw new Error('bulgu metni değil');});});
T('peakInfo', ()=>{const p=E.peakInfo(); if(!(p.pct>=0)) throw new Error('düşüş negatif');});
T('equityCurve', ()=>{if(E.equityCurve(30).length<2) throw new Error('nokta yok');});
T('dailyNet', ()=>{if(typeof E.dailyNet(null)!=='object') throw new Error('gün haritası yok');});
T('badges', ()=>{const b=E.badges(); if(b.length!==9) throw new Error('rozet sayısı '+b.length);
  if(!b.every(x=>x.n&&x.p!==undefined)) throw new Error('rozet alanı eksik');});
T('preCheck', ()=>{const p=E.preCheck(500);
  ['pctEquity','pctAvailable','todayCount','openLocked','last5','last10','limits'].forEach(k=>{
    if(p[k]===undefined) throw new Error('alan yok: '+k);});});
T('preCheckFlags', ()=>{if(typeof E.preCheckFlags(E.preCheck(500))!=='number') throw new Error('sayı değil');});
T('MARKETS/LEAGUES', ()=>{if(Object.keys(E.MARKETS).length<10||Object.keys(E.LEAGUES).length<8) throw new Error('liste kısa');});
T('cooldown', ()=>{E.startCooldown(5); if(!E.coolActive()) throw new Error('mola başlamadı');
  if(E.coolLeft()<1) throw new Error('süre yok'); S.cooldown.until=0;});

/* kupon ekle → sonuçlandır → defter tutuyor mu */
T('kupon akışı', ()=>{
  const before=E.bankroll().available, at=Date.now();
  const cp={id:E.uid(),type:'single',stake:500,createdAt:at,note:'',source:'manual',settledAt:null,reason:'stat',journal:null};
  S.coupons.push(cp); S.tx.push({id:E.uid(),type:'stake',amount:-500,at,ref:cp.id});
  S.bets.push({id:E.uid(),couponId:cp.id,league:'Süper Lig',home:'A',away:'B',market:'MS 1',
    odds:2,status:'pending',score:null,kickoff:at});
  if(Math.abs(E.bankroll().available-(before-500))>.5) throw new Error('tutar düşmedi');
  E.couponBets(cp.id).forEach(b=>b.status='won'); E.settleCoupon(cp.id);
  if(Math.abs(E.bankroll().available-(before+500))>.5) throw new Error('kazanç eklenmedi');
  E.couponBets(cp.id).forEach(b=>b.status='pending'); E.settleCoupon(cp.id);
  if(Math.abs(E.bankroll().available-(before-500))>.5) throw new Error('geri alma bozuk');
  let m=0; S.tx.forEach(x=>m+= x.type==='withdraw'?-x.amount:x.amount);
  if(Math.abs(m-E.bankroll().available)>.5) throw new Error('defter tutmuyor');
});

/* boş durum */
T('boş durum', ()=>{setState(freshState());
  [E.stats(null).roi,E.drawdown().pct,E.discipline().score,E.peakInfo().pct].forEach(v=>{
    if(!Number.isFinite(v)) throw new Error('NaN');});
  if(E.tiltEngine().length||E.insights().length) throw new Error('boşta sinyal var');});

console.log(`MOTOR–EKRAN UYUMU: ${ok} geçti, ${bad} kaldı`);
f.forEach(x=>console.log('  ✗ '+x));
process.exit(bad?1:0);
