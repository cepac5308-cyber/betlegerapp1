import { parseSlip } from './src/engine/parser.js';
import { CASES } from './fixtures.mjs';
let ok=0, tot=0; const bad=[];
for (const cs of CASES) {
  const r = parseSlip(cs.text);
  tot++; if (Math.abs((r.stake||0) - cs.exp.stake) < .01) ok++; else bad.push(`${cs.ad} · tutar ${r.stake} ≠ ${cs.exp.stake}`);
  tot++; if (r.legs.length === cs.exp.legs.length) ok++; else bad.push(`${cs.ad} · seçim ${r.legs.length} ≠ ${cs.exp.legs.length}`);
  cs.exp.legs.forEach((b,i)=>{
    const l = r.legs[i] || {};
    [['home',b[0]],['away',b[1]],['market',b[2]]].forEach(([k,v])=>{
      tot++; if (l[k]===v) ok++; else bad.push(`${cs.ad} · ${k}: "${l[k]}" ≠ "${v}"`);});
    tot++; if (l.odds && Math.abs(l.odds-b[3])<.001) ok++; else bad.push(`${cs.ad} · oran ${l.odds} ≠ ${b[3]}`);
  });
}
console.log(`KUPON DÜZENLERİ: ${ok}/${tot} alan (%${(ok/tot*100).toFixed(0)}) · ${CASES.length} düzen`);
bad.slice(0,30).forEach(b=>console.log('  ✗ '+b));
