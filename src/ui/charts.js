import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Line, Circle, Rect, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useC } from './kit';

const sample = (pts, max) => {
  if (pts.length <= max) return pts;
  const out = [], step = (pts.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(pts[Math.round(i * step)]);
  return out;
};

/* ── Kasa eğrisi ── */
export function AreaChart({ points, height = 170, money, dateLabel, dark }) {
  const c = useC();
  const pts = sample(points || [], 80);
  if (pts.length < 2) return <Text style={{ color: c.faint, fontSize: 12.5, textAlign: 'center', paddingVertical: 30 }}>Grafik için yeterli veri yok</Text>;
  const W = 320, H = height, L = 4, R = 4, T = 10, B = 20;
  const vs = pts.map(p => p.v);
  let mn = Math.min(...vs), mx = Math.max(...vs);
  const pad = (mx - mn) * .2 || Math.abs(mx) * .1 || 1; mn -= pad; mx += pad;
  const X = i => L + i / (pts.length - 1) * (W - L - R);
  const Y = v => T + (1 - (v - mn) / (mx - mn)) * (H - T - B);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
  const line = dark ? '#96A2FF' : c.accent;
  const grid = dark ? 'rgba(255,255,255,.09)' : 'rgba(15,23,41,.07)';
  const lab = dark ? 'rgba(242,245,250,.45)' : c.faint;

  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="ac" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={line} stopOpacity="0.20" />
            <Stop offset="1" stopColor={line} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {[0, .5, 1].map(g => (
          <Line key={g} x1={L} x2={W - R} y1={T + g * (H - T - B)} y2={T + g * (H - T - B)}
            stroke={grid} strokeWidth="1" />
        ))}
        <Path d={`${d} L${X(pts.length - 1)} ${H - B} L${L} ${H - B} Z`} fill="url(#ac)" />
        <Path d={d} fill="none" stroke={line} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={X(pts.length - 1)} cy={Y(vs[vs.length - 1])} r="3.5" fill={line} />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 10.5, color: lab }}>{dateLabel(pts[0].t)}</Text>
        <Text style={{ fontSize: 10.5, color: lab }}>{money(mn + (mx - mn) / 2)}</Text>
        <Text style={{ fontSize: 10.5, color: lab }}>{dateLabel(pts[pts.length - 1].t)}</Text>
      </View>
    </View>
  );
}

/* ── Disiplin kadranı ── */
export function Gauge({ score, band, label }) {
  const c = useC();
  const W = 200, H = 116, cx = 100, cy = 100, r = 78;
  const frac = Math.max(0, Math.min(1, score / 1000));
  const len = Math.PI * r;
  const a = Math.PI * (1 - frac);
  const mx = cx + r * Math.cos(a), my = cy - r * Math.sin(a);
  const arc = `M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const col = band.tone === 'pos' ? c.pos : band.tone === 'warn' ? c.warn : c.neg;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Path d={arc} stroke={c.sunk} strokeWidth="9" fill="none" strokeLinecap="round" />
        <Path d={arc} stroke={col} strokeWidth="9" fill="none" strokeLinecap="round"
          strokeDasharray={`${len * frac} ${len}`} />
        <Circle cx={mx} cy={my} r="5.5" fill={c.surface} stroke={col} strokeWidth="3" />
        <SvgText x={cx} y={cy - 22} textAnchor="middle" fontSize="32" fontWeight="700" fill={c.text}>{score}</SvgText>
        <SvgText x={cx} y={cy - 4} textAnchor="middle" fontSize="12" fill={col}>{band.text}</SvgText>
      </Svg>
      {label ? <Text style={{ fontSize: 11.5, color: c.faint, marginTop: 2 }}>{label}</Text> : null}
    </View>
  );
}

/* ── Günlük kâr/zarar çubukları ── */
export function Bars({ data, height = 90 }) {
  const c = useC();
  const mx = Math.max(...data.map(d => Math.abs(d.v)), 1);
  const W = 320, H = height, mid = H / 2, bw = (W / data.length) * .55;
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Line x1="0" x2={W} y1={mid} y2={mid} stroke={c.hair} strokeWidth="1.5" />
      {data.map((o, i) => {
        const h = Math.max(2, Math.abs(o.v) / mx * (mid - 8));
        const x = (i + .5) * (W / data.length) - bw / 2;
        return <Rect key={i} x={x} y={o.v >= 0 ? mid - h : mid} width={bw} height={h} rx="2"
          fill={o.v > 0 ? c.pos : o.v < 0 ? c.neg : c.hair} opacity={o.v ? .9 : 1} />;
      })}
    </Svg>
  );
}
