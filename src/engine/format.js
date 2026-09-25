import { S } from './state.js';
/* ---------- yardımcılar ---------- */
export const CUR = {TRY:'₺', USD:'$', EUR:'€', GBP:'£'};
export const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const money = (n, sign) => {
  const s = (sign && n > 0 ? '+' : n < 0 ? '−' : '') + CUR[S.user.currency] +
    Math.abs(n).toLocaleString('tr-TR', {maximumFractionDigits: Math.abs(n) < 100 ? 2 : 0});
  return s;
};
export const pct = (n, sign) => (sign && n > 0 ? '+' : '') + n.toFixed(1).replace('.', ',') + '%';
export const dayKey = d => new Date(d).toISOString().slice(0, 10);
export const fmtDate = d => new Date(d).toLocaleDateString('tr-TR', {day: 'numeric', month: 'long'});
export const fmtShort = d => new Date(d).toLocaleDateString('tr-TR', {day: '2-digit', month: '2-digit'});
export const todayKey = () => dayKey(Date.now());
export const uid = (() => { let i = 1000; return () => 'x' + (++i); })();
export const clsOf = n => n > 0 ? 'pos' : n < 0 ? 'neg' : 'muted';

