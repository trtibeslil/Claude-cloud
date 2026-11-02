// Ortak renkler ve arayüz parçaları: seçilebilir sıcak renk temaları, taze yeşil "tamam" rengi;
// çerçevesiz gölgeli kartlar ve hap düğmeler.
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { createContext, useContext, useRef, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator, Animated, PanResponder, Pressable, StyleSheet, Text, TextInput, View, useColorScheme,
  type TextInputProps, type ViewStyle,
} from 'react-native';

// Ortak zeminler; her tema yalnızca ana renk, ikincil renk ve sıcak zemin tonlarını değiştirir.
const baseLight = {
  surface: '#FFFFFF', fresh: '#2E8B4B', freshInk: '#FFFFFF', freshSoft: '#DCF2E2',
  warn: '#9A5600', warnSoft: '#FFE9BF', danger: '#C42B2B', dangerSoft: '#FCDFDB', mode: 'light' as 'light' | 'dark',
};
const baseDark: typeof baseLight = {
  surface: '#211814', fresh: '#6CCF8A', freshInk: '#0E2015', freshSoft: '#1C3424',
  warn: '#FFC56A', warnSoft: '#3A2A12', danger: '#FF8C7C', dangerSoft: '#3E1E1A', mode: 'dark',
};
type Tones = { bg: string; field: string; ink: string; muted: string; line: string; accent: string; accentInk: string; accentSoft: string; accent2: string; accent2Soft: string; shadow: string };
const theme = (l: Tones, d: Tones & { surface: string }) => ({ light: { ...baseLight, ...l }, dark: { ...baseDark, ...d } });

/** Renk temaları (Ayarlar > Renk teması). Hepsi sıcak, iştah açıcı tonlar; koyu modda aynı aile. */
export const PALETTES = {
  portakal: { name: 'Portakal', ...theme(
    { bg: '#FFF8F0', field: '#FFEEDC', ink: '#2D1A0E', muted: '#80654F', line: '#F3E0CC', accent: '#F26B1D', accentInk: '#FFFFFF', accentSoft: '#FFE3CC', accent2: '#FFB21A', accent2Soft: '#FFF0C7', shadow: '#5A2A08' },
    { bg: '#16100B', surface: '#22180F', field: '#2C2016', ink: '#FAEFE4', muted: '#C0A48C', line: '#3B2C1F', accent: '#FF8A3D', accentInk: '#1D0E04', accentSoft: '#45291A', accent2: '#FFC547', accent2Soft: '#3B2E10', shadow: '#000000' }) },
  nar: { name: 'Nar', ...theme(
    { bg: '#FFF6F5', field: '#FFE8E6', ink: '#2B1214', muted: '#81605F', line: '#F4DCDA', accent: '#C8233F', accentInk: '#FFFFFF', accentSoft: '#FCDDE2', accent2: '#F49A3F', accent2Soft: '#FFEBD3', shadow: '#4A0E18' },
    { bg: '#170D0E', surface: '#231416', field: '#2E1B1D', ink: '#FBECEC', muted: '#C39C9E', line: '#3E2629', accent: '#FF5C77', accentInk: '#22060B', accentSoft: '#4A1D25', accent2: '#FFB061', accent2Soft: '#3D2913', shadow: '#000000' }) },
  zeytin: { name: 'Zeytin & Limon', ...theme(
    { bg: '#FAF9F0', field: '#F0EFDD', ink: '#1F2414', muted: '#696E55', line: '#E6E5CF', accent: '#5E8A2C', accentInk: '#FFFFFF', accentSoft: '#E3EED1', accent2: '#E8B91C', accent2Soft: '#FBF0C6', shadow: '#2A3510' },
    { bg: '#11140C', surface: '#1B2014', field: '#252B1C', ink: '#EEF2E2', muted: '#A9B094', line: '#323A26', accent: '#A3CF5E', accentInk: '#141C06', accentSoft: '#2C3A1C', accent2: '#F2CD4B', accent2Soft: '#3A3312', shadow: '#000000' }) },
  karamel: { name: 'Karamel', ...theme(
    { bg: '#FFF8EE', field: '#F8EBDA', ink: '#2E1D10', muted: '#7E6650', line: '#EFDFCB', accent: '#B8692A', accentInk: '#FFFFFF', accentSoft: '#F6E2CD', accent2: '#E3A72F', accent2Soft: '#FBEDC9', shadow: '#4A2A10' },
    { bg: '#15100B', surface: '#211812', field: '#2B2018', ink: '#F8EEE3', muted: '#BFA58E', line: '#3A2D22', accent: '#E39A5B', accentInk: '#1E1006', accentSoft: '#43301F', accent2: '#F0C462', accent2Soft: '#3A3014', shadow: '#000000' }) },
  domates: { name: 'Domates', ...theme(
    { bg: '#FFF6F0', field: '#FFEFE5', ink: '#2B1A13', muted: '#7D665B', line: '#F2DED2', accent: '#E4491C', accentInk: '#FFFFFF', accentSoft: '#FFE1D3', accent2: '#F2A007', accent2Soft: '#FFEFC7', shadow: '#50220C' },
    { bg: '#15100D', surface: '#211814', field: '#2B201A', ink: '#F8EDE6', muted: '#BBA296', line: '#3A2B23', accent: '#FF7245', accentInk: '#1C0D07', accentSoft: '#42231A', accent2: '#FFC147', accent2Soft: '#3B2D10', shadow: '#000000' }) },
};
export type PaletteId = keyof typeof PALETTES;
export const DEFAULT_PALETTE: PaletteId = 'portakal';
export type Colors = (typeof PALETTES)[PaletteId]['light'];
const ThemeCtx = createContext<Colors>(PALETTES[DEFAULT_PALETTE].light);
export function ThemeProvider({ children, palette }: { children: ReactNode; palette?: string }) {
  const scheme = useColorScheme();
  const p = PALETTES[(palette ?? DEFAULT_PALETTE) as PaletteId] ?? PALETTES[DEFAULT_PALETTE];
  return <ThemeCtx.Provider value={scheme === 'dark' ? p.dark : p.light}>{children}</ThemeCtx.Provider>;
}
export const useColors = () => useContext(ThemeCtx);
export const isDark = (c: Colors) => c.mode === 'dark';
export const shadow = (c: Colors, strong = false): ViewStyle => ({
  shadowColor: c.shadow, shadowOpacity: isDark(c) ? 0.45 : strong ? 0.16 : 0.08,
  shadowRadius: strong ? 22 : 14, shadowOffset: { width: 0, height: strong ? 10 : 6 }, elevation: strong ? 8 : 3,
});

