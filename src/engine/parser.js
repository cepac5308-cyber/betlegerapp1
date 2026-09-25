/* ============================================================
   KUPON AYRIŞTIRICI
   Site adı tanımaz, düzen tanır. Takım satırı, bahis türü, oran
   ve tutar nerede durursa dursun bulunur. Emin olunmayan alan
   boş bırakılır ve güven düşürülür — hiçbir değer uydurulmaz.
   ============================================================ */

/* Türkçe'de İ→i ve I→ı dönüşümü standart toLowerCase ile bozuluyor;
   desen eşleştirmesi bu katlama üzerinden yapılır. */
const fold = s => String(s).replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();

const clean = s => String(s).replace(/\s/g, '');
export function toNum(s) {
  const x = clean(s);
  if (/,\d{1,2}$/.test(x)) return parseFloat(x.replace(/\./g, '').replace(',', '.'));
  if (/\.\d{1,2}$/.test(x) && (x.match(/\./g) || []).length === 1) return parseFloat(x.replace(/,/g, ''));
  return parseFloat(x.replace(/[.,]/g, '')) || 0;
}
const isOdds = v => v >= 1.01 && v <= 60;

/* Kurallar özgülden genele sıralıdır. İkinci eleman ya sabit bir
   anahtar ya da eşleşmeden anahtar üreten bir fonksiyondur —
   böylece her alt/üst eşiği tek kuralla karşılanır. */
const half = m => (m[0] || '').match(/[\d.,]+/);
const thr = x => { const v = parseFloat(String(x).replace(',', '.')); return Number.isFinite(v) ? v : null; };
const side = s2 => /üst|ust|over|fazla/i.test(s2) ? 'Üst' : 'Alt';

