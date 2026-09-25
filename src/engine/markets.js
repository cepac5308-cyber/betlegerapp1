/* settle(h,a) deterministik sonuçlandırma kuralı; null ise skordan hesaplanamaz. */
/* ---------- pazar (market) tanımları ---------- */
export const MARKETS = {
  /* ── maç sonucu ── */
  'MS 1':{g:'Maç Sonucu', settle:(h,a)=>h>a},
  'MS X':{g:'Maç Sonucu', settle:(h,a)=>h===a},
  'MS 2':{g:'Maç Sonucu', settle:(h,a)=>a>h},
  'Çifte Şans 1X':{g:'Çifte Şans', settle:(h,a)=>h>=a},
  'Çifte Şans 12':{g:'Çifte Şans', settle:(h,a)=>h!==a},
  'Çifte Şans X2':{g:'Çifte Şans', settle:(h,a)=>a>=h},
  'Beraberlikte İade 1':{g:'Maç Sonucu', settle:null},
  'Beraberlikte İade 2':{g:'Maç Sonucu', settle:null},
  'Maçı Kazanan (Uzatmalar Dahil)':{g:'Maç Sonucu', settle:null},

  /* ── karşılıklı gol ── */
  'KG Var':{g:'Karşılıklı Gol', settle:(h,a)=>h>0&&a>0},
  'KG Yok':{g:'Karşılıklı Gol', settle:(h,a)=>h===0||a===0},
  'Gol Olur':{g:'Karşılıklı Gol', settle:(h,a)=>h+a>0},
  'Gol Olmaz':{g:'Karşılıklı Gol', settle:(h,a)=>h+a===0},
  'Her İki Yarıda Gol':{g:'Karşılıklı Gol', settle:null},

  /* ── toplam gol aralıkları ── */
  '0-1 Gol':{g:'Toplam Gol', settle:(h,a)=>h+a<=1},
  '2-3 Gol':{g:'Toplam Gol', settle:(h,a)=>h+a>=2&&h+a<=3},
  '4-5 Gol':{g:'Toplam Gol', settle:(h,a)=>h+a>=4&&h+a<=5},
  '6+ Gol':{g:'Toplam Gol', settle:(h,a)=>h+a>=6},
  'Toplam Gol Tek':{g:'Toplam Gol', settle:(h,a)=>(h+a)%2===1},
  'Toplam Gol Çift':{g:'Toplam Gol', settle:(h,a)=>(h+a)%2===0},
  'Toplam Gol':{g:'Toplam Gol', settle:null},

  /* ── ilk yarı ── */
  'İlk Yarı 1':{g:'İlk Yarı', settle:null},
  'İlk Yarı X':{g:'İlk Yarı', settle:null},
  'İlk Yarı 2':{g:'İlk Yarı', settle:null},
  'İlk Yarı Sonucu':{g:'İlk Yarı', settle:null},
  '2. Yarı Sonucu':{g:'İlk Yarı', settle:null},
  'İY/MS 1/1':{g:'İY/MS', settle:null}, 'İY/MS 1/X':{g:'İY/MS', settle:null},
  'İY/MS 1/2':{g:'İY/MS', settle:null}, 'İY/MS X/1':{g:'İY/MS', settle:null},
  'İY/MS X/X':{g:'İY/MS', settle:null}, 'İY/MS X/2':{g:'İY/MS', settle:null},
  'İY/MS 2/1':{g:'İY/MS', settle:null}, 'İY/MS 2/X':{g:'İY/MS', settle:null},
  'İY/MS 2/2':{g:'İY/MS', settle:null},

  /* ── diğer ── */
  'Doğru Skor':{g:'Diğer', settle:null},
  'Handikap':{g:'Handikap', settle:null},
  'Asya Handikap':{g:'Handikap', settle:null},
  'İlk Golü Atan':{g:'Diğer', settle:null},
  'Oyuncu Gol Atar':{g:'Oyuncu', settle:null},
  'Oyuncu 2+ Gol':{g:'Oyuncu', settle:null},
  'Oyuncu Asist':{g:'Oyuncu', settle:null},
  'Kırmızı Kart':{g:'Kart', settle:null},
  'Penaltı':{g:'Diğer', settle:null},
  'Set Kazananı':{g:'Diğer', settle:null},
  'Çeyrek Kazananı':{g:'Diğer', settle:null},
  'Diğer':{g:'Diğer', settle:null}
};

/* Alt/Üst eşikleri tek tek yazılmaz, üretilir: toplam gol, korner,
   kart, ilk yarı ve takım bazlı varyantların hepsi aynı kalıptan. */
