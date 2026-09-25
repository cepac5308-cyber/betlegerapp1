import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { T } from './type';

/* ── Renk paleti: web sürümüyle aynı tonlar ── */
export const light = {
  bg: '#F4F6FA', surface: '#FFFFFF', sunk: '#F1F3F8',
  hair: '#E7EAF2', hair2: '#D6DCE8',
  text: '#0F1729', muted: '#5A6782', faint: '#66738B', dim: '#98A2B3',
  accent: '#3F4EC0', accentSoft: '#ECEEFA',
  pos: '#0F8A68', posSoft: '#E7F3EE',
  neg: '#C04A4F', negSoft: '#F9ECEC',
  warn: '#A87B1E', warnSoft: '#F7F1E4',
  ink1: '#222B3D', ink2: '#0D131F'
};
export const dark = {
  bg: '#0A0E16', surface: '#131A27', sunk: '#0E1420',
  hair: '#222C3D', hair2: '#2E3A4E',
  text: '#EDF1F7', muted: '#94A2B8', faint: '#7E8CA3', dim: '#4A5769',
  accent: '#8290F5', accentSoft: '#1C2340',
  pos: '#4FCB9F', posSoft: '#0F2A22',
  neg: '#EC7C80', negSoft: '#2B1618',
  warn: '#D8A559', warnSoft: '#2A2114',
  ink1: '#1A2334', ink2: '#101724'
};

export const ThemeCtx = React.createContext(light);
export const useC = () => React.useContext(ThemeCtx);

/* ── Kart ── */
export function Card({ children, style, pad = true }) {
  const c = useC();
  return (
    <View style={[{
      backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.hair,
      overflow: 'hidden',
      shadowColor: '#0B1220', shadowOpacity: 0.04, shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 }, elevation: 1
    }, pad && { padding: 14 }, style]}>{children}</View>
  );
}

export function CardHead({ title, meta, right }) {
  const c = useC();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <Text style={[T.card, { color: c.text, flexShrink: 1 }]}>{title}</Text>
      {right || (meta ? <Text style={[T.label, { color: c.faint }]}>{meta}</Text> : null)}
    </View>
  );
}

/* ── Etiket / değer satırı ── */
export function KV({ k, v, tone }) {
  const c = useC();
  const col = tone === 'pos' ? c.pos : tone === 'neg' ? c.neg : tone === 'warn' ? c.warn : c.text;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.hair }}>
      <Text style={[T.row, { color: c.muted, flexShrink: 1, paddingRight: 10 }]}>{k}</Text>
      <Text style={[T.rowNum, { color: col }]}>{v}</Text>
    </View>
  );
}

/* ── Metrik şeridi ── */
export function Strip({ items }) {
  const c = useC();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: c.hair }}>
      {items.map((it, i) => (
        <View key={i} style={{
          flexGrow: 1, flexBasis: '50%', padding: 13,
          borderRightWidth: i % 2 === 0 ? 1 : 0, borderRightColor: c.hair,
          borderBottomWidth: i < items.length - 2 ? 1 : 0, borderBottomColor: c.hair
        }}>
          <Text style={[T.label, { color: c.faint, marginBottom: 5 }]}>{it.k}</Text>
          <Text style={[T.metric, {
            color: it.tone === 'pos' ? c.pos : it.tone === 'neg' ? c.neg : it.tone === 'warn' ? c.warn : c.text
          }]} numberOfLines={1}>{it.v}</Text>
        </View>
      ))}
    </View>
  );
}

/* ── Buton ── */
export function Btn({ title, onPress, kind = 'ghost', style, disabled }) {
  const c = useC();
  const bg = kind === 'primary' ? c.accent : kind === 'pos' ? c.pos : kind === 'neg' ? c.neg : c.surface;
  const fg = kind === 'ghost' ? c.text : '#fff';
  return (
    <Pressable onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [{
        backgroundColor: bg, borderRadius: 11, paddingVertical: 12, paddingHorizontal: 16,
        alignItems: 'center', borderWidth: kind === 'ghost' ? 1 : 0, borderColor: c.hair,
        opacity: disabled ? .45 : pressed ? .8 : 1
      }, style]}>
      <Text style={[T.row, { color: fg, fontFamily: T.card.fontFamily }]}>{title}</Text>
    </Pressable>
  );
}

/* ── Segment seçici ── */
export function Seg({ items, value, onChange, style }) {
  const c = useC();
  return (
    <View style={[{ flexDirection: 'row', backgroundColor: c.sunk, borderRadius: 11, padding: 3 }, style]}>
      {items.map(([k, l]) => {
        const on = value === k;
        return (
          <Pressable key={k} onPress={() => onChange(k)} style={{
            flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center',
            backgroundColor: on ? c.surface : 'transparent'
          }}>
            <Text numberOfLines={1} style={[T.label, { fontFamily: T.card.fontFamily, color: on ? c.text : c.faint }]}>{l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── Etiket rozeti ── */
export function Chip({ text, tone }) {
  const c = useC();
  const map = { pos: [c.posSoft, c.pos], neg: [c.negSoft, c.neg], warn: [c.warnSoft, c.warn], accent: [c.accentSoft, c.accent] };
  const [bg, fg] = map[tone] || [c.sunk, c.muted];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 }}>
      <Text style={[T.label, { color: fg, fontSize: 10.5, fontFamily: T.card.fontFamily }]}>{text}</Text>
    </View>
  );
}

/* ── Sinyal satırı ── */
export function Signal({ title, body, tone = 'warn' }) {
  const c = useC();
  const col = tone === 'stop' ? c.neg : tone === 'info' ? c.accent : c.warn;
  return (
    <View style={{ flexDirection: 'row', gap: 11, paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hair }}>
      <View style={{ width: 4, borderRadius: 2, backgroundColor: col }} />
      <View style={{ flex: 1 }}>
        {title ? <Text style={[T.card, { fontSize: 13.5, color: c.text, marginBottom: 3 }]}>{title}</Text> : null}
        <Text style={[T.body, { color: c.muted }]}>{body}</Text>
      </View>
    </View>
  );
}

export function Empty({ text }) {
  const c = useC();
  return <Text style={[T.body, { color: c.faint, textAlign: 'center', paddingVertical: 28 }]}>{text}</Text>;
}

export function Note({ children }) {
  const c = useC();
  return <Text style={[T.caption, { color: c.faint, marginTop: 10 }]}>{children}</Text>;
}
