import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Modal, useColorScheme,
  SafeAreaView, StatusBar, Alert, StyleSheet, Platform, ActivityIndicator, RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';

import * as E from './src/engine/index.js';
import { S, setState, freshState } from './src/engine/state.js';
import { seedDemo } from './src/engine/demo.js';
import { setNotifier } from './src/engine/notify.js';
import { light, dark, ThemeCtx, Card, CardHead, KV, Strip, Btn, Seg, Chip, Signal, Empty, Note, useC } from './src/ui/kit';
import { AreaChart, Gauge, Bars } from './src/ui/charts';
import { makeT } from './src/ui/strings';
import { T, F } from './src/ui/type';
import { CountUp, Enter, Press, Skeleton, CardSkeleton, EmptyState } from './src/ui/motion';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import {
  PlusJakartaSans_400Regular, PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold
} from '@expo-google-fonts/plus-jakarta-sans';

SplashScreen.preventAutoHideAsync().catch(() => {});
import { Icon } from './src/ui/icons';
import { readSlipFromUri, ocrAvailable } from './src/engine/ocr.js';
import * as Haptics from 'expo-haptics';

const tap = () => { try { Haptics.selectionAsync(); } catch (e) {} };
const bump = ok => { try {
  Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
} catch (e) {} };

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false })
});

const KEY = 'betledger.rn.v1';
const CURS = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' };

/* ── Biçimlendirme: Intl'e bağımlı değil, Hermes'te de çalışır ── */
const group = n => {
  const [a, b] = Math.abs(n).toFixed(Math.abs(n) < 100 && n % 1 !== 0 ? 2 : 0).split('.');
  return a.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (b ? ',' + b : '');
};
const makeMoney = cur => (n, sign) =>
  (sign && n > 0 ? '+' : n < 0 ? '−' : '') + (CURS[cur] || '₺') + group(n || 0);
const pctS = (n, sign) => (sign && n > 0 ? '+' : '') + (n || 0).toFixed(1).replace('.', ',') + '%';

export default function App() {
  const sys = useColorScheme();
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const [lang, setLang] = useState('tr');
  const [theme, setTheme] = useState('auto');
  const [tab, setTab] = useState('home');
  const [onboard, setOnboard] = useState(true);
  const [modal, setModal] = useState(null);
  const [fonts, setFonts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(() => setTick(t => t + 1), []);
  const t = useMemo(() => makeT(lang), [lang]);
  const scheme = theme === 'auto' ? (sys === 'dark' ? 'dark' : 'light') : theme;
  const c = scheme === 'dark' ? dark : light;
  const money = useMemo(() => makeMoney(S && S.user ? S.user.currency : 'TRY'), [tick, ready]);

  useEffect(() => {
    Font.loadAsync({
      Sora_600SemiBold, Sora_700Bold,
      PlusJakartaSans_400Regular, PlusJakartaSans_500Medium,
      PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold
    }).catch(() => {}).finally(() => setFonts(true));
  }, []);

  /* ── kalıcılık ── */
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (d && d.s) {
            setState(d.s);
            S.notifs = S.notifs || [];
            S.cooldown = S.cooldown || { until: 0, started: 0, minutes: 0 };
            setOnboard(!d.onboarded);
            if (d.lang) setLang(d.lang);
            if (d.theme) setTheme(d.theme);
          }
        } else setState(freshState());
      } catch (e) { setState(freshState()); }
      setNotifier(() => {});
      setReady(true);
    })();
  }, []);

  const persist = useCallback((extra = {}) => {
    AsyncStorage.setItem(KEY, JSON.stringify({
      v: 1, s: S, onboarded: !onboard, lang, theme, ...extra
    })).catch(() => {});
  }, [onboard, lang, theme]);

  useEffect(() => { if (ready) persist(); }, [tick, ready, lang, theme, onboard]);

  useEffect(() => { if (ready && fonts) SplashScreen.hideAsync().catch(() => {}); }, [ready, fonts]);

  if (!ready || !fonts) return (
    <View style={{ flex: 1, backgroundColor: scheme === 'dark' ? dark.bg : light.bg, padding: 14, paddingTop: 60 }}>
      <ThemeCtx.Provider value={c}><><CardSkeleton /><CardSkeleton /><CardSkeleton /></></ThemeCtx.Provider>
    </View>
  );

  const askNotif = useCallback(async () => {
    try {
      const cur = await Notifications.getPermissionsAsync();
      if (cur.granted) return true;
      const r = await Notifications.requestPermissionsAsync();
      return !!r.granted;
    } catch (e) { return false; }
  }, []);

  const scheduleBreakEnd = useCallback(async (minutes) => {
    try {
      const ok = await askNotif();
      if (!ok) return false;
      await Notifications.scheduleNotificationAsync({
        content: { title: t('appName'), body: t('breakOn') + ' → ' + t('takeBreak') },
        trigger: { seconds: Math.max(5, minutes * 60) }
      });
      return true;
    } catch (e) { return false; }
  }, [t, askNotif]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => { refresh(); setRefreshing(false); }, 450);
  }, [refresh]);

  const ctx = { t, c, money, refresh, setModal, lang, setLang, theme, setTheme, scheme,
    askNotif, scheduleBreakEnd, refreshing, onRefresh };

  return (
    <ThemeCtx.Provider value={c}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        {onboard ? (
          <Onboarding ctx={ctx} done={() => { setOnboard(false); refresh(); }} />
        ) : (
          <>
            <View style={{ flex: 1 }}>
              {tab === 'home' && <Home ctx={ctx} />}
              {tab === 'bets' && <Bets ctx={ctx} />}
              {tab === 'stats' && <Stats ctx={ctx} />}
              {tab === 'acc' && <Account ctx={ctx} reset={() => setOnboard(true)} />}
            </View>
            <TabBar ctx={ctx} tab={tab} setTab={setTab} />
          </>
        )}
        <Sheets ctx={ctx} modal={modal} />
      </SafeAreaView>
    </ThemeCtx.Provider>
  );
}

