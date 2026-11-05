import React, { ReactNode, useEffect, useState } from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  FadeInDown,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { colors, radius, space, springs, type } from '../theme/tokens';
import { PressableScale } from './PressableScale';

/* ---------- Status colours: meaning only ---------- */
const TONES: Record<string, { color: string; label: string }> = {
  paid: { color: colors.success, label: 'Paid' },
  booked: { color: colors.success, label: 'Booked' },
  approved: { color: colors.success, label: 'Approved' },
  published: { color: colors.success, label: 'Approved' },
  active: { color: colors.success, label: 'Active' },
  available: { color: colors.success, label: 'Available' },
  pending: { color: colors.warning, label: 'Pending' },
  processing: { color: colors.warning, label: 'Processing' },
  invited: { color: colors.warning, label: 'Invited' },
  cancelled: { color: colors.danger, label: 'Cancelled' },
  suspended: { color: colors.danger, label: 'Switched off' },
  rejected: { color: colors.danger, label: 'Rejected' },
  low_stock: { color: colors.warning, label: 'Low stock' },
  out_of_stock: { color: colors.danger, label: 'Sold out' },
  in_progress: { color: colors.warning, label: 'In progress' },
  pending_payment: { color: colors.warning, label: 'Pending payment' },
  awaiting_confirmation: { color: colors.warning, label: 'Awaiting confirmation' },
  confirmed: { color: colors.success, label: 'Confirmed' },
  shipped: { color: colors.success, label: 'Shipped' },
  fulfilled: { color: colors.success, label: 'Fulfilled' },
  refunded: { color: colors.slate, label: 'Refunded' },
  completed: { color: colors.slate, label: 'Completed' },
};

export function StatusPill({ status }: { status: string }) {
  const t = TONES[status] ?? { color: colors.slate, label: status.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) };
  return (
    <View style={s.pill}>
      <View style={[s.dot, { backgroundColor: t.color }]} />
      <Text style={s.pillText}>{t.label}</Text>
    </View>
  );
}

export function Avatar({ uri, size = 44 }: { uri?: string; size?: number }) {
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.offWhite }} contentFit="cover" transition={200} />;
}

export function Card({ children, style, onPress, index = 0 }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; index?: number }) {
  const reducedMotion = useReducedMotion();
  const body = (
    <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(Math.min(index, 8) * 45).springify().damping(18)} style={[s.card, style]}>
      {children}
    </Animated.View>
  );
  if (!onPress) return body;
  return (
    <PressableScale onPress={onPress} pressedScale={0.98} accessibilityRole="button">
      {body}
    </PressableScale>
  );
}

export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={type.display}>{title}</Text>
      {subtitle ? <Text style={[type.body, { color: colors.slate }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function Label({ children }: { children: string }) {
  return <Text style={type.label}>{children}</Text>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={s.empty}>
      <Text style={type.title}>{title}</Text>
      {hint ? <Text style={[type.body, { color: colors.slate, textAlign: 'center' }]}>{hint}</Text> : null}
    </View>
  );
}

export function NoAccess({ what }: { what: string }) {
  return <Empty title="Not part of your role" hint={`You can't open ${what}. Ask an Admin if you need it.`} />;
}

/* ---------- Segmented control with sliding pill ---------- */
export function Segmented<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string }[] }) {
  const reducedMotion = useReducedMotion();
  const [w, setW] = useState(0);
  const idx = Math.max(0, items.findIndex((i) => i.value === value));
  const seg = (w - 8) / items.length;
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = reducedMotion ? idx * seg : withSpring(idx * seg, springs.page);
  }, [idx, seg, x, reducedMotion]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={s.segment} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 ? <Animated.View style={[s.segThumb, { width: seg }, thumb]} /> : null}
      {items.map((it) => (
        <PressableScale key={it.value} onPress={() => onChange(it.value)} pressedScale={0.96} style={s.segItem} accessibilityRole="tab" accessibilityState={{ selected: it.value === value }}>
          <Text style={[s.segText, { color: it.value === value ? colors.white : colors.slate }]} numberOfLines={1}>
            {it.label}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}

/* ---------- Selectable chip ---------- */
export function Chip({ label, active, onPress, disabled }: { label: string; active: boolean; onPress: () => void; disabled?: boolean }) {
  const reducedMotion = useReducedMotion();
  const p = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    p.value = reducedMotion ? (active ? 1 : 0) : withTiming(active ? 1 : 0, { duration: 180 });
  }, [active, p, reducedMotion]);
  const bg = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.value, [0, 1], [colors.offWhite, colors.black]) }));
  const txt = useAnimatedStyle(() => ({ color: interpolateColor(p.value, [0, 1], [colors.black, colors.white]) }));
  return (
    <PressableScale onPress={onPress} disabled={disabled} pressedScale={0.94} accessibilityRole="button" accessibilityState={{ selected: active, disabled }}>
      <Animated.View style={[s.chip, bg, disabled && { opacity: 0.4 }]}>
        <Animated.Text style={[s.chipText, txt]}>{label}</Animated.Text>
      </Animated.View>
    </PressableScale>
  );
}