export type IconName = ComponentProps<typeof Ionicons>['name'];
export const Icon = ({ name, size = 20, color }: { name: IconName; size?: number; color: string }) =>
  <Ionicons name={name} size={size} color={color} />;

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[s.card, { backgroundColor: c.surface }, shadow(c), style]}>{children}</View>;
}

export function T({ children, kind = 'body', color, style, numberOfLines }: {
  children: ReactNode; kind?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'label' | 'mono';
  color?: string; style?: object; numberOfLines?: number;
}) {
  const c = useColors();
  const def = kind === 'small' ? c.muted : kind === 'label' ? c.accent : c.ink;
  return <Text numberOfLines={numberOfLines} style={[s[kind], { color: color ?? def }, style]}>{children}</Text>;
}

export function Btn({ title, onPress, kind = 'plain', disabled, busy, style, icon }: {
  title: string; onPress: () => void; kind?: 'primary' | 'plain' | 'ghost' | 'danger';
  disabled?: boolean; busy?: boolean; style?: ViewStyle; icon?: IconName;
}) {
  const c = useColors();
  const bg = kind === 'primary' ? c.accent : kind === 'ghost' ? 'transparent' : kind === 'danger' ? c.dangerSoft : c.field;
  const fg = kind === 'primary' ? c.accentInk : kind === 'danger' ? c.danger : kind === 'ghost' ? c.accent : c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        kind === 'primary' && !disabled ? { shadowColor: c.accent, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 } : null, style]}
    >
      {busy ? <ActivityIndicator color={fg} size="small" /> : icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text style={[s.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

/** Yalnızca simgeli yuvarlak düğme (ayarlar, kapat gibi). */
export function IconBtn({ name, label, onPress, tone = 'plain' }: { name: IconName; label: string; onPress: () => void; tone?: 'plain' | 'accent' }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8}
      style={({ pressed }) => [s.iconBtn, { backgroundColor: tone === 'accent' ? c.accentSoft : c.surface, transform: [{ scale: pressed ? 0.94 : 1 }] }, shadow(c)]}>
      <Icon name={name} size={20} color={tone === 'accent' ? c.accent : c.ink} />
    </Pressable>
  );
}

export function Field(props: TextInputProps & { width?: number }) {
  const c = useColors();
  const { width, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={c.muted}
      {...rest}
      style={[s.field, { backgroundColor: c.field, color: c.ink }, width ? { width } : { flex: 1 }, style]}
    />
  );
}

export function Chip({ text, tone = 'soft' }: { text: string; tone?: 'soft' | 'warn' | 'done' }) {
  const c = useColors();
  const bg = tone === 'warn' ? c.warnSoft : tone === 'done' ? c.fresh : c.accentSoft;
  const fg = tone === 'warn' ? c.warn : tone === 'done' ? c.freshInk : c.ink;
  return <View style={[s.chip, { backgroundColor: bg }]}><Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{text}</Text></View>;
}

export function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={onPress}
      style={[s.toggle, { backgroundColor: on ? c.accent : c.field }]}>
      <Text style={{ color: on ? c.accentInk : c.ink, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  const c = useColors();
  const btn = (dir: -1 | 1) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label + (dir < 0 ? ' azalt' : ' artır')}
      onPress={() => { const n = value + dir; if (n >= min && n <= max) onChange(n); }}
      style={[s.stepBtn, { backgroundColor: c.surface }, shadow(c)]}>
      <Icon name={dir < 0 ? 'remove' : 'add'} size={18} color={c.ink} />
    </Pressable>
  );
  return (
    <View style={[s.stepper, { backgroundColor: c.field }]} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ now: value, min, max }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={e => { const n = value + (e.nativeEvent.actionName === 'increment' ? 1 : -1); if (n >= min && n <= max) onChange(n); }}>
      {btn(-1)}
      <Text style={[s.mono, { color: c.ink, fontSize: 17, minWidth: 34, textAlign: 'center' }]}>{value}</Text>
      {btn(1)}
    </View>
  );
}

