/* Yeni ekranların kullandığı motor çağrıları */
import { S, setState, freshState } from './src/engine/state.js';
import { seedDemo } from './src/engine/demo.js';
import * as E from './src/engine/index.js';
let ok=0,bad=[];
const T=(n,f)=>{try{f();ok++;}catch(e){bad.push(n+' → '+e.message);}};
seedDemo();
E.DIMENSIONS.forEach(d=>T('dimension/'+d.k,()=>{
  const r=E.dimension(d.k,null);
  if(!Array.isArray(r.rows)) throw new Error('satır yok');
  r.rows.forEach(x=>{if(!Number.isFinite(x.roi)||!Number.isFinite(x.wr)) throw new Error('NaN');});
}));
T('seriesLab',()=>{const r=E.seriesLab({bank:10000,odds:1.6,risk:10,bets:100,winRate:62.5});
  ['median','mean','best','worst','ruin25','ruin50','s3','s5','s10'].forEach(k=>{
    if(!Number.isFinite(r[k])) throw new Error('NaN: '+k);});
  if(!(r.worst<=r.median&&r.median<=r.best)) throw new Error('sıralama bozuk');});
['singles','risk','maxOdds','dropWorst'].forEach(k=>T('whatIf/'+k,()=>{
  const r=E.whatIf(k,k==='risk'?2:1.5);
  if(!r) throw new Error('boş');
  if(!r.err&&!Number.isFinite(r.altFinal)) throw new Error('NaN');}));
T('limits',()=>{if(!Number.isFinite(E.limits().maxBetPct)) throw new Error('sınır yok');});
setState(freshState());
T('boşta dimension',()=>{E.DIMENSIONS.forEach(d=>E.dimension(d.k,null));});
T('boşta whatIf',()=>{const r=E.whatIf('risk',2); if(!r.err) throw new Error('uyarı yok');});
T('boşta lab',()=>{const r=E.seriesLab({bank:0,odds:1.6,risk:10,bets:100,winRate:50});
  if(!Number.isFinite(r.median)) throw new Error('NaN');});
console.log(`YENİ EKRANLAR: ${ok} geçti, ${bad.length} kaldı`);
bad.forEach(b=>console.log('  ✗ '+b));
process.exit(bad.length?1:0);
