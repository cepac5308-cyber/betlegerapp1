# BetLedger — React Native

Hesaplama motoru web sürümüyle **birebir aynı kod**: `src/engine` klasörü
olduğu gibi taşındı, tek satırı değişmedi. Arayüz React Native ile yeniden yazıldı.

---

## Kurulum

```bash
npm install
```

## Expo Go ile çalıştırma (hızlı bakış)

```bash
npx expo start
```

Expo Go'da her şey çalışır, **kupon okuma hariç**. Sebebi: metin tanıma native
bir modül ve Expo Go'ya sonradan native modül eklenemez. Uygulama bunu fark eder
ve okuma butonuna basınca elle girişe yönlendirir.

## GitHub Actions ile APK (Android Studio gerekmez)

Depoyu GitHub'a yükle, dört secret'ı gir (`KEYSTORE_B64`, `KEYSTORE_PASSWORD`,
`KEY_ALIAS`, `KEY_PASSWORD` — web sürümündekilerin aynısı), sonra
**Actions → Android derle → Run workflow**.

İş akışı sırayla: bağımlılıkları kurar, beş test paketini çalıştırır (biri
kırmızıysa derleme durur), `expo prebuild` ile native projeyi üretir, sürüm
numarasını etiketten alır, imzalı APK ve AAB üretir. Artefaktlar
`betledger-apk` ve `betledger-aab` adıyla indirilir.

## Geliştirme derlemesi (yerel geliştirme için)

Kupon okuma dahil her şeyin çalışması için bir kez kendi test uygulamanı
derlemen gerekiyor. Bilgisayarına Android Studio kurman gerekmez, derleme
bulutta yapılır.

```bash
npm i -g eas-cli
eas login
eas build:configure
npm run build:dev          # eas build --profile development --platform android
```

Derleme bitince EAS bir APK bağlantısı verir. Onu telefonuna kur — artık Expo Go
yerine bu uygulamayı kullanacaksın. Sonrasında geliştirme akışı aynı:

```bash
npx expo start --dev-client
```

QR'ı bu uygulamayla okut, kod değişiklikleri anında yansır. Bu adımı yalnızca
native bağımlılık eklediğinde tekrarlarsın.

## Yayın derlemesi

```bash
npm run build:prod         # Play Store için .aab
```

---

## Kupon okuma

Google ML Kit kullanıyor: görüntü telefondan çıkmaz, internet gerekmez, sonuç
anında gelir. Okunan metni `src/engine/parser.js` yapılandırılmış veriye çevirir.

Ayrıştırıcı Türkçe kupon dilini tanır: "Maç Sonucu: MS 1", "Karşılıklı Gol: Var",
"Alt/Üst 2,5: Üst", "Çifte Şans 1X", "Doğru skor". Takım ayırıcı olarak hem tire
hem "VS" kabul eder, ondalıksız oranları ve hem nokta hem virgüllü tutarları okur.
Bulamadığı alanı uydurmaz — boş bırakır ve o satırı düşük güvenle işaretler,
onay ekranında sarı rozetle görünür.

### Düzen bağımsızlığı

Ayrıştırıcı hiçbir bahis sitesinin adını tanımaz ve tanımamalı — düzen tanır.
Takım satırı, bahis türü, oran ve tutar nerede durursa dursun bulunur, bu yüzden
görüntünün hangi siteden geldiği fark etmez.

Tanıdığı yerleşimler: tek satırda ayırıcı (`-`, `–`, `VS`, `v.`), takımların
ardışık satırlarda olması, oranın sağ sütunda, kendi satırında veya satır başında
durması. Tutar etiketleri: "Bahis Tutarı", "Tutar", "Miktar", "Yatırılan",
"Stake", "Bet Amount". Sayı biçimleri: `1.200,50`, `160.71`, `1 500,00`.
Tutar hiç yoksa toplam oran ile potansiyel kazançtan geri hesaplanır.

### Bahis türleri

Katalogda **125 tür** var. Eşik değerli türler tek tek yazılmadı, üretiliyor:
alt/üst 0,5'ten 6,5'e, korner 7,5–12,5, kart 1,5–5,5, ilk yarı ve takım bazlı
varyantlar. Ayrıştırıcı eşiği metinden okuyup doğru anahtarı kuruyor, yani
"Korner 12,5 Alt" gibi listede tek tek aranmayan bir kombinasyon da tanınıyor.

