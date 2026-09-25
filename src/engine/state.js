/* Tek durum referansı. Üretimde Supabase'den yüklenir. */
/* ---------- durum ---------- */
export let S = null;
export let TAB = 'home';
export let FILTER = 'all';
export let GROUP = 'date';
export let PERIOD = 30;

export function freshState() {
  return {
    user: {currency: 'TRY', unitValue: 1000, riskLimit: 10, premium: false, name: 'CePac',
      limits: null, ddAlert: 20, coolEnabled: false, _ddNotified: null},
    bankroll: {initial: 10000},
    coupons: [],   // {id,type,stake,createdAt,note,source,settledAt}
    bets: [],      // {id,couponId,league,home,away,market,odds,status,score,kickoff}
    tx: [],        // {id,type,amount,at,ref}
    notifs: [],    // {id,at,type,title,body,betId,read}
    cooldown: {until: 0, started: 0, minutes: 0}
  };
}


export function setState(next) { S = next; return S; }
export function snapshot() { return JSON.parse(JSON.stringify(S)); }