/* ══════════════ ALT MENÜ ══════════════ */
function TabBar({ ctx, tab, setTab }) {
  const { c, t, setModal } = ctx;
  const items = [['home', t('tabHome'), 'home'], ['bets', t('tabBets'), 'list'], ['add', '', 'plus'],
    ['stats', t('tabStats'), 'chart'], ['acc', t('tabAcc'), 'user']];
  return (
    <View style={{
      flexDirection: 'row', backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.hair,
      paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 20 : 10
    }}>
      {items.map(([k, l, ic]) => k === 'add' ? (
        <Pressable key={k} onPress={() => { tap(); setModal({ type: 'add' }); }}
          style={{ flex: 1, alignItems: 'center' }}>
          <View style={{
            width: 48, height: 48, borderRadius: 24, backgroundColor: c.accent,
            alignItems: 'center', justifyContent: 'center', marginTop: -18,
            borderWidth: 4, borderColor: c.surface,
            shadowColor: c.accent, shadowOpacity: .3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
            elevation: 5
          }}>
            <Icon name="plus" color="#fff" size={24} />
          </View>
          <Text style={{ fontSize: 10, color: c.faint, marginTop: 3 }}>{t('tabAdd')}</Text>
        </Pressable>
      ) : (
        <Pressable key={k} onPress={() => { tap(); setTab(k); }}
          style={{ flex: 1, alignItems: 'center', paddingVertical: 2 }}>
          <Icon name={ic} color={tab === k ? c.accent : c.dim} size={21} filled={tab === k} />
          <Text style={{ fontSize: 10.5, fontWeight: '600', marginTop: 3,
            color: tab === k ? c.accent : c.faint }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ══════════════ KURULUM ══════════════ */
function Onboarding({ ctx, done }) {
  const { c, t, money } = ctx;
  const [step, setStep] = useState(0);
  const [bank, setBank] = useState('10000');
  const [cur, setCur] = useState('TRY');
  const [unit, setUnit] = useState('1000');
  const [risk, setRisk] = useState(10);

  const finish = () => {
    const b = Math.max(1, parseFloat(bank) || 10000);
    const st = freshState();
    st.user.currency = cur;
    st.user.unitValue = Math.max(1, parseFloat(unit) || Math.round(b / 10));
    st.user.riskLimit = risk;
    st.bankroll.initial = b;
    st.tx.push({ id: E.uid(), type: 'init', amount: b, at: Date.now(), ref: null });
    setState(st);
    done();
  };

  const row = (a, b2) => (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hair }}>
      <View style={{ width: 4, borderRadius: 2, backgroundColor: c.accent }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', color: c.text, fontSize: 13.5, marginBottom: 3 }}>{a}</Text>
        <Text style={{ color: c.muted, fontSize: 12.5, lineHeight: 18 }}>{b2}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 18 }}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={{
            width: i === step ? 26 : 18, height: 3, borderRadius: 2,
            backgroundColor: i === step ? c.accent : c.hair
          }} />
        ))}
      </View>
      <Card>
        {step === 0 && (<>
          <Text style={{ fontSize: 20, fontWeight: '700', color: c.text, marginBottom: 8 }}>{t('obTitle1')}</Text>
          <Text style={{ color: c.muted, fontSize: 13.5, lineHeight: 20, marginBottom: 6 }}>{t('obLead1')}</Text>
          {row(t('obP1a'), t('obP1b'))}
          {row(t('obP2a'), t('obP2b'))}
          {row(t('obP3a'), t('obP3b'))}
        </>)}
        {step === 1 && (<>
          <Text style={{ fontSize: 20, fontWeight: '700', color: c.text, marginBottom: 8 }}>{t('obTitle2')}</Text>
          <Text style={{ color: c.muted, fontSize: 13.5, lineHeight: 20, marginBottom: 14 }}>{t('obLead2')}</Text>
          <Field ctx={ctx} label={t('amount')} value={bank} onChange={setBank} numeric />
          <Text style={{ color: c.faint, fontSize: 12, marginBottom: 8 }}>{t('currency')}</Text>
          <Seg items={Object.keys(CURS).map(k => [k, k])} value={cur} onChange={v => { setCur(v); }} />
        </>)}
        {step === 2 && (<>
          <Text style={{ fontSize: 20, fontWeight: '700', color: c.text, marginBottom: 8 }}>{t('obTitle3')}</Text>
          <Text style={{ color: c.muted, fontSize: 13.5, lineHeight: 20, marginBottom: 14 }}>{t('obLead3')}</Text>
          <Field ctx={ctx} label={t('unitValue')} value={unit} onChange={setUnit} numeric />
          <Text style={{ color: c.faint, fontSize: 12, marginBottom: 8 }}>{t('riskLimit')}</Text>
          <Seg items={[2, 5, 10, 20, 30].map(v => [v, '%' + v])} value={risk} onChange={setRisk} />
          <View style={{ marginTop: 14 }}>
            {[3, 5, 10].map(n => {
              const w = (Math.pow(1 + risk / 100 * 0.6, n) - 1) * 100;
              const l = (1 - Math.pow(1 - risk / 100, n)) * 100;
              return <KV key={n} k={`${n} × ${t('tabBets').toLowerCase()}`}
                v={`+${w.toFixed(0)}% / −${l.toFixed(0)}%`} />;
            })}
            <Note>{t('streakNote')}</Note>
          </View>
        </>)}
        {step === 3 && (<>
          <Text style={{ fontSize: 20, fontWeight: '700', color: c.text, marginBottom: 8 }}>{t('obTitle4')}</Text>
          <Text style={{ color: c.muted, fontSize: 13.5, lineHeight: 20 }}>{t('obLead4')}</Text>
          <Note>{t('noOcr')}</Note>
          <Note>{t('dataNote')}</Note>
        </>)}
      </Card>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        {step > 0 && <Btn title={t('back')} onPress={() => setStep(step - 1)} style={{ width: 110 }} />}
        <Btn kind="primary" style={{ flex: 1 }} title={step === 3 ? t('start') : t('next')}
          onPress={() => step === 3 ? finish() : setStep(step + 1)} />
      </View>
      {step === 0 && <Btn title={t('skip')} onPress={finish} style={{ marginTop: 10, borderWidth: 0 }} />}
    </ScrollView>
  );
}

/* ── Giriş alanı ── */
function Field({ ctx, label, value, onChange, numeric, placeholder }) {
  const { c } = ctx;
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={{ color: c.faint, fontSize: 12, marginBottom: 6 }}>{label}</Text> : null}
      <TextInput
        value={String(value)} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={c.dim}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        style={{
          borderWidth: 1, borderColor: c.hair, borderRadius: 10, paddingHorizontal: 12,
          paddingVertical: 10, color: c.text, fontSize: 14, backgroundColor: c.surface
        }} />
    </View>
  );
}