export const MARKET_RULES = [
  /* İY/MS kombinasyonları */
  [/(i̇?y\s*\/\s*ms|i̇?lk\s*yarı\s*\/\s*maç\s*sonucu|ht\s*\/\s*ft)\s*[:\-–]?\s*([12x])\s*[\/-]\s*([12x])/i,
    m => 'İY/MS ' + m[2].toUpperCase() + '/' + m[3].toUpperCase()],

  /* korner alt/üst */
  [/(korner|corner)[^\d]{0,12}(\d{1,2}[.,]5)\s*(üst|ust|alt|over|under)|(üst|ust|alt|over|under)\s*(\d{1,2}[.,]5)[^\d]{0,12}(korner|corner)/i,
    m => { const v = thr((m[0].match(/\d{1,2}[.,]5/) || [])[0]); return v ? 'Korner ' + v + ' ' + side(m[0]) : 'Korner 9.5 Üst'; }],
  [/korner|corner/i, 'Korner 9.5 Üst'],

  /* kart alt/üst */
  [/(kart|card)[^\d]{0,12}(\d{1,2}[.,]5)\s*(üst|ust|alt|over|under)|(üst|ust|alt|over|under)\s*(\d{1,2}[.,]5)[^\d]{0,12}(kart|card)/i,
    m => { const v = thr((m[0].match(/\d{1,2}[.,]5/) || [])[0]); return v ? 'Kart ' + v + ' ' + side(m[0]) : 'Kart 3.5 Üst'; }],
  [/kırmızı\s*kart|red\s*card/i, 'Kırmızı Kart'],

  /* ilk yarı alt/üst */
  [/(i̇?lk\s*yarı|i̇?y|first\s*half|1\.?\s*half)[^\d]{0,14}(\d{1,2}[.,]5)\s*(üst|ust|alt|over|under)/i,
    m => 'İY ' + thr(m[2]) + ' ' + side(m[3])],

  /* takım gol sayısı */
  [/(ev\s*sahibi|home\s*team|home)[^\d]{0,14}(\d{1,2}[.,]5)\s*(üst|ust|alt|over|under)/i,
    m => 'Ev Sahibi ' + thr(m[2]) + ' ' + side(m[3])],
  [/(deplasman|away\s*team|away)[^\d]{0,14}(\d{1,2}[.,]5)\s*(üst|ust|alt|over|under)/i,
    m => 'Deplasman ' + thr(m[2]) + ' ' + side(m[3])],

  /* toplam gol aralıkları ve tek/çift */
  [/toplam\s*gol[^\d]{0,8}0\s*[-–]\s*1|(?:^|\W)0\s*[-–]\s*1\s*gol/i, '0-1 Gol'],
  [/toplam\s*gol[^\d]{0,8}2\s*[-–]\s*3|(?:^|\W)2\s*[-–]\s*3\s*gol/i, '2-3 Gol'],
  [/toplam\s*gol[^\d]{0,8}4\s*[-–]\s*5|(?:^|\W)4\s*[-–]\s*5\s*gol/i, '4-5 Gol'],
  [/toplam\s*gol[^\d]{0,8}6\s*\+|(?:^|\W)6\s*\+\s*gol/i, '6+ Gol'],
  [/(toplam\s*gol|total\s*goals)[^a-zçğıöşü]{0,6}(tek|odd)(?!\w)/i, 'Toplam Gol Tek'],
  [/(toplam\s*gol|total\s*goals)[^a-zçğıöşü]{0,6}(çift|even)(?!\w)/i, 'Toplam Gol Çift'],

  /* genel alt/üst: her eşik */
  [/(\d{1,2}[.,]5)\s*(gol\s*)?(üst|ust|over)|(üst|ust|over)\s*(\d{1,2}[.,]5)/i,
    m => thr((m[0].match(/\d{1,2}[.,]5/) || [])[0]) + ' Üst'],
  [/(\d{1,2}[.,]5)\s*(gol\s*)?(alt|under)|(alt|under)\s*(\d{1,2}[.,]5)/i,
    m => thr((m[0].match(/\d{1,2}[.,]5/) || [])[0]) + ' Alt'],

  /* diğer özgül türler */
  [/doğru\s*skor|correct\s*score/i, 'Doğru Skor'],
  [/asya\s*handikap|asian\s*handicap/i, 'Asya Handikap'],
  [/handikap|handicap/i, 'Handikap'],
  [/beraberlikte\s*i̇?ade\s*[:\-–]?\s*1|draw\s*no\s*bet\s*[:\-–]?\s*1/i, 'Beraberlikte İade 1'],
  [/beraberlikte\s*i̇?ade\s*[:\-–]?\s*2|draw\s*no\s*bet\s*[:\-–]?\s*2/i, 'Beraberlikte İade 2'],
  [/uzatmalar\s*dahil|including\s*ot|maçı\s*kazanan/i, 'Maçı Kazanan (Uzatmalar Dahil)'],
  [/her\s*i̇?ki\s*yarıda\s*gol|both\s*halves/i, 'Her İki Yarıda Gol'],
  [/i̇?lk\s*golü\s*atan|first\s*(goal)?\s*scorer/i, 'İlk Golü Atan'],
  [/(oyuncu\s*)?2\s*\+\s*gol|2\s*or\s*more\s*goals/i, 'Oyuncu 2+ Gol'],
  [/asist|assist/i, 'Oyuncu Asist'],
  [/gol\s*atar|anytime\s*scorer/i, 'Oyuncu Gol Atar'],
  [/penaltı|penalty/i, 'Penaltı'],
  [/set\s*(kazanan|winner)|set\s*skoru/i, 'Set Kazananı'],
  [/çeyrek\s*(kazanan|winner)|quarter/i, 'Çeyrek Kazananı'],

  /* karşılıklı gol */
  [/karşılıklı\s*gol\s*[:\-–]?\s*(var|yes)|(?:^|\W)kg\s*[:\-–]?\s*var|both\s*teams?\s*to\s*score\s*[-–:]?\s*yes|btts\s*[-–:]?\s*yes/i, 'KG Var'],
  [/karşılıklı\s*gol\s*[:\-–]?\s*(yok|no)|(?:^|\W)kg\s*[:\-–]?\s*yok|both\s*teams?\s*to\s*score\s*[-–:]?\s*no|btts\s*[-–:]?\s*no/i, 'KG Yok'],
  [/gol\s*olur|goal\s*yes/i, 'Gol Olur'],
  [/gol\s*olmaz|no\s*goal/i, 'Gol Olmaz'],

  /* çifte şans */
  [/çifte\s*şans\s*[:\-–]?\s*1\s*[-–\/]?\s*x|double\s*chance\s*[:\-–]?\s*1\s*x|(?:^|\W)1\s*[-–\/]\s*x(?:\W|$)/i, 'Çifte Şans 1X'],
  [/çifte\s*şans\s*[:\-–]?\s*x\s*[-–\/]?\s*2|double\s*chance\s*[:\-–]?\s*x\s*2|(?:^|\W)x\s*[-–\/]\s*2(?:\W|$)/i, 'Çifte Şans X2'],
  [/çifte\s*şans\s*[:\-–]?\s*1\s*[-–\/]?\s*2|double\s*chance\s*[:\-–]?\s*12|(?:^|\W)1\s*[-–\/]\s*2(?:\W|$)/i, 'Çifte Şans 12'],

  /* ilk yarı sonucu */
  [/(i̇?lk\s*yarı|first\s*half|ht)\s*(sonucu|result)?\s*[:\-–]?\s*1(?!\d)/i, 'İlk Yarı 1'],
  [/(i̇?lk\s*yarı|first\s*half|ht)\s*(sonucu|result)?\s*[:\-–]?\s*x/i, 'İlk Yarı X'],
  [/(i̇?lk\s*yarı|first\s*half|ht)\s*(sonucu|result)?\s*[:\-–]?\s*2(?!\d)/i, 'İlk Yarı 2'],
  [/i̇?lk\s*yarı|first\s*half/i, 'İlk Yarı Sonucu'],
  [/2\.?\s*yarı|second\s*half/i, '2. Yarı Sonucu'],

  /* maç sonucu */
  [/maç\s*sonucu\s*[:\-–]?\s*(ms\s*)?1(?!\d)|match\s*result\s*[:\-–]?\s*1(?!\d)|(?:^|\W)ms\s*1(?:\W|$)|(?:^|\W)1x2\s*[:\-–]?\s*1(?:\W|$)/i, 'MS 1'],
  [/maç\s*sonucu\s*[:\-–]?\s*(ms\s*)?2(?!\d)|match\s*result\s*[:\-–]?\s*2(?!\d)|(?:^|\W)ms\s*2(?:\W|$)/i, 'MS 2'],
  [/maç\s*sonucu\s*[:\-–]?\s*(ms\s*)?x|match\s*result\s*[:\-–]?\s*(x|draw)|(?:^|\W)ms\s*x(?:\W|$)|beraberlik(?!te)/i, 'MS X']
];


