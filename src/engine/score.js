import { S } from './state.js';
import { money, pct, dayKey } from './format.js';
import { riskPct, detectChasing } from './bankroll.js';
/* ============================================================
   DİSİPLİN SKORU — 0–1000, tamamen kural tabanlı
   Bahis hacmini değil, para yönetimi davranışını ölçer.
   ============================================================ */
export function discipline() {
  const last = S.coupons.slice(-30);
  const f = [];
  const clamp = x => Math.max(0, Math.min(1, x));

  const over = last.filter(c => riskPct(c.stake) > S.user.riskLimit).length;
  f.push({k: 'Risk limitine uyum', v: last.length ? 1 - over / last.length : 1, w: .30,
    d: over ? `Son ${last.length} kuponun ${over} tanesi limitini aştı` : 'Son kuponlarında limit aşımı yok'});

  const ch = detectChasing();
  f.push({k: 'Kayıp kovalamama', v: ch ? clamp(1 - ch.rise / 120) : 1, w: .25,
    d: ch ? `Kayıptan sonra tutar %${ch.rise.toFixed(0)} yükseliyor` : 'Kayıp sonrası tutar artışı görünmüyor'});

  const stk = last.map(c => c.stake);
  const m = stk.length ? stk.reduce((a, b) => a + b, 0) / stk.length : 0;
  const sd = stk.length ? Math.sqrt(stk.reduce((s, x) => s + (x - m) ** 2, 0) / stk.length) : 0;
  f.push({k: 'Tutar istikrarı', v: m ? clamp(1 - (sd / m) / 1.1) : 1, w: .20,
    d: `Ortalama ${money(m)}, sapma ${money(sd)}`});

  const days = new Set(S.coupons.filter(c => c.createdAt > Date.now() - 30 * 86400000)
    .map(c => dayKey(c.createdAt))).size;
  f.push({k: 'Kayıt düzeni', v: clamp(days / 16), w: .15, d: `Son 30 günde ${days} gün kayıt tuttun`});

  const mxp = last.length ? Math.max(...last.map(c => riskPct(c.stake))) : 0;
  f.push({k: 'En yüksek tek risk', v: clamp(1 - mxp / (S.user.riskLimit * 2.5)), w: .10,
    d: `En büyük kupon kasanın %${mxp.toFixed(1).replace('.', ',')}'i kadardı`});

  const score = Math.round(1000 * f.reduce((s, x) => s + x.v * x.w, 0));
  const band = score >= 800 ? {t: 'Çok iyi', c: 'var(--pos)'}
    : score >= 620 ? {t: 'İyi', c: 'var(--pos)'}
    : score >= 440 ? {t: 'Gelişmeye açık', c: 'var(--warn)'}
    : {t: 'Riskli', c: 'var(--neg)'};
  return {score, band, factors: f};
}