/* ══════════════ PANO ══════════════ */
function Home({ ctx }) {
  const { c, t, money, setModal, refresh, refreshing, onRefresh } = ctx;
  const b = E.bankroll();
  const dn = E.dailyNet(null);
  const todayN = dn[E.todayKey()] || 0;
  const today = S.coupons.filter(x => E.dayKey(x.createdAt) === E.todayKey());
  const open = S.coupons.filter(x => E.couponStatus(x) === 'pending');
  const tilt = E.tiltEngine();
  const D = E.discipline();
  const pk = E.peakInfo();
  const enough = S.coupons.length >= 5;
  const band = D.score >= 620 ? { tone: 'pos', text: t('discipline') } :
    D.score >= 440 ? { tone: 'warn', text: t('discipline') } : { tone: 'neg', text: t('discipline') };

  return (
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />}>
      <Enter index={0}>
        <View style={{ backgroundColor: c.ink2, borderRadius: 20, padding: 18, marginBottom: 12,
          shadowColor: '#000', shadowOpacity: .18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[T.overline, { color: 'rgba(242,245,250,.45)' }]}>{t('bankroll')}</Text>
            {todayN !== 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: todayN > 0 ? 'rgba(79,203,159,.16)' : 'rgba(236,124,128,.16)',
                paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={[T.label, { color: todayN > 0 ? '#4FCB9F' : '#EC7C80' }]}>
                  {todayN > 0 ? '↑' : '↓'} {money(Math.abs(todayN))}</Text>
              </View>
            ) : null}
          </View>
          <CountUp value={b.equity} format={v => money(v)}
            style={[T.hero, { color: '#F2F5FA', marginTop: 6 }]} />
          <Text style={[T.caption, { color: 'rgba(242,245,250,.6)', marginTop: 5 }]}>
            {t('available')} {money(b.available)} · {t('openBets')} {money(b.pending)}
            {pk.pct >= 5 ? ` · ${t('fromPeak')} ${pctS(-pk.pct)}` : ''}
          </Text>
          <View style={{ marginTop: 14 }}>
            <AreaChart points={E.equityCurve(30)} height={132} money={money} dark
              dateLabel={x => new Date(x).toLocaleDateString()} />
          </View>
        </View>
      </Enter>

      <Enter index={1}><Card pad={false} style={{ marginBottom: 12 }}>
        <Strip items={[
          { k: t('today'), v: `${today.length}` },
          { k: t('staked'), v: money(today.reduce((s, x) => s + x.stake, 0)) },
          { k: t('result'), v: money(todayN, 1), tone: todayN > 0 ? 'pos' : todayN < 0 ? 'neg' : null },
          { k: t('discipline'), v: enough ? `${D.score} / 1000` : '—' }
        ]} />
      </Card></Enter>

      {tilt.length > 0 && (
        <Enter index={2}><Card style={{ marginBottom: 12 }}>
          <CardHead title={t('todayAlert')} meta={`${tilt.length}`} />
          <Signal title={tilt[0].t} body={tilt[0].d} tone={tilt[0].lvl === 'stop' ? 'stop' : 'warn'} />
          <View style={{ flexDirection: 'row', gap: 9, marginTop: 10 }}>
            {E.coolActive()
              ? <Btn style={{ flex: 1 }} title={`${t('breakOn')} · ${E.coolLeft()} ${t('minutes')}`}
                  onPress={() => { S.cooldown.until = 0; refresh(); }} />
              : <Btn style={{ flex: 1 }} title={t('takeBreak')}
                  onPress={async () => { E.startCooldown(30); refresh(); await ctx.scheduleBreakEnd(30); }} />}
          </View>
        </Card></Enter>
      )}

      <Enter index={3}>
        <Press onPress={() => { tap(); setModal({ type: 'add' }); }}>
          <View style={{ backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15,
            alignItems: 'center', marginBottom: 12, flexDirection: 'row', justifyContent: 'center', gap: 8,
            shadowColor: c.accent, shadowOpacity: .28, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 }}>
            <Icon name="plus" color="#fff" size={19} />
            <Text style={[T.card, { color: '#fff', fontSize: 15 }]}>{t('addBet')}</Text>
          </View>
        </Press>
      </Enter>

      <Enter index={4}>
        <Card style={{ marginBottom: 12 }} pad={false}>
          <View style={{ padding: 15, paddingBottom: 4 }}>
            <CardHead title={t('openBets')} meta={open.length ? `${open.length} · ${money(b.pending)}` : ''} />
          </View>
          {open.length === 0 ? (
            <EmptyState icon={<Icon name="clock" color={c.dim} size={22} />}
              title={t('noPending')} body={t('emptyOpenBody')}
              action={t('addBet')} onAction={() => setModal({ type: 'add' })} />
          ) : open.map(cp => <CouponRow key={cp.id} ctx={ctx} coupon={cp} />)}
        </Card>
      </Enter>

      <Note>{t('disclaimer')}</Note>
    </ScrollView>
  );
}

/* ── Kupon satırı ── */
function CouponRow({ ctx, coupon, index = 0 }) {
  const { c, t, money, setModal, refresh } = ctx;
  const bs = E.couponBets(coupon.id);
  const st = E.couponStatus(coupon);
  const pl = E.couponPL(coupon);
  const tone = st === 'won' ? c.pos : st === 'lost' ? c.neg : st === 'pending' ? c.warn : c.dim;
  const title = bs.length > 1 ? `${bs.length}'li ${t('parlay')}` : `${bs[0].home} – ${bs[0].away}`;
  const quick = () => {
    if (st !== 'pending') return;
    bump(true);
    Alert.alert(t('markResult'), title, [
      { text: t('won'), onPress: () => { bs.forEach(x => x.status = 'won'); E.settleCoupon(coupon.id); refresh(); } },
      { text: t('lost'), onPress: () => { bs.forEach(x => x.status = 'lost'); E.settleCoupon(coupon.id); refresh(); } },
      { text: t('cancel'), style: 'cancel' }
    ]);
  };
  return (
    <Press onPress={() => { tap(); setModal({ type: 'coupon', id: coupon.id }); }} onLongPress={quick} scaleTo={0.99}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 13,
        borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hair
      }}>
        <View style={{ width: 3, height: 34, borderRadius: 2, backgroundColor: tone }} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[T.row, { fontFamily: T.card.fontFamily, color: c.text }]}>{title}</Text>
          <Text style={[T.caption, { color: c.faint, marginTop: 3 }]}>
            {bs.length > 1 ? `${bs.length} · ${E.couponOdds(coupon).toFixed(2)}` : `${bs[0].market} · ${bs[0].odds.toFixed(2)}`}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[T.rowNum, { color: c.text }]}>{money(coupon.stake)}</Text>
          <Text style={[T.label, { color: tone, marginTop: 3 }]}>
            {st === 'pending' ? t('pending') : money(pl, 1)}
          </Text>
        </View>
      </View>
    </Press>
  );
}

