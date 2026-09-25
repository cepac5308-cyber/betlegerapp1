/* Türkiye'de yaygın kupon ekran düzenleri. Site adı geçmiyor —
   yalnızca yerleşim ve dil kalıpları. OCR çıktısı gibi düz metin. */
export const CASES = [
{ ad: 'klasik dikey, iki nokta üstü', text:
`Kupon Detayı
18.09.2026 20:14 - Kupon No: 87018740597
Galatasaray - Fenerbahçe
Türkiye Süper Lig - 20:00
Maç Sonucu: MS1 1,55
Arsenal - Chelsea
İngiltere Premier Lig - 22:00
Karşılıklı Gol: Var 1,42
Toplam Oran 2,20
Bahis Tutarı 250,00 TL`,
  exp: { stake: 250, legs: [['Galatasaray','Fenerbahçe','MS 1',1.55], ['Arsenal','Chelsea','KG Var',1.42]] } },

{ ad: 'sağ sütunda oran, tek maç', text:
`Tek Maç - 18.09.2026
Beşiktaş - Trabzonspor 2,10
Süper Lig
Çifte Şans 1X
Miktar ₺1.200
Potansiyel Kazanç ₺2.520`,
  exp: { stake: 1200, legs: [['Beşiktaş','Trabzonspor','Çifte Şans 1X',2.10]] } },

{ ad: 'VS ayırıcı, doğru skor, nokta ondalık', text:
`Oranlar: 7
Bahis tutarı: 160.71 ₺
Potansiyel kazançlar: 1124.97 ₺
Statü: Kabul edildi
Futbol. İngiltere Şampiyonası. Premier Lig
18.09.2026 (22:00)
Brentford VS Chelsea
Doğru skor. 1-1 7
Statü: Kabul edildi`,
  exp: { stake: 160.71, legs: [['Brentford','Chelsea','Doğru Skor',7]] } },

{ ad: 'takımlar ayrı satırda', text:
`KOMBİNE 3
Lazio
Roma
Serie A · 21:45
2,5 Üst
1,72
Napoli
Inter
Serie A · 19:00
Maç Sonucu 2
2,45
Yatırılan Tutar: 300 TL
Toplam Oran: 4,21`,
  exp: { stake: 300, legs: [['Lazio','Roma','2.5 Üst',1.72], ['Napoli','Inter','MS 2',2.45]] } },

{ ad: 'kısa etiketler, tire ayırıcı', text:
`Sivasspor – Konyaspor
MS X
3.40
Tutar 500
Oran 3.40`,
  exp: { stake: 500, legs: [['Sivasspor','Konyaspor','MS X',3.40]] } },

{ ad: 'İngilizce arayüz', text:
`Bet Slip
Liverpool - Everton
Premier League
Both Teams To Score - Yes
1.66
Stake: 750.00
Total Odds: 1.66
Potential Return: 1245.00`,
  exp: { stake: 750, legs: [['Liverpool','Everton','KG Var',1.66]] } },

{ ad: 'handikap ve ilk yarı', text:
`Kombine 2
Bayern Münih - Dortmund
Bundesliga
Handikap (-1) 1
1,95
Ajax - PSV
Eredivisie
İlk Yarı Sonucu 1
2,30
Bahis tutarı 180,00 ₺`,
  exp: { stake: 180, legs: [['Bayern Münih','Dortmund','Handikap',1.95], ['Ajax','PSV','İlk Yarı 1',2.30]] } },

{ ad: 'alt bahis, boşluklu sayı', text:
`Marsilya - Lyon
Ligue 1 21:00
2,5 Alt
1,80
Bahis Tutarı 1 500,00 TL
Toplam oran 1,80`,
  exp: { stake: 1500, legs: [['Marsilya','Lyon','2.5 Alt',1.80]] } },

{ ad: 'oran satır başında', text:
`Porto - Benfica
Primeira Liga
1,58 Maç Sonucu 1
Tutar: 420 TL`,
  exp: { stake: 420, legs: [['Porto','Benfica','MS 1',1.58]] } },

{ ad: 'toplam gol ve korner', text:
`Kombine
Rangers - Celtic
Toplam Gol 2-3
2,10
Basel - Young Boys
Korner 9,5 Üst
1,85
Miktar: 250,00
Toplam Oran: 3,89`,
  exp: { stake: 250, legs: [['Rangers','Celtic','2-3 Gol',2.10], ['Basel','Young Boys','Korner 9.5 Üst',1.85]] } },

{ ad: 'yıldız ve nokta gürültüsü', text:
`* KUPON *
. Fenerbahçe - Başakşehir .
. Süper Lig .
. KG Yok . 1,95 .
. Bahis Tutarı . 600,00 TL .`,
  exp: { stake: 600, legs: [['Fenerbahçe','Başakşehir','KG Yok',1.95]] } },

{ ad: 'çifte şans X2 ve 3.5 üst', text:
`Villarreal - Sevilla
La Liga
Çifte Şans X-2
1,48
Leeds - Norwich
Championship
3,5 Üst
2,60
Bahis tutarı: 90 TL`,
  exp: { stake: 90, legs: [['Villarreal','Sevilla','Çifte Şans X2',1.48], ['Leeds','Norwich','3.5 Üst',2.60]] } }
,
{ ad: 'alt/üst eşikleri', text:
`Chelsea - Arsenal
1,5 Üst
1,25
Milan - Juventus
4,5 Alt
1,30
Ajax - Feyenoord
0,5 Üst
1,08
Bahis tutarı 200 TL`,
  exp: { stake: 200, legs: [['Chelsea','Arsenal','1.5 Üst',1.25], ['Milan','Juventus','4.5 Alt',1.30], ['Ajax','Feyenoord','0.5 Üst',1.08]] } },

{ ad: 'İY/MS ve ilk yarı alt üst', text:
`Kombine 2
Roma - Lazio
İY/MS 1/1
4,20
Porto - Sporting
İlk Yarı 1,5 Alt
1,55
Tutar: 150`,
  exp: { stake: 150, legs: [['Roma','Lazio','İY/MS 1/1',4.20], ['Porto','Sporting','İY 1.5 Alt',1.55]] } },

{ ad: 'takım golü ve tek çift', text:
`Bayern - Leipzig
Ev Sahibi 1,5 Üst
1,62
Lille - Rennes
Toplam Gol Tek
1,90
Miktar 400 TL`,
  exp: { stake: 400, legs: [['Bayern','Leipzig','Ev Sahibi 1.5 Üst',1.62], ['Lille','Rennes','Toplam Gol Tek',1.90]] } },

{ ad: 'kart ve kırmızı kart', text:
`Sevilla - Betis
Kart 4,5 Üst
1,75
Atletico - Valencia
Kırmızı Kart Var
4,50
Bahis Tutarı: 120,00`,
  exp: { stake: 120, legs: [['Sevilla','Betis','Kart 4.5 Üst',1.75], ['Atletico','Valencia','Kırmızı Kart',4.50]] } },

{ ad: 'beraberlikte iade ve çifte şans 12', text:
`Napoli - Fiorentina
Beraberlikte İade 1
1,45
Genoa - Torino
Çifte Şans 1-2
1,28
Tutar 600`,
  exp: { stake: 600, legs: [['Napoli','Fiorentina','Beraberlikte İade 1',1.45], ['Genoa','Torino','Çifte Şans 12',1.28]] } },

{ ad: 'İngilizce alt üst ve btts', text:
`Manchester City - Tottenham
Over 3.5
2.05
Aston Villa - Brighton
BTTS - No
2.30
Stake: 95.00`,
  exp: { stake: 95, legs: [['Manchester City','Tottenham','3.5 Üst',2.05], ['Aston Villa','Brighton','KG Yok',2.30]] } },

{ ad: 'oyuncu bahisleri ve deplasman golü', text:
`Real Madrid - Girona
Oyuncu 2+ Gol
3,80
Osasuna - Cadiz
Deplasman 0,5 Üst
1,40
Yatırılan 250 TL`,
  exp: { stake: 250, legs: [['Real Madrid','Girona','Oyuncu 2+ Gol',3.80], ['Osasuna','Cadiz','Deplasman 0.5 Üst',1.40]] } },

{ ad: 'korner eşiği ve asya handikap', text:
`Benfica - Braga
Korner 10,5 Üst
1,92
Celta - Alaves
Asya Handikap -0,5
1,88
Bahis tutarı 310,00 TL`,
  exp: { stake: 310, legs: [['Benfica','Braga','Korner 10.5 Üst',1.92], ['Celta','Alaves','Asya Handikap',1.88]] } }

];