export const LEAGUE_RULES = [
  [/süper\s*lig|türkiye/i, 'Süper Lig'],
  [/premier\s*(lig|league)|i̇?ngiltere|championship/i, 'Premier League'],
  [/la\s*liga|i̇?spanya/i, 'La Liga'],
  [/serie\s*a|i̇?talya/i, 'Serie A'],
  [/bundesliga|almanya/i, 'Bundesliga'],
  [/ligue\s*1|fransa/i, 'Ligue 1'],
  [/eredivisie|hollanda/i, 'Eredivisie'],
  [/şampiyonlar|champions|uefa/i, 'Şampiyonlar Ligi'],
  [/ekstraklasa|polonya/i, 'Ekstraklasa'],
  [/eliteserien|norveç/i, 'Eliteserien'],
  [/primeira|portekiz/i, 'Primeira Liga']
];

const LABEL = /kupon|toplam|tutar|miktar|yatırılan|oran|kazanç|statü|durum|bahis|tarih|saat|stake|odds|potential|return|bet\s*slip|wager|status|accepted|kabul|maks|max|futbol|football|sistem|kombine|tek\s*maç|selections?/i;
const TIME = /\d{1,2}[:.]\d{2}/;
const DATE = /\d{1,2}[./]\d{1,2}[./]\d{2,4}/;
const SEP = /\s+(?:[-–—]|vs\.?|v\.)\s+/i;
const VS_ONLY = /^(?:vs\.?|v\.|[-–—])$/i;

const norm = l => String(l)
  .replace(/[\u2022*·|]/g, ' ')
  .replace(/\s+/g, ' ')
  .replace(/^[\s.,;:–—-]+|[\s.,;:–—-]+$/g, '')
  .trim();

const findMarket = s => {
  const f = fold(s);
  for (const [re, k] of MARKET_RULES) {
    const m = f.match(re);
    if (!m) continue;
    const key = typeof k === 'function' ? k(m) : k;
    if (!key) continue;
    return [key, s.substr(m.index, m[0].length)];
  }
  return null;
};
const findLeague = s => { const f = fold(s); for (const [re, k] of LEAGUE_RULES) if (re.test(f)) return k; return null; };

function nameLike(l) {
  if (!l || l.length < 2 || l.length > 32) return false;
  if (TIME.test(l) || DATE.test(l)) return false;
  if (LABEL.test(fold(l))) return false;
  if (findLeague(l)) return false;
  if (findMarket(l)) return false;
  if (/^\d/.test(l)) return false;
  if (!/\p{L}{2}/u.test(l)) return false;
  if ((l.match(/\d/g) || []).length > 2) return false;
  return true;
}