Kapsam: maç sonucu, çifte şans (1X, 12, X2), beraberlikte iade, karşılıklı gol,
gol olur/olmaz, alt/üst tüm eşikler, toplam gol aralıkları (0-1, 2-3, 4-5, 6+),
tek/çift, ilk yarı sonucu, İY/MS dokuz kombinasyon, ilk yarı alt/üst, takım gol
sayısı (ev sahibi ve deplasman ayrı), doğru skor, handikap, asya handikap,
korner, kart, kırmızı kart, ilk golü atan, oyuncu golü ve asisti, penaltı,
her iki yarıda gol, set ve çeyrek bahisleri. Hepsinin İngilizce karşılıkları da
tanınıyor (Over/Under, BTTS, Double Chance, Match Result, Correct Score).

**58 tür skordan otomatik sonuçlanıyor**, 67'si elle işaretleniyor. Skordan
hesaplanamayan bir türü uygulama asla otomatik kapatmaz — korner, kart, ilk yarı
ve oyuncu bahisleri maç sonucundan çıkarılamaz, bunlar için sonucu sen girersin.

20 farklı kupon düzeninde 176 alanın 176'sı doğru (`npm run test:slips`),
gerçek görüntülerle uçtan uca 44 alanın 42'si. Sonuçlandırma kuralları için ayrı
41 kontrol (`npm run test:markets`).

---

## Arayüz zanaatı

Bir uygulamayı "şablon" gösteren şey özellik eksikliği değil, bu ayrıntıların
yokluğu. Eklenenler:

**Tipografi** — sistem fontu yerine Sora (başlık ve rakamlar) ve Plus Jakarta
Sans (gövde). 12 basamaklı bir ölçek var, ara boy yok; rakamlar tabular, yani
tablolarda sütunlar kaymıyor. Bileşenlerde tek bir sabit `fontSize` kalmadı.

**Hareket** — hiçbiri süs değil. Kasa tutarı sayarak artıyor, böylece değişimin
büyüklüğü hissediliyor. Kartlar 55 ms arayla sırayla giriyor, göz yukarıdan
aşağı okuyor. Basılan her şey hafifçe küçülüyor. Süreler 200–420 ms arasında.

**Boş durumlar** — gri yazı değil: ikon, sebep ve çıkış yolu. "Bekleyen bahsin
yok" diyor, neden boş olduğunu açıklıyor ve kupon ekleme butonu sunuyor.

**Yükleme** — beyaz ekran yerine nabız gibi atan iskelet kartlar. Font yüklenene
kadar açılış ekranı kapanmıyor, yazılar zıplamıyor.

**Mikro etkileşim** — aşağı çekip yenileme dört ekranda, kupona basılı tutunca
hızlı sonuç işaretleme, sekme ve kayıt işlemlerinde dokunsal geri bildirim.

Bunların bozulmadığını `npm run test:ui` denetliyor: sabit font boyutu kalmış mı,
kaç ekranda sıralı giriş var, boş durumlar açıklamalı mı.

## Ekranlar

**Pano** — kasa kartı ve eğrisi, bugünkü özet, disiplin skoru, tilt sinyali, mola

**Bahisler** — filtreler, kupon listesi, dönem özeti

**Kupon ekleme** — görüntüden okuma veya elle giriş, çok seçimli kombine,
bahis öncesi kontrol paneli, gerekçe seçimi

**Analiz** — beş alt sekme: Özet, Profilim, Dağılımlar (8 boyut), Laboratuvar
(400 senaryolu simülasyon), Senaryolar (what-if)

**Hesap** — para giriş/çıkışı, hareketler, rozetler, dil, tema, örnek veri,
sorumlu kullanım, veri silme

Türkçe ve İngilizce, açık ve koyu tema, veriler AsyncStorage ile cihazda.

---

## Testler

```bash
npm test               # motor değişmezleri — 30 kontrol
node logic.test.mjs    # ekranların kullandığı motor çağrıları — 15 kontrol
node screens.test.mjs  # dağılım, laboratuvar, senaryo — 17 kontrol
node markets.test.mjs  # sonuçlandırma kuralları — 41 kontrol
node slips.test.mjs    # 20 kupon düzeni — 176 alan
node parser.test.mjs   # kupon ayrıştırıcı — 28 alan
node ui.test.mjs       # arayüz bütünlüğü — 16 kontrol
```

---

## Yapı

```
App.js                tüm ekranlar, durum yönetimi, kalıcılık
src/engine/           hesaplama motoru (web ile birebir aynı)
  parser.js           kupon metni → yapılandırılmış veri
  ocr.js              ML Kit sarmalayıcı, modül yoksa zarifçe düşer
src/ui/kit.js         kart, buton, segment, sinyal bileşenleri
src/ui/icons.js       SVG ikon seti
src/ui/charts.js      kasa eğrisi, kadran, çubuk grafik
src/ui/strings.js     Türkçe ve İngilizce metinler
```