/* ══════════════ BAHİSLER ══════════════ */
function Bets({ ctx }) {
  const { c, t, money, setModal, refreshing, onRefresh } = ctx;
  const [f, setF] = useState('all');
  let list = S.coupons.slice().sort((a, b) => b.createdAt - a.createdAt);
  if (f !== 'all') list = list.filter(x => E.couponStatus(x) === f);
  const stake = list.reduce((s, x) => s + x.stake, 0);
  const net = list.filter(x => E.couponStatus(x) !== 'pending').reduce((s, x) => s + E.couponPL(x), 0);

  return (
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />}>
      <Seg style={{ marginBottom: 12 }} value={f} onChange={setF}
        items={[['all', t('allBets')], ['pending', t('pending')], ['won', t('won')], ['lost', t('lost')]]} />
      <Enter index={0}>
        <Card style={{ marginBottom: 12 }}>
          <Text style={[T.overline, { color: c.faint }]}>{t('periodStats')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <Text style={[T.amount, { color: c.text }]}>{list.length}</Text>
            <Text style={[T.body, { color: c.muted }]}>{t('coupons')} · {money(stake)}</Text>
            <Text style={[T.rowNum, { color: net >= 0 ? c.pos : c.neg, marginLeft: 'auto' }]}>{money(net, 1)}</Text>
          </View>
        </Card>
      </Enter>
      <Enter index={1}>
        <Card pad={false}>
          {list.length === 0 ? (
            <EmptyState icon={<Icon name="list" color={c.dim} size={22} />}
              title={t('noMatch')} body={t('emptyBetsBody')}
              action={t('addBet')} onAction={() => setModal({ type: 'add' })} />
          ) : list.slice(0, 60).map((cp, i) => <CouponRow key={cp.id} ctx={ctx} coupon={cp} index={i} />)}
        </Card>
      </Enter>
      {list.some(x => E.couponStatus(x) === 'pending') ? <Note>{t('longPressHint')}</Note> : null}
    </ScrollView>
  );
}

/* ══════════════ ANALİZ ══════════════ */
function Stats({ ctx }) {
  const { c, t, money, refreshing, onRefresh } = ctx;
  const [per, setPer] = useState(30);
  const [sub, setSub] = useState('summary');
  const st = E.stats(per || null);
  const pk = E.peakInfo();
  const D = E.discipline();
  const band = D.score >= 620 ? { tone: 'pos', text: 'İyi' } : D.score >= 440 ? { tone: 'warn', text: '—' } : { tone: 'neg', text: '—' };
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push({ v: (E.dailyNet(null))[E.dayKey(d)] || 0 });
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        <Seg value={sub} onChange={setSub} style={{ minWidth: 520 }}
          items={[['summary', t('summary')], ['profile', t('profile')], ['dims', t('breakdowns')],
                  ['lab', t('lab')], ['wi', t('scenarios')]]} />
      </ScrollView>
      {sub === 'dims' ? <Dims ctx={ctx} /> :
       sub === 'lab' ? <Lab ctx={ctx} /> :
       sub === 'wi' ? <Scenarios ctx={ctx} /> :
       sub === 'summary' ? (<>
        <Seg style={{ marginBottom: 12 }} value={per} onChange={setPer}
          items={[[7, t('period7')], [30, t('period30')], [90, t('period90')], [0, t('periodAll')]]} />
        <Enter index={0}><Card pad={false} style={{ marginBottom: 12 }}>
          <Strip items={[
            { k: t('roi'), v: pctS(st.roi, 1), tone: st.roi >= 0 ? 'pos' : 'neg' },
            { k: t('strike'), v: '%' + st.winRate.toFixed(1).replace('.', ',') },
            { k: t('net'), v: money(st.net, 1), tone: st.net >= 0 ? 'pos' : 'neg' },
            { k: t('avgOdds'), v: st.avgOdds.toFixed(2) }
          ]} />
          <View style={{ padding: 12 }}>
            <AreaChart points={E.equityCurve(per || null)} height={150} money={money}
              dateLabel={x => new Date(x).toLocaleDateString()} />
          </View>
        </Card></Enter>
        <Enter index={1}><Card style={{ marginBottom: 12 }}>
          <CardHead title={t('summary')} />
          <KV k={t('totalStaked')} v={money(st.totalStake)} />
          <KV k={t('totalWin')} v={money(st.profit)} tone="pos" />
          <KV k={t('totalLoss')} v={money(-st.loss)} tone="neg" />
          <KV k={t('avgStake')} v={money(st.avgStake)} />
          <KV k={t('bestWin')} v={money(st.best, 1)} tone="pos" />
          <KV k={t('worstLoss')} v={money(st.worst, 1)} tone="neg" />
          <KV k={t('winRun')} v={String(st.winStreak)} />
          <KV k={t('lossRun')} v={String(st.lossStreak)} />
        </Card></Enter>
        <Enter index={2}><Card style={{ marginBottom: 12 }}>
          <CardHead title={t('drawdown')} />
          <Text style={[T.hero, { fontSize: 30, color: c.neg }]}>{pctS(-pk.pct)}</Text>
          <KV k={t('peak')} v={money(pk.peak)} />
          <KV k={t('current')} v={money(pk.now)} />
        </Card></Enter>
        <Card style={{ marginBottom: 12 }}>
          <CardHead title={t('dailyPl')} meta={t('last14')} />
          <Bars data={days} />
        </Card>
        <Card>
          <CardHead title={t('findings')} />
          {E.insights().length === 0 ? <Empty text={t('notEnoughData')} /> :
            E.insights().map((x, i) => <Signal key={i} body={x} tone="info" />)}
        </Card>
      </>) : (<>
        <Card style={{ marginBottom: 12 }}>
          <CardHead title={t('discipline')} meta={`${S.coupons.length} ${t('coupons')}`} />
          {S.coupons.length < 5 ? <Empty text={t('notEnoughData')} /> : (<>
            <Gauge score={D.score} band={band} />
            <View style={{ marginTop: 10 }}>
              {D.factors.map((fa, i) => (
                <View key={i} style={{ paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hair }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: c.text, fontSize: 13, flex: 1 }}>{fa.k}</Text>
                    <Text style={{ color: c.text, fontWeight: '700', fontSize: 13 }}>{Math.round(fa.v * 100)}</Text>
                  </View>
                  <View style={{ height: 4, backgroundColor: c.sunk, borderRadius: 3, marginTop: 6 }}>
                    <View style={{
                      height: 4, borderRadius: 3, width: `${Math.max(2, fa.v * 100)}%`,
                      backgroundColor: fa.v < .4 ? c.neg : c.accent
                    }} />
                  </View>
                  <Text style={{ color: c.faint, fontSize: 11.5, marginTop: 5 }}>{fa.d}</Text>
                </View>
              ))}
            </View>
          </>)}
        </Card>
        <Card>
          <CardHead title={t('behaviour')} />
          {E.tiltEngine().length === 0 ? <Empty text={t('noSignals')} /> :
            E.tiltEngine().map((r, i) => <Signal key={i} title={r.t} body={r.d} tone={r.lvl === 'stop' ? 'stop' : 'warn'} />)}
        </Card>
      </>)}
    </ScrollView>
  );
}