export function Notice({ text, tone = 'warn' }: { text: string; tone?: 'warn' | 'info' | 'err' }) {
  const c = useColors();
  const bg = tone === 'err' ? c.dangerSoft : tone === 'info' ? c.accent2Soft : c.warnSoft;
  const fg = tone === 'err' ? c.danger : tone === 'info' ? c.ink : c.warn;
  return <View style={[s.notice, { backgroundColor: bg }]}><Text style={{ color: fg, fontSize: 14, lineHeight: 20 }}>{text}</Text></View>;
}

export const Row = ({ children, style }: { children: ReactNode; style?: ViewStyle }) =>
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, style]}>{children}</View>;

const TRIGGER = 80; // bu kadar kaydırınca işlem yapılır (px)

/**
 * Sağa kaydır: ekle / artır, sola kaydır: azalt / çıkar. Dokunarak açılan düzenleme ve düğmeler yerinde kalır;
 * kaydırma onlara ek bir kısayoldur. Ekran okuyucu kullananlar için aynı işlemler erişilebilirlik eylemi olarak da var.
 */
export function SwipeRow({ children, enabled, haptics, onRight, onLeft, rightLabel, leftLabel }: {
  children: ReactNode; enabled: boolean; haptics: boolean;
  onRight?: () => void; onLeft?: () => void; rightLabel: string; leftLabel: string;
}) {
  const c = useColors();
  const x = useRef(new Animated.Value(0)).current;
  const armed = useRef<0 | 1 | -1>(0);
  // Yanıtlayıcı bir kez kurulur; güncel geri çağrılar ref üzerinden okunur (hareket sırasında yeniden çizim bozmasın).
  const cb = useRef({ enabled, haptics, onRight, onLeft });
  cb.current = { enabled, haptics, onRight, onLeft };
  const buzz = (style: Haptics.ImpactFeedbackStyle) => { if (cb.current.haptics) Haptics.impactAsync(style).catch(() => {}); };
  const reset = () => { armed.current = 0; Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 7 }).start(); };

  const responder = useRef(PanResponder.create({
    // Yatay hareket başlayınca satırın içindeki dokunma düğmesinden önce yakala (capture), dikey kaydırmaya karışma.
    onMoveShouldSetPanResponderCapture: (_, g) => cb.current.enabled && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => {
      let dx = g.dx;
      if ((dx > 0 && !cb.current.onRight) || (dx < 0 && !cb.current.onLeft)) dx = dx / 6; // o yönde işlem yoksa direnç
      x.setValue(Math.max(-150, Math.min(150, dx)));
      const now: 0 | 1 | -1 = dx > TRIGGER && cb.current.onRight ? 1 : dx < -TRIGGER && cb.current.onLeft ? -1 : 0;
      if (now !== armed.current) { armed.current = now; if (now) buzz(Haptics.ImpactFeedbackStyle.Light); }
    },
    onPanResponderRelease: () => {
      const a = armed.current;
      if (a === 1) { buzz(Haptics.ImpactFeedbackStyle.Medium); cb.current.onRight?.(); }
      if (a === -1) { buzz(Haptics.ImpactFeedbackStyle.Medium); cb.current.onLeft?.(); }
      reset();
    },
    onPanResponderTerminate: reset,
  })).current;

  const rightOpacity = x.interpolate({ inputRange: [0, 24, TRIGGER], outputRange: [0, 0.6, 1], extrapolate: 'clamp' });
  const leftOpacity = x.interpolate({ inputRange: [-TRIGGER, -24, 0], outputRange: [1, 0.6, 0], extrapolate: 'clamp' });
  const actions = [
    ...(onRight ? [{ name: 'increment', label: rightLabel }] : []),
    ...(onLeft ? [{ name: 'decrement', label: leftLabel }] : []),
  ];

  return (
    <View accessibilityActions={actions}
      onAccessibilityAction={e => (e.nativeEvent.actionName === 'increment' ? onRight?.() : onLeft?.())}>
      {onRight ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.swipeBg, { backgroundColor: c.freshSoft, opacity: rightOpacity, justifyContent: 'flex-start' }]}>
          <Icon name="add-circle" size={22} color={c.fresh} />
          <Text style={{ color: c.fresh, fontWeight: '700' }}>{rightLabel}</Text>
        </Animated.View>
      ) : null}
      {onLeft ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.swipeBg, { backgroundColor: c.dangerSoft, opacity: leftOpacity, justifyContent: 'flex-end' }]}>
          <Text style={{ color: c.danger, fontWeight: '700' }}>{leftLabel}</Text>
          <Icon name="remove-circle" size={22} color={c.danger} />
        </Animated.View>
      ) : null}
      <Animated.View {...responder.panHandlers} style={{ transform: [{ translateX: x }], backgroundColor: c.surface, borderRadius: 14 }}>
        {children}
      </Animated.View>
    </View>
  );
}

/** Kaydırma ipucu: ekranlarda listenin üstünde bir satır. */
export function SwipeHint({ right, left }: { right: string; left: string }) {
  const c = useColors();
  return (
    <Row style={{ gap: 14 }}>
      <Row style={{ gap: 4 }}><Icon name="arrow-forward-circle" size={16} color={c.fresh} /><T kind="small">Sağa kaydır: {right}</T></Row>
      <Row style={{ gap: 4 }}><Icon name="arrow-back-circle" size={16} color={c.danger} /><T kind="small">Sola kaydır: {left}</T></Row>
    </Row>
  );
}

export const s = StyleSheet.create({
  card: { borderRadius: 22, padding: 18, gap: 14 },
  h1: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  h2: { fontSize: 21, fontWeight: '700', letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  mono: { fontVariant: ['tabular-nums'], fontFamily: 'Menlo' },
  btn: { minHeight: 46, borderRadius: 999, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { fontSize: 15, fontWeight: '700' },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  field: { minHeight: 46, borderRadius: 14, paddingHorizontal: 12, fontSize: 15 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  toggle: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 999 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, padding: 4, gap: 4 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  notice: { borderRadius: 16, padding: 13 },
  swipeBg: { borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16 },
});