/* ---------- Switch ---------- */
export function Toggle({ value, onChange, disabled, label }: { value: boolean; onChange: () => void; disabled?: boolean; label: string }) {
  const reducedMotion = useReducedMotion();
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    x.value = reducedMotion ? (value ? 1 : 0) : withSpring(value ? 1 : 0, springs.press);
  }, [value, x, reducedMotion]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 20 }] }));
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(x.value, [0, 1], ['#D1D1D6', colors.black]) }));
  return (
    <PressableScale onPress={onChange} disabled={disabled} pressedScale={0.94} accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value, disabled }}>
      <Animated.View style={[s.track, track, disabled && { opacity: 0.4 }]}>
        <Animated.View style={[s.knob, knob]} />
      </Animated.View>
    </PressableScale>
  );
}

/* ---------- Text field ---------- */
export function Field({ label, hint, ...input }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <TextInput placeholderTextColor={colors.slate} style={s.input} {...input} />
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

/* ---------- Count-up number ---------- */
export function CountUp({ value, format = (n) => String(Math.round(n)), style }: { value: number; format?: (n: number) => string; style?: StyleProp<TextStyle> }) {
  const reducedMotion = useReducedMotion();
  const [text, setText] = useState(() => format(0));
  useEffect(() => {
    if (reducedMotion) {
      setText(format(value));
      return;
    }
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / 1000);
      setText(format(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reducedMotion]);
  return <Text style={style}>{text}</Text>;
}

/* ---------- Bar chart: bars spring up from zero on the UI thread ---------- */
function Bar({ ratio, i, highlight, height }: { ratio: number; i: number; highlight: boolean; height: number }) {
  const reducedMotion = useReducedMotion();
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = reducedMotion ? Math.max(6, ratio * height) : withDelay(i * 60, withSpring(Math.max(6, ratio * height), springs.page));
  }, [ratio, i, height, h, reducedMotion]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={[s.bar, { backgroundColor: highlight ? colors.black : '#C7C7CC' }, style]} />;
}

export function BarChart({ data, height = 120, format }: { data: { label: string; value: number }[]; height?: number; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const topIdx = data.findIndex((d) => d.value === max);
  return (
    <View>
      <View style={[s.bars, { height }]}>
        {data.map((d, i) => (
          <View key={d.label} style={s.barCol}>
            {i === topIdx && format ? <Text style={s.barTip}>{format(d.value)}</Text> : null}
            <Bar ratio={d.value / max} i={i} height={height - 18} highlight={i === topIdx} />
          </View>
        ))}
      </View>
      <View style={s.barLabels}>
        {data.map((d) => (
          <Text key={d.label} style={s.barLabel}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.white },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: colors.charcoal },
  card: { backgroundColor: colors.offWhite, borderRadius: radius.lg, padding: space.lg },
  empty: { alignItems: 'center', gap: 6, padding: space.xxl, backgroundColor: colors.offWhite, borderRadius: radius.lg },
  segment: { flexDirection: 'row', backgroundColor: colors.offWhite, borderRadius: radius.pill, padding: 4 },
  segThumb: { position: 'absolute', top: 4, left: 4, bottom: 4, borderRadius: radius.pill, backgroundColor: colors.black },
  segItem: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center' },
  segText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '700' },
  track: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center', paddingHorizontal: 4 },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white },
  input: { height: 50, borderRadius: radius.md, backgroundColor: colors.offWhite, paddingHorizontal: 16, fontSize: 15, color: colors.black },
  hint: { fontSize: 12, color: colors.slate },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 8 },
  barTip: { fontSize: 10, fontWeight: '800', color: colors.black, marginBottom: 4 },
  barLabels: { flexDirection: 'row', gap: 8, marginTop: 8 },
  barLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600', color: colors.slate },
});
