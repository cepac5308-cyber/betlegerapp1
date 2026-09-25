import { parseSlip } from './src/engine/parser.js';
const T = [
 ['3 seçimli kupon',
  `Kupon Detayı\n18.09.2026 20:14 - Kupon No: 87018740597\nGalatasaray - Fenerbahçe\nTürkiye Süper Lig - 20:00\nMaç Sonucu: MS1 1,55\nArsenal - Chelsea\nİngiltere Premier Lig - 22:00\nKarşılıklı Gol: Var 1,42\nReal Madrid - Sevilla\nİspanya La Liga - 22:30\nAlVÜst 2,5: Üst 1,28\nToplam Oran 2,82\nBahis Tutarı 250,00 TL\nMaks. Kazanç 705,00 TL`,
  {stake:250, legs:[['Galatasaray','Fenerbahçe','Süper Lig','MS 1',1.55],['Arsenal','Chelsea','Premier League','KG Var',1.42],['Real Madrid','Sevilla','La Liga','2.5 Üst',1.28]]}],
 ['tablo düzeni',
  `Tek Maç - 18.09.2026\nBeşiktaş - Trabzonspor 2,10\nSüper Lig\nÇifte Şans 1X\nMiktar ₺1.200\nPotansiyel Kazanç ₺2.520`,
  {stake:1200, legs:[['Beşiktaş','Trabzonspor','Süper Lig','Çifte Şans 1X',2.10]]}],
 ['VS ayırıcı, doğru skor',
  `Oranlar: 7\nBahis tutarı: 160.71 ₺\nPotansiyel kazançlar: 1124.97 ₺\nStatü: Kabul edildi\nFutbol. İngiltere Şampiyonası. Premier Lig\n18.09.2026 (22:00)\nBrentford VS Chelsea\nDoğru skor. 1-1 7\nStatü: Kabul edildi`,
  {stake:160.71, legs:[['Brentford','Chelsea','Premier League','Doğru Skor',7]]}]
];
let ok=0, tot=0, bad=[];
for (const [ad, text, exp] of T) {
  const r = parseSlip(text);
  exp.legs.forEach((b,i)=>{
    const l=r.legs[i]||{};
    [['home',b[0]],['away',b[1]],['league',b[2]],['market',b[3]]].forEach(([k,v])=>{
      tot++; if(l[k]===v) ok++; else bad.push(`${ad} · ${k}: ${l[k]} ≠ ${v}`);});
    tot++; if(l.odds&&Math.abs(l.odds-b[4])<.001) ok++; else bad.push(`${ad} · oran: ${l.odds} ≠ ${b[4]}`);
  });
  tot++; if(Math.abs((r.stake||0)-exp.stake)<.01) ok++; else bad.push(`${ad} · tutar: ${r.stake} ≠ ${exp.stake}`);
}
console.log(`AYRIŞTIRICI: ${ok}/${tot} alan doğru`);
bad.forEach(b=>console.log('  ✗ '+b));
process.exit(bad.length?1:0);
