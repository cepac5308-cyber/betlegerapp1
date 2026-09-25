/* Arayüz bütünlüğü: font, metin ve hareket katmanı */
import { readFileSync } from 'fs';
let ok=0; const bad=[];
const T=(n,c,d)=>{ if(c) ok++; else bad.push(n+(d?' → '+d:'')); };
const app = readFileSync('App.js','utf8');
const kit = readFileSync('src/ui/kit.js','utf8');
const type = readFileSync('src/ui/type.js','utf8');
const motion = readFileSync('src/ui/motion.js','utf8');

T('tipografi ölçeği tanımlı', /export const T = \{/.test(type));
T('tüm bileşenler ölçeği kullanıyor', (kit.match(/T\.\w+/g)||[]).length >= 10);
T('sabit fontSize kalmadı (kit)', (kit.match(/fontSize: \d/g)||[]).length <= 2,
  (kit.match(/fontSize: \d+/g)||[]).join(','));
T('sabit fontWeight kalmadı (kit)', !/fontWeight: '[0-9]/.test(kit));
T('font yükleniyor', /Font\.loadAsync/.test(app));
T('açılış ekranı font beklenene kadar duruyor', /preventAutoHideAsync/.test(app) && /hideAsync/.test(app));
T('font gelmeden iskelet gösteriliyor', /CardSkeleton/.test(app));
T('sayan rakam kullanılıyor', /<CountUp/.test(app));
T('kartlar sıralı giriyor', (app.match(/<Enter/g)||[]).length >= 8, (app.match(/<Enter/g)||[]).length+' yer');
T('basınca yaylanma var', /<Press/.test(app));
T('aşağı çekip yenileme var', (app.match(/RefreshControl/g)||[]).length >= 4);
T('uzun basınca hızlı sonuç', /onLongPress=\{quick\}/.test(app));
T('boş durumlar açıklamalı', (app.match(/<EmptyState/g)||[]).length >= 2);
T('dokunsal geri bildirim', /Haptics/.test(app) && /bump\(/.test(app));
T('hareket süreleri kısa', !/duration: [1-9]\d{3}/.test(motion));
T('gerçek ikon seti', /from '\.\/src\/ui\/icons'/.test(app) && !/borderRadius: 6, marginBottom: 4/.test(app));

console.log(`ARAYÜZ BÜTÜNLÜĞÜ: ${ok} geçti, ${bad.length} kaldı`);
bad.forEach(b=>console.log('  ✗ '+b));
process.exit(bad.length?1:0);
