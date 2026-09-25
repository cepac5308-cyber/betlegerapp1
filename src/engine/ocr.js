/* ============================================================
   KUPON OKUMA — cihaz üzerinde, Google ML Kit
   Görüntü telefondan çıkmaz, internet gerekmez, sonuç anında
   gelir. Native modül olduğu için geliştirme derlemesi gerekir;
   Expo Go'da modül bulunamaz ve uygulama elle girişe düşer.
   ============================================================ */
import { parseSlip } from './parser.js';

let mod;
try { mod = require('@react-native-ml-kit/text-recognition').default; } catch (e) { mod = null; }

export const ocrAvailable = () => !!mod;

/* uri: expo-image-picker'dan gelen dosya yolu */
export async function readSlipFromUri(uri) {
  if (!mod) { const e = new Error('modul-yok'); e.code = 'modul-yok'; throw e; }
  const res = await mod.recognize(uri);
  const text = (res && res.text) || '';
  if (!text.trim()) { const e = new Error('metin-yok'); e.code = 'metin-yok'; throw e; }
  return { text, parsed: parseSlip(text) };
}