const THRESHOLDS = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5];
const CORNER_THR = [7.5, 8.5, 9.5, 10.5, 11.5, 12.5];
const CARD_THR = [1.5, 2.5, 3.5, 4.5, 5.5];
THRESHOLDS.forEach(v => {
  MARKETS[v + ' Üst'] = {g:'Alt / Üst', settle:(h,a)=>h+a>v};
  MARKETS[v + ' Alt'] = {g:'Alt / Üst', settle:(h,a)=>h+a<v};
  MARKETS['İY ' + v + ' Üst'] = {g:'İlk Yarı', settle:null};
  MARKETS['İY ' + v + ' Alt'] = {g:'İlk Yarı', settle:null};
  MARKETS['Ev Sahibi ' + v + ' Üst'] = {g:'Takım Golü', settle:(h)=>h>v};
  MARKETS['Ev Sahibi ' + v + ' Alt'] = {g:'Takım Golü', settle:(h)=>h<v};
  MARKETS['Deplasman ' + v + ' Üst'] = {g:'Takım Golü', settle:(h,a)=>a>v};
  MARKETS['Deplasman ' + v + ' Alt'] = {g:'Takım Golü', settle:(h,a)=>a<v};
});
CORNER_THR.forEach(v => {
  MARKETS['Korner ' + v + ' Üst'] = {g:'Korner', settle:null};
  MARKETS['Korner ' + v + ' Alt'] = {g:'Korner', settle:null};
});
CARD_THR.forEach(v => {
  MARKETS['Kart ' + v + ' Üst'] = {g:'Kart', settle:null};
  MARKETS['Kart ' + v + ' Alt'] = {g:'Kart', settle:null};
});

export const LEAGUES = {
  // mark + color → monogram arma (üst düzey ligler)
  // mark yok → yalnızca ülke bayrağı (alt kümeler, kadın ligleri, küçük ülkeler)
  // logo: 'https://…' → lisanslı gerçek logo kullanılacaksa buraya konur
  'Süper Lig':{c:'TR', cc:'TR', country:'Türkiye', top:1,
    teams:['Galatasaray','Fenerbahçe','Beşiktaş','Trabzonspor','Başakşehir','Adana Demirspor','Konyaspor','Kasımpaşa','Alanyaspor','Rizespor']},
  'Premier League':{c:'ENG', cc:'ENG', country:'İngiltere', top:1,
    teams:['Arsenal','Chelsea','Liverpool','Man City','Man United','Tottenham','Newcastle','Aston Villa','Brighton','West Ham']},
  'La Liga':{c:'ESP', cc:'ES', country:'İspanya', top:1,
    teams:['Real Madrid','Barcelona','Atletico Madrid','Sevilla','Real Sociedad','Villarreal','Betis','Valencia']},
  'Serie A':{c:'ITA', cc:'IT', country:'İtalya', top:1,
    teams:['Inter','Milan','Juventus','Napoli','Roma','Lazio','Atalanta','Fiorentina']},
  'Bundesliga':{c:'GER', cc:'DE', country:'Almanya', top:1,
    teams:['Bayern Münih','Dortmund','Leverkusen','Leipzig','Stuttgart','Frankfurt']},
  'Ligue 1':{c:'FRA', cc:'FR', country:'Fransa', top:1,
    teams:['PSG','Marsilya','Monaco','Lyon','Lille','Nice','Rennes']},
  'Eredivisie':{c:'NED', cc:'NL', country:'Hollanda', top:1,
    teams:['Ajax','PSV','Feyenoord','AZ Alkmaar','Twente','Utrecht']},
  'Şampiyonlar Ligi':{c:'UCL', cc:'EU', country:'Avrupa', top:1,
    teams:['Real Madrid','Bayern Münih','Man City','Inter','PSG','Benfica','Arsenal','Barcelona']},
  // ---- bayrak yeterli olan ligler ----
  'A-League Kadınlar':{c:'AUS', cc:'AU', country:'Avustralya',
    teams:['Sydney FC','Melbourne City','Perth Glory','Adelaide United','Brisbane Roar','Western United']},
  'Ekstraklasa':{c:'POL', cc:'PL', country:'Polonya',
    teams:['Legia','Lech Poznan','Rakow','Pogon Szczecin','Cracovia','Jagiellonia']},
  'Eliteserien':{c:'NOR', cc:'NO', country:'Norveç',
    teams:['Bodo/Glimt','Molde','Rosenborg','Brann','Viking','Lillestrom']},
  'Primeira Liga':{c:'POR', cc:'PT', country:'Portekiz',
    teams:['Benfica','Porto','Sporting','Braga','Vitoria SC','Boavista']}
};
export const TOP_LEAGUES = Object.keys(LEAGUES).filter(k => LEAGUES[k].top);
export const MINOR_LEAGUES = Object.keys(LEAGUES).filter(k => !LEAGUES[k].top);