/* ── Dağılımlar ── */
function Dims({ ctx }) {
  const { c, t, money } = ctx;
  const [dim, setDim] = useState('odds');
  const keys = [['odds', t('dimOdds')], ['market', t('dimMarket')], ['league', t('dimLeague')],
    ['type', t('dimType')], ['hour', t('dimHour')], ['day', t('dimDay')],
    ['stake', t('dimStake')], ['risk', t('dimRisk')]];
  const d = E.dimension(dim, null);
  const mx = Math.max(...d.rows.map(r => Math.abs(r.roi)), 1);
  return (<>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {keys.map(([k, l]) => (
          <Pressable key={k} onPress={() => setDim(k)} style={{
            paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9,
            backgroundColor: dim === k ? c.accent : c.sunk
          }}>
            <Text style={{ fontSize: 12.5, color: dim === k ? '#fff' : c.muted }}>{l}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
    <Card>
      <CardHead title={keys.find(k => k[0] === dim)[1]} meta={`${S.coupons.length}`} />
      {d.rows.length === 0 ? <Empty text={t('notEnoughData')} /> : d.rows.slice(0, 8).map((r, i) => {
        const weak = r.n < 20;
        return (
          <View key={i} style={{ paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: c.hair, opacity: weak ? .55 : 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: c.text, fontSize: 13, fontWeight: '600', flex: 1 }} numberOfLines={1}>{r.key}</Text>
              <Text style={{ fontWeight: '700', fontSize: 13,
                color: weak ? c.faint : r.roi >= 0 ? c.pos : c.neg }}>
                {weak ? '—' : pctS(r.roi, 1)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
              <Text style={{ color: c.faint, fontSize: 11.5 }}>{r.n} · %{r.wr.toFixed(0)}</Text>
              <Text style={{ color: c.faint, fontSize: 11.5 }}>{money(r.net, 1)}</Text>
            </View>
            {!weak && (
              <View style={{ height: 4, backgroundColor: c.sunk, borderRadius: 3, marginTop: 7 }}>
                <View style={{ height: 4, borderRadius: 3,
                  width: `${Math.min(100, Math.abs(r.roi) / mx * 100)}%`,
                  backgroundColor: r.roi >= 0 ? c.pos : c.neg }} />
              </View>
            )}
          </View>
        );
      })}
      <Note>{t('needMore')}</Note>
    </Card>
  </>);
}

/* ── Laboratuvar ── */
function Lab({ ctx }) {
  const { c, t, money } = ctx;
  const [p, setP] = useState({
    bank: String(Math.round(E.bankroll().equity) || 10000),
    odds: '1.60', risk: String(E.limits().maxBetPct), bets: '100', winRate: '62.5'
  });
  const n = k => parseFloat(String(p[k]).replace(',', '.')) || 0;
  const r = E.seriesLab({ bank: n('bank'), odds: n('odds') || 1.6, risk: n('risk') || 5,
    bets: Math.max(10, Math.min(500, n('bets') || 100)), winRate: n('winRate') || 50 });
  const m = v => money(n('bank') * v);
  return (<>
    <Card style={{ marginBottom: 12 }}>
      <CardHead title={t('lab')} />
      <Field ctx={ctx} label={t('labBank')} value={p.bank} onChange={v => setP({ ...p, bank: v })} numeric />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Field ctx={ctx} label={t('labOdds')} value={p.odds} onChange={v => setP({ ...p, odds: v })} numeric /></View>
        <View style={{ flex: 1 }}><Field ctx={ctx} label={t('labRisk')} value={p.risk} onChange={v => setP({ ...p, risk: v })} numeric /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Field ctx={ctx} label={t('labBets')} value={p.bets} onChange={v => setP({ ...p, bets: v })} numeric /></View>
        <View style={{ flex: 1 }}><Field ctx={ctx} label={t('labWin')} value={p.winRate} onChange={v => setP({ ...p, winRate: v })} numeric /></View>
      </View>
    </Card>
    <Card pad={false} style={{ marginBottom: 12 }}>
      <Strip items={[
        { k: t('labMedian'), v: m(r.median), tone: r.median < 1 ? 'neg' : 'pos' },
        { k: t('labMean'), v: m(r.mean) },
        { k: t('labBest'), v: m(r.best), tone: 'pos' },
        { k: t('labWorst'), v: m(r.worst), tone: 'neg' }
      ]} />
    </Card>
    <Card>
      <KV k={t('labRuin25')} v={'%' + r.ruin25.toFixed(0)} tone={r.ruin25 > 20 ? 'neg' : r.ruin25 > 5 ? 'warn' : null} />
      <KV k={t('labRuin50')} v={'%' + r.ruin50.toFixed(0)} tone={r.ruin50 > 35 ? 'neg' : null} />
      <KV k={t('labRun3')} v={'%' + r.s3.toFixed(0)} />
      <KV k={t('labRun5')} v={'%' + r.s5.toFixed(0)} />
      <KV k={t('labRun10')} v={'%' + r.s10.toFixed(0)} />
      <Note>{t('labNote')}</Note>
    </Card>
  </>);
}

/* ── Senaryolar ── */
function Scenarios({ ctx }) {
  const { c, t, money } = ctx;
  const [kind, setKind] = useState('risk');
  const [param, setParam] = useState(2);
  const res = E.whatIf(kind, kind === 'risk' ? param : kind === 'maxOdds' ? param : null);
  const kinds = [['singles', t('wiSingles')], ['risk', t('wiRisk')], ['maxOdds', t('wiOdds')], ['dropWorst', t('wiWorst')]];
  return (
    <Card>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {kinds.map(([k, l]) => (
            <Pressable key={k} onPress={() => { setKind(k); setParam(k === 'risk' ? 2 : 1.5); }} style={{
              paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9,
              backgroundColor: kind === k ? c.accent : c.sunk
            }}>
              <Text style={{ fontSize: 12.5, color: kind === k ? '#fff' : c.muted }}>{l}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {kind === 'risk' && (
        <Seg style={{ marginBottom: 12 }} value={param} onChange={setParam}
          items={[1, 2, 3, 5, 10].map(v => [v, '%' + v])} />
      )}
      {kind === 'maxOdds' && (
        <Seg style={{ marginBottom: 12 }} value={param} onChange={setParam}
          items={[1.35, 1.5, 1.65, 2].map(v => [v, v.toFixed(2)])} />
      )}
      {!res || res.err ? <Empty text={(res && res.err) || t('notEnoughData')} /> : (<>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, backgroundColor: c.sunk, borderRadius: 11, padding: 12 }}>
            <Text style={{ color: c.faint, fontSize: 11.5 }}>{t('wiReal')}</Text>
            <Text style={{ color: c.text, fontSize: 18, fontWeight: '800', marginTop: 3 }}>{money(res.realFinal)}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: c.sunk, borderRadius: 11, padding: 12 }}>
            <Text style={{ color: c.faint, fontSize: 11.5 }}>{t('wiAlt')}</Text>
            <Text style={{ color: c.text, fontSize: 18, fontWeight: '800', marginTop: 3 }}>{money(res.altFinal)}</Text>
          </View>
        </View>
        <Text style={{ textAlign: 'center', marginTop: 12, fontSize: 16, fontWeight: '700',
          color: res.diff >= 0 ? c.pos : c.neg }}>{money(res.diff, 1)} {t('wiDiff')}</Text>
        <Note>{res.label}</Note>
        <Note>{t('wiNote')}</Note>
      </>)}
    </Card>
  );
}

/* ══════════════ HESAP ══════════════ */
function Account({ ctx, reset }) {
  const { c, t, money, refresh, lang, setLang, theme, setTheme, refreshing, onRefresh } = ctx;
  const b = E.bankroll();
  const bl = E.badges();
  const tx = S.tx.slice().sort((a, x) => x.at - a.at).slice(0, 8);
  const TX = { init: t('bankroll'), deposit: t('addFunds'), withdraw: t('withdraw'), stake: t('tabBets'), return: t('won'), refund: t('voided'), reversal: '—' };
  const [cashKind, setCashKind] = useState(null);
  const [cashVal, setCashVal] = useState('');
  const doCash = () => {
    const a = parseFloat(String(cashVal).replace(',', '.'));
    if (!a || a <= 0) return Alert.alert(t('needAmount'));
    if (cashKind === 'withdraw' && a > b.available) return Alert.alert(t('notEnough'));
    S.tx.push({ id: E.uid(), type: cashKind, amount: a, at: Date.now(), ref: null });
    setCashKind(null); setCashVal(''); refresh();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
      <Modal visible={!!cashKind} transparent animationType="fade" onRequestClose={() => setCashKind(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(10,15,25,.45)', justifyContent: 'center', padding: 24 }}>
          <Card>
            <CardHead title={cashKind === 'deposit' ? t('addFunds') : t('withdraw')} />
            <Field ctx={ctx} label={`${t('amount')} (${CURS[S.user.currency]})`} value={cashVal}
              onChange={setCashVal} numeric placeholder="0" />
            <Note>{t('available')}: {money(b.available)}</Note>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Btn style={{ flex: 1 }} title={t('cancel')} onPress={() => setCashKind(null)} />
              <Btn style={{ flex: 1 }} kind="primary" title={t('save')} onPress={doCash} />
            </View>
          </Card>
        </View>
      </Modal>
      <Enter index={0}><Card pad={false} style={{ marginBottom: 12 }}>
        <View style={{ padding: 14, paddingBottom: 0 }}><CardHead title={t('bankroll')} meta={S.user.currency} /></View>
        <Strip items={[
          { k: t('available'), v: money(b.available) },
          { k: t('openBets'), v: money(b.pending), tone: 'warn' },
          { k: t('bankroll'), v: money(b.equity) },
          { k: t('unitValue'), v: money(S.user.unitValue) }
        ]} />
        <View style={{ flexDirection: 'row', gap: 10, padding: 14 }}>
          <Btn style={{ flex: 1 }} title={t('addFunds')} onPress={() => { setCashVal(''); setCashKind('deposit'); }} />
          <Btn style={{ flex: 1 }} title={t('withdraw')} onPress={() => { setCashVal(''); setCashKind('withdraw'); }} />
        </View>
      </Card></Enter>

      <Card style={{ marginBottom: 12 }}>
        <CardHead title={t('activity')} />
        {tx.map(x => (
          <KV key={x.id} k={TX[x.type] || x.type}
            v={money(x.type === 'withdraw' ? -x.amount : x.amount, 1)}
            tone={(x.type === 'withdraw' ? -x.amount : x.amount) >= 0 ? 'pos' : 'neg'} />
        ))}
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <CardHead title={t('appearance')} />
        <Text style={{ color: c.faint, fontSize: 12, marginBottom: 6 }}>{t('langLabel')}</Text>
        <Seg style={{ marginBottom: 12 }} value={lang} onChange={setLang}
          items={[['tr', 'Türkçe'], ['en', 'English']]} />
        <Seg value={theme} onChange={setTheme}
          items={[['light', t('themeLight')], ['dark', t('themeDark')], ['auto', 'Auto']]} />
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <CardHead title={t('badges')} meta={`${bl.filter(x => x.on).length} / ${bl.length} ${t('unlocked')}`} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {bl.map((x, i) => (
            <View key={i} style={{
              paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
              backgroundColor: x.on ? c.accentSoft : c.sunk, minWidth: '47%'
            }}>
              <Text style={{ color: x.on ? c.accent : c.dim, fontSize: 12, fontWeight: '700' }}>{x.n}</Text>
              <Text style={{ color: c.faint, fontSize: 10.5, marginTop: 2 }}>{x.p}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <CardHead title={t('responsible')} right={<Chip text="18+" tone="warn" />} />
        <Text style={{ color: c.muted, fontSize: 12.5, lineHeight: 18 }}>{t('respBody')}</Text>
        <Note>{t('respHelp')}</Note>
      </Card>

      <Card>
        <CardHead title={t('settings')} />
        <Btn title={t('sampleData')} style={{ marginBottom: 9 }} onPress={() => {
          seedDemo(Math.floor(Math.random() * 9e6) + 1); refresh();
        }} />
        <Btn title={t('wipe')} kind="neg" onPress={() => Alert.alert(t('wipe'), t('wipeConfirm'), [
          { text: t('cancel'), style: 'cancel' },
          { text: t('wipe'), style: 'destructive', onPress: () => { setState(freshState()); AsyncStorage.removeItem(KEY); reset(); refresh(); } }
        ])} />
        <Note>{t('dataNote')}</Note>
        <Note>{t('noOcr')}</Note>
      </Card>
    </ScrollView>
  );
}

/* ══════════════ MODALLER ══════════════ */
function Sheets({ ctx, modal }) {
  const { setModal } = ctx;
  return (
    <Modal visible={!!modal} animationType="slide" transparent onRequestClose={() => setModal(null)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(10,15,25,.45)', justifyContent: 'flex-end' }}>
        <View style={{ maxHeight: '92%' }}>
          {modal && modal.type === 'add' && <AddBet ctx={ctx} />}
          {modal && modal.type === 'coupon' && <CouponDetail ctx={ctx} id={modal.id} />}
        </View>
      </View>
    </Modal>
  );
}

/* ── Kupon ekleme ── */
function AddBet({ ctx }) {
  const { c, t, money, refresh, setModal } = ctx;
  const [legs, setLegs] = useState([{ league: 'Süper Lig', home: '', away: '', market: 'MS 1', odds: '1.55' }]);
  const [stake, setStake] = useState(String(Math.round(S.user.unitValue / 2) || 100));
  const [note, setNote] = useState('');
  const [reason, setReason] = useState(null);
  const [scan, setScan] = useState(false);
  const [scanErr, setScanErr] = useState(null);
  const [read, setRead] = useState(false);         // okunan veri dolduruldu mu

  const pickAndRead = async () => {
    setScanErr(null);
    if (!ocrAvailable()) { setScanErr(t('ocrNoModule')); return; }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { setScanErr(t('permPhoto')); return; }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1
      });
      if (res.canceled || !res.assets || !res.assets[0].uri) return;
      setScan(true);
      const { parsed } = await readSlipFromUri(res.assets[0].uri);
      setScan(false);
      if (!parsed.legs.length) { bump(false); setScanErr(t('ocrFailBody')); return; }
      setLegs(parsed.legs.map(l => ({
        league: E.LEAGUES[l.league] ? l.league : 'Süper Lig',
        home: l.home, away: l.away,
        market: E.MARKETS[l.market] ? l.market : 'MS 1',
        odds: String(l.odds), conf: l.conf
      })));
      if (parsed.stake) setStake(String(parsed.stake));
      setRead(true); bump(true);
    } catch (e) {
      setScan(false); bump(false);
      setScanErr(e && e.code === 'modul-yok' ? t('ocrNoModule')
        : e && e.code === 'metin-yok' ? t('ocrFailBody') : t('ocrFailBody'));
    }
  };

  const amount = parseFloat(String(stake).replace(',', '.')) || 0;
  const pc = E.preCheck(amount);
  const flags = E.preCheckFlags(pc);
  const set = (i, k, v) => setLegs(legs.map((l, j) => j === i ? { ...l, [k]: v } : l));

  const save = () => {
    if (amount <= 0) return Alert.alert(t('needAmount'));
    if (amount > E.bankroll().available) return Alert.alert(t('notEnough'));
    if (legs.some(l => !l.home.trim() || !l.away.trim())) return Alert.alert(t('needTeams'));
    if (!reason) return Alert.alert(t('pickReason'));
    const at = Date.now();
    const cp = {
      id: E.uid(), type: legs.length > 1 ? 'parlay' : 'single', stake: amount,
      createdAt: at, note, source: 'manual', settledAt: null, reason, journal: null
    };
    S.coupons.push(cp);
    S.tx.push({ id: E.uid(), type: 'stake', amount: -amount, at, ref: cp.id });
    legs.forEach(l => S.bets.push({
      id: E.uid(), couponId: cp.id, league: l.league, home: l.home.trim(), away: l.away.trim(),
      market: l.market, odds: parseFloat(String(l.odds).replace(',', '.')) || 1.5,
      status: 'pending', score: null, kickoff: at + 3 * 3600000
    }));
    bump(true); setModal(null); refresh();
  };

  const REASONS = [['stat', t('rStat')], ['value', t('rValue')], ['fun', t('rFun')],
    ['chase', t('rChase')], ['unsure', t('rUnsure')], ['other', t('rOther')]];

  return (
    <View style={{ backgroundColor: c.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 26 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: c.text }}>{t('newBet')}</Text>
          <Pressable onPress={() => setModal(null)}><Text style={{ color: c.faint, fontSize: 22 }}>✕</Text></Pressable>
        </View>

        {!read && (
          <Card style={{ marginBottom: 12 }}>
            {scan ? (
              <View style={{ alignItems: 'center', paddingVertical: 14 }}>
                <ActivityIndicator color={c.accent} />
                <Text style={{ color: c.muted, fontSize: 13, marginTop: 10 }}>{t('ocrReading')}</Text>
              </View>
            ) : (<>
              <Btn kind="primary" title={t('ocrPick')} onPress={pickAndRead} />
              <Note>{t('ocrHint')} · {t('ocrPriv')}</Note>
              {scanErr ? <Signal title={t('ocrFail')} body={scanErr} tone="warn" /> : null}
            </>)}
          </Card>
        )}
        {read && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Chip text={t('ocrFound')} tone="pos" />
            <Pressable onPress={() => { setRead(false); setScanErr(null); }}>
              <Text style={{ color: c.accent, fontSize: 12.5 }}>{t('ocrRetry')}</Text>
            </Pressable>
          </View>
        )}
        {read && <Note>{t('ocrConfirm')}</Note>}
        {legs.map((l, i) => (
          <Card key={i} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: c.faint, fontSize: 12 }}>{i + 1}. {t('market')}</Text>
                {l.conf !== undefined && l.conf < .8 ?
                  <Chip text={`%${Math.round(l.conf * 100)}`} tone="warn" /> : null}
              </View>
              {legs.length > 1 && (
                <Pressable onPress={() => setLegs(legs.filter((_, j) => j !== i))}>
                  <Text style={{ color: c.neg, fontSize: 12 }}>{t('removeSelection')}</Text>
                </Pressable>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field ctx={ctx} label={t('home')} value={l.home} onChange={v => set(i, 'home', v)} /></View>
              <View style={{ flex: 1 }}><Field ctx={ctx} label={t('away')} value={l.away} onChange={v => set(i, 'away', v)} /></View>
            </View>
            <Text style={{ color: c.faint, fontSize: 12, marginBottom: 6 }}>{t('league')}</Text>
            <Picker ctx={ctx} items={Object.keys(E.LEAGUES)} value={l.league} onChange={v => set(i, 'league', v)} />
            <Text style={{ color: c.faint, fontSize: 12, marginBottom: 6, marginTop: 10 }}>{t('market')}</Text>
            <MarketPicker ctx={ctx} value={l.market} onChange={v => set(i, 'market', v)} />
            <View style={{ marginTop: 10 }}>
              <Field ctx={ctx} label={t('odds')} value={l.odds} onChange={v => set(i, 'odds', v)} numeric />
            </View>
          </Card>
        ))}
        <Btn title={`+ ${t('addSelection')}`} style={{ marginBottom: 12 }}
          onPress={() => setLegs([...legs, { league: 'Süper Lig', home: '', away: '', market: 'MS 1', odds: '1.55' }])} />

        <Field ctx={ctx} label={`${t('stake')} (${CURS[S.user.currency]})`} value={stake} onChange={setStake} numeric />
        <Field ctx={ctx} label={t('note')} value={note} onChange={setNote} />

        {/* Bahis öncesi kontrol */}
        <Card style={{ marginBottom: 12, backgroundColor: flags ? c.warnSoft : c.surface, borderColor: flags ? c.warn : c.hair }}>
          <CardHead title={t('preCheck')} meta={flags ? `${flags} ${t('overLimit')}` : t('withinLimits')} />
          <KV k={t('shareEquity')} v={`%${pc.pctEquity.toFixed(1)} · ${t('limit')} %${pc.limit}`} tone={pc.overBet ? 'neg' : null} />
          <KV k={t('shareAvail')} v={`%${pc.pctAvailable.toFixed(1)}`} />
          <KV k={t('todayCount')} v={`${pc.todayCount + 1} · ${t('limit')} ${pc.limits.maxDailyBets}`} tone={pc.overCount ? 'neg' : null} />
          <KV k={t('todayStake')} v={money(pc.todayStake + amount)} tone={pc.overDaily ? 'neg' : null} />
          <KV k={t('lockedOpen')} v={money(pc.openLocked + amount)} tone={pc.overOpen ? 'neg' : null} />
          {pc.last5.n > 0 && <KV k={t('last5')} v={`${pc.last5.w}G ${pc.last5.l}M · ${money(pc.last5.net, 1)}`} />}
          {pc.last10.n > 0 && <KV k={t('last10')} v={`${pc.last10.w}G ${pc.last10.l}M · ${money(pc.last10.net, 1)}`} />}
        </Card>

        <Text style={{ color: c.faint, fontSize: 12, marginBottom: 8 }}>{t('whyBet')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
          {REASONS.map(([k, l]) => (
            <Pressable key={k} onPress={() => setReason(k)} style={{
              paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
              borderColor: reason === k ? (k === 'chase' ? c.warn : c.accent) : c.hair,
              backgroundColor: reason === k ? (k === 'chase' ? c.warn : c.accent) : c.surface
            }}>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: reason === k ? '#fff' : c.muted }}>{l}</Text>
            </Pressable>
          ))}
        </View>
        {reason === 'chase' && <Signal body={t('chaseWarn')} tone="warn" />}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Btn style={{ flex: 1 }} title={t('cancel')} onPress={() => setModal(null)} />
          <Btn style={{ flex: 1.4 }} kind="pos" title={t('save')} onPress={save} />
        </View>
      </ScrollView>
    </View>
  );
}


/* ── Bahis türü seçici: 125 tür gruplanmış, aranabilir ── */
function MarketPicker({ ctx, value, onChange }) {
  const { c, t } = ctx;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const g = {};
    Object.entries(E.MARKETS).forEach(([k, v]) => { (g[v.g] = g[v.g] || []).push(k); });
    return g;
  }, []);
  const fold = s => String(s).replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
  const filtered = useMemo(() => {
    if (!q.trim()) return groups;
    const f = fold(q);
    const out = {};
    Object.entries(groups).forEach(([gk, items]) => {
      const hit = items.filter(x => fold(x).includes(f));
      if (hit.length) out[gk] = hit;
    });
    return out;
  }, [q, groups]);

  return (<>
    <Pressable onPress={() => { setQ(''); setOpen(true); }} style={{
      borderWidth: 1, borderColor: c.hair, borderRadius: 10, paddingHorizontal: 12,
      paddingVertical: 11, backgroundColor: c.surface, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'space-between'
    }}>
      <Text style={{ color: c.text, fontSize: 14 }} numberOfLines={1}>{value}</Text>
      <Text style={{ color: c.dim, fontSize: 12 }}>▾</Text>
    </Pressable>
    <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(10,15,25,.45)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: c.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18,
          maxHeight: '85%', padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>{t('market')}</Text>
            <Pressable onPress={() => setOpen(false)}><Icon name="close" color={c.faint} size={22} /></Pressable>
          </View>
          <Field ctx={ctx} value={q} onChange={setQ} placeholder={t('searchMarket')} />
          <ScrollView>
            {Object.entries(filtered).map(([gk, items]) => (
              <View key={gk} style={{ marginBottom: 14 }}>
                <Text style={{ color: c.faint, fontSize: 11.5, fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: .4, marginBottom: 7 }}>{gk}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {items.map(k => (
                    <Pressable key={k} onPress={() => { onChange(k); setOpen(false); }} style={{
                      paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9,
                      backgroundColor: value === k ? c.accent : c.sunk
                    }}>
                      <Text style={{ fontSize: 12.5, color: value === k ? '#fff' : c.muted }}>{k}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
            {Object.keys(filtered).length === 0 ? <Empty text={t('notEnoughData')} /> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>);
}

/* ── Basit seçici ── */
function Picker({ ctx, items, value, onChange }) {
  const { c } = ctx;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {items.map(it => (
          <Pressable key={it} onPress={() => onChange(it)} style={{
            paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9,
            backgroundColor: value === it ? c.accent : c.sunk
          }}>
            <Text style={{ fontSize: 12.5, color: value === it ? '#fff' : c.muted }}>{it}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

/* ── Kupon detayı ── */
function CouponDetail({ ctx, id }) {
  const { c, t, money, refresh, setModal } = ctx;
  const cp = S.coupons.find(x => x.id === id);
  if (!cp) return null;
  const bs = E.couponBets(id);
  const st = E.couponStatus(cp);

  const settle = r => {
    bs.forEach(b => {
      b.status = r === 'pending' ? 'pending' : r;
      if (r === 'pending') b.score = null;
    });
    E.settleCoupon(id);
    setModal(null); refresh();
  };

  return (
    <View style={{ backgroundColor: c.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 26 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: c.text, flex: 1 }} numberOfLines={1}>
            {bs.length > 1 ? `${bs.length}'li ${t('parlay')}` : `${bs[0].home} – ${bs[0].away}`}
          </Text>
          <Pressable onPress={() => setModal(null)}><Text style={{ color: c.faint, fontSize: 22 }}>✕</Text></Pressable>
        </View>
        <Card style={{ marginBottom: 12 }}>
          {bs.map(b => (
            <View key={b.id} style={{ paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hair }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: c.text, fontWeight: '600', fontSize: 13.5, flex: 1 }}>{b.home} – {b.away}</Text>
                <Text style={{ color: c.text, fontWeight: '700' }}>{b.odds.toFixed(2)}</Text>
              </View>
              <Text style={{ color: c.faint, fontSize: 12, marginTop: 3 }}>
                {b.league} · {b.market}{b.score ? ` · ${b.score.h}–${b.score.a}` : ''}
              </Text>
            </View>
          ))}
        </Card>
        <Card style={{ marginBottom: 12 }}>
          <KV k={t('stake')} v={`${money(cp.stake)} · ${(cp.stake / S.user.unitValue).toFixed(1)}`} />
          <KV k={t('odds')} v={E.couponOdds(cp).toFixed(2)} />
          <KV k={t('potential')} v={money(cp.stake * E.couponOdds(cp))} />
          <KV k={t('status')} v={st === 'pending' ? t('pending') : `${t(st === 'won' ? 'won' : st === 'lost' ? 'lost' : 'voided')} · ${money(E.couponPL(cp), 1)}`}
            tone={st === 'won' ? 'pos' : st === 'lost' ? 'neg' : 'warn'} />
          {cp.reason ? <KV k={t('reason')} v={cp.reason} /> : null}
          {cp.note ? <KV k={t('note')} v={cp.note} /> : null}
        </Card>
        {st === 'pending' ? (
          <View style={{ gap: 9 }}>
            <Text style={{ color: c.faint, fontSize: 12 }}>{t('markResult')}</Text>
            <View style={{ flexDirection: 'row', gap: 9 }}>
              <Btn style={{ flex: 1 }} kind="pos" title={t('won')} onPress={() => settle('won')} />
              <Btn style={{ flex: 1 }} title={t('lost')} onPress={() => settle('lost')} />
              <Btn style={{ flex: 1 }} title={t('voided')} onPress={() => settle('void')} />
            </View>
          </View>
        ) : (
          <Btn title={t('undo')} onPress={() => settle('pending')} />
        )}
      </ScrollView>
    </View>
  );
}