function oddsIn(line, marketText) {
  let s = line;
  if (marketText) s = s.split(marketText).join(' ');
  s = s.replace(/\([^)]*\)/g, ' ')
       .replace(/\d+\s*[-–]\s*\d+/g, ' ')
       .replace(/\d{1,2}:\d{2}/g, ' ')
       .replace(/\d{1,2}[.,]5\s*(üst|ust|alt|over|under)/gi, ' ')
       .replace(/(üst|ust|alt|over|under)\s*\d{1,2}[.,]5(?!\d)/gi, ' ')
       .replace(/(korner|corner|toplam\s*gol|total\s*goals|handikap|handicap|doğru\s*skor|correct\s*score)[\s\d.,()\-–]*/gi, ' ');
  const dec = [...s.matchAll(/(?:^|\s)(\d{1,2}[.,]\d{1,3})(?=\s|$)/g)].map(m => toNum(m[1])).filter(isOdds);
  if (dec.length) return dec[dec.length - 1];
  const int = [...s.matchAll(/(?:^|\s)(\d{1,2})(?=\s|$)/g)].map(m => +m[1]).filter(v => v >= 2 && v <= 20);
  return int.length ? int[int.length - 1] : null;
}

export function parseSlip(raw) {
  const lines = String(raw).split(/\r?\n/).map(norm).filter(Boolean);
  const n = lines.length;
  const legs = [];
  let stake = null, totalOdds = null, potential = null;

  lines.forEach(l => {
    const isWin = /kazanç|potansiyel|potential|return|maks|max/i.test(l);
    const isStake = /bahis\s*tutar|^tutar|miktar|yatırılan|^stake|bet\s*amount|wager/i.test(l);
    const isTotal = /toplam\s*oran|^oranlar?\s*[:.]|total\s*odds/i.test(l);
    if (!isWin && !isStake && !isTotal) return;
    const nums = [...l.matchAll(/(\d[\d\s.,]*\d|\d)/g)].map(m => m[1].trim());
    if (!nums.length) return;
    const last = toNum(nums[nums.length - 1]);
    if (isStake && !isWin) { if (last > 0 && last < 1e7) stake = last; }
    else if (isTotal) { if (last >= 1 && last <= 5000) totalOdds = last; }
    else if (isWin) { if (last > 0) potential = last; }
  });

  const marks = [];
  for (let i = 0; i < n; i++) {
    const l = lines[i];
    if (findMarket(l)) continue;
    if (SEP.test(l) && !TIME.test(l) && !DATE.test(l)) {
      const stripped = l.replace(/\s+\d{1,2}[.,]\d{1,3}\s*$/, '');
      const parts = stripped.split(SEP);
      if (parts.length === 2) {
        const a = parts[0].trim(), b = parts[1].trim();
        if (nameLike(a) && nameLike(b)) { marks.push({ i, end: i, home: a, away: b }); continue; }
      }
    }
    if (nameLike(l)) {
      const nx = lines[i + 1], nx2 = lines[i + 2];
      if (nx && VS_ONLY.test(nx) && nx2 && nameLike(nx2)) { marks.push({ i, end: i + 2, home: l, away: nx2 }); i += 2; continue; }
      if (nx && nameLike(nx)) { marks.push({ i, end: i + 1, home: l, away: nx }); i += 1; continue; }
    }
  }

  marks.forEach((m, idx) => {
    const stop = idx + 1 < marks.length ? marks[idx + 1].i : n;
    let league = null, market = null, odds = null;
    for (let j = m.end + 1; j < stop; j++) {
      const l = lines[j];
      if (/tutar|miktar|toplam\s*oran|kazanç|stake|total\s*odds|potential|return/i.test(l)) continue;
      if (!league) league = findLeague(l);
      const fm = !market ? findMarket(l) : null;
      if (fm) market = fm[0];
      const o = oddsIn(l, fm ? fm[1] : null);
      if (odds == null && o != null) odds = o;
    }
    if (odds == null) {
      const fm = findMarket(lines[m.end]);
      odds = oddsIn(lines[m.end], fm ? fm[1] : null);
    }
    if (!league) for (let j = m.i - 1; j >= Math.max(0, m.i - 3); j--) {
      if (marks.some(x => x.end === j || x.i === j)) break;
      league = findLeague(lines[j]);
      if (league) break;
    }
    let conf = .45;
    if (market) conf += .25;
    if (odds != null) conf += .25;
    if (league) conf += .05;
    legs.push({
      league: league || 'Süper Lig', home: m.home, away: m.away,
      market: market || 'MS 1', odds: odds != null ? odds : 1.5,
      conf: Math.min(.98, conf),
      missing: [!market && 'market', odds == null && 'odds', !league && 'league'].filter(Boolean)
    });
  });

  if (!stake && potential && totalOdds && totalOdds > 1) {
    const v = potential / totalOdds;
    if (v > 0) stake = Math.round(v * 100) / 100;
  }
  return { legs, stake, totalOdds, lineCount: n };
}
