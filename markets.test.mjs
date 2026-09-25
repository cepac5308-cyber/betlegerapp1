/* Sonuçlandırma kurallarının doğruluğu */
import { MARKETS } from './src/engine/markets.js';
let ok=0; const bad=[];
const T=(k,h,a,e)=>{const m=MARKETS[k];
  if(!m){bad.push('tür yok: '+k);return;}
  if(!m.settle){bad.push(k+' otomatik değil');return;}
  const r=m.settle(h,a); if(r===e) ok++; else bad.push(`${k} (${h}-${a}) → ${r}, beklenen ${e}`);};

T('MS 1',2,1,true); T('MS 1',1,1,false); T('MS X',1,1,true); T('MS 2',0,1,true);
T('Çifte Şans 1X',1,1,true); T('Çifte Şans 1X',0,1,false);
T('Çifte Şans X2',1,1,true); T('Çifte Şans 12',2,1,true); T('Çifte Şans 12',1,1,false);
T('KG Var',1,1,true); T('KG Var',2,0,false); T('KG Yok',2,0,true);
T('Gol Olur',0,1,true); T('Gol Olmaz',0,0,true);
[[0.5,0,0,false],[0.5,1,0,true],[1.5,1,1,true],[2.5,2,1,true],[3.5,2,1,false],
 [4.5,3,2,true],[5.5,3,2,false],[6.5,4,3,true]].forEach(([v,h,a,e])=>T(v+' Üst',h,a,e));
[[2.5,1,1,true],[2.5,2,1,false],[1.5,1,0,true],[4.5,2,2,true]].forEach(([v,h,a,e])=>T(v+' Alt',h,a,e));
T('0-1 Gol',1,0,true); T('0-1 Gol',1,1,false);
T('2-3 Gol',2,1,true); T('2-3 Gol',2,2,false);
T('4-5 Gol',3,2,true); T('6+ Gol',4,2,true); T('6+ Gol',3,2,false);
T('Toplam Gol Tek',2,1,true); T('Toplam Gol Tek',2,2,false); T('Toplam Gol Çift',0,0,true);
T('Ev Sahibi 1.5 Üst',2,0,true); T('Ev Sahibi 1.5 Üst',1,3,false);
T('Ev Sahibi 0.5 Alt',0,3,true); T('Deplasman 2.5 Üst',0,3,true); T('Deplasman 1.5 Alt',5,1,true);

const k=Object.keys(MARKETS);
const auto=k.filter(x=>MARKETS[x].settle), manual=k.filter(x=>!MARKETS[x].settle);
console.log(`SONUÇLANDIRMA KURALLARI: ${ok} kontrol geçti, ${bad.length} kaldı`);
bad.forEach(b=>console.log('  ✗ '+b));
console.log(`Tür sayısı: ${k.length} · otomatik ${auto.length} · elle ${manual.length}`);
/* Skordan hesaplanamayanlar otomatik kapatılmamalı */
['Doğru Skor','Handikap','İY/MS 1/1','Korner 9.5 Üst','Kart 3.5 Üst','Oyuncu Gol Atar','İlk Yarı 1']
  .forEach(x=>{if(MARKETS[x] && MARKETS[x].settle) console.log('  ✗ '+x+' otomatik olmamalı');});
process.exit(bad.length?1:0);
