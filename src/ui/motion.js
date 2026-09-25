import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View, Pressable } from 'react-native';
import { useC } from './kit';
import { T } from './type';

/* ============================================================
   HAREKET
   Hiçbiri süs değil: sayı sayarak artınca değişimin büyüklüğü
   hissediliyor, kartlar sırayla girince göz yukarıdan aşağı
   okuyor, basınca küçülen buton dokunmanın kaydedildiğini
   söylüyor. Süreler kısa — 200–420 ms arası.
   ============================================================ */

/* Sayı sayarak artar. format: (n) => string */
export function CountUp({ value, format, style, duration = 700 }) {
  const av = useRef(new Animated.Value(0)).current;
  const prev = useRef(0);
  const [txt, setTxt] = useState(() => format(value || 0));

  useEffect(() => {
    const from = prev.current, to = value || 0;
    prev.current = to;
    if (from === to) { setTxt(format(to)); return; }
    av.setValue(0);
    const id = av.addListener(({ value: p }) => setTxt(format(from + (to - from) * p)));
    Animated.timing(av, {
      toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false
    }).start(() => setTxt(format(to)));
    return () => av.removeListener(id);
  }, [value]);

  return <Text style={style} numberOfLines={1}>{txt}</Text>;
}

/* Kartlar sırayla girer. index → gecikme */
export function Enter({ children, index = 0, style }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1, duration: 380, delay: Math.min(index * 55, 330),
      easing: Easing.out(Easing.cubic), useNativeDriver: true
    }).start();
  }, []);
  return (
    <Animated.View style={[style, {
      opacity: a,
      transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }]
    }]}>{children}</Animated.View>
  );
}

/* Basınca yaylanan dokunma alanı */
export function Press({ children, onPress, onLongPress, style, scaleTo = 0.975, disabled }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = v => Animated.spring(s, {
    toValue: v, useNativeDriver: true, speed: 40, bounciness: 6
  }).start();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={() => to(scaleTo)} onPressOut={() => to(1)}
      style={style}>
      <Animated.View style={{ transform: [{ scale: s }] }}>{children}</Animated.View>
    </Pressable>
  );
}

/* Yükleme iskeleti — boş beyaz ekran yerine */
export function Skeleton({ h = 14, w = '100%', r = 7, style }) {
  const c = useC();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(a, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
    ])).start();
  }, []);
  return (
    <Animated.View style={[{
      height: h, width: w, borderRadius: r, backgroundColor: c.sunk,
      opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] })
    }, style]} />
  );
}

export function CardSkeleton() {
  const c = useC();
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 16, borderWidth: 1,
      borderColor: c.hair, padding: 16, marginBottom: 12 }}>
      <Skeleton h={11} w="38%" style={{ marginBottom: 14 }} />
      <Skeleton h={30} w="62%" style={{ marginBottom: 10 }} />
      <Skeleton h={11} w="80%" />
    </View>
  );
}

/* Boş durum: gri yazı değil, sebep + çıkış yolu */
export function EmptyState({ icon, title, body, action, onAction }) {
  const c = useC();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.sunk,
        alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>{icon}</View>
      <Text style={[T.card, { color: c.text, marginBottom: 5, textAlign: 'center' }]}>{title}</Text>
      {body ? <Text style={[T.caption, { color: c.faint, textAlign: 'center', maxWidth: 260 }]}>{body}</Text> : null}
      {action ? (
        <Pressable onPress={onAction} style={{ marginTop: 14, paddingHorizontal: 16, paddingVertical: 9,
          borderRadius: 10, backgroundColor: c.accentSoft }}>
          <Text style={[T.row, { color: c.accent }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
