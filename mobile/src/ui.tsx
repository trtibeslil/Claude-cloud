// Ortak renkler ve küçük arayüz parçaları.
import { createContext, useContext, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, useColorScheme, type TextInputProps, type ViewStyle } from 'react-native';

const light = {
  bg: '#EEF2EA', surface: '#FFFFFF', ink: '#1C271D', muted: '#5B6858', line: '#D8DFD2',
  accent: '#2E6A3E', accentInk: '#FFFFFF', accentSoft: '#DDEBDA',
  warn: '#8A5A0C', warnSoft: '#F5E7C8', danger: '#A83428', dangerSoft: '#F5DCD7', field: '#F4F7F1',
};
const dark: typeof light = {
  bg: '#111611', surface: '#1A211A', ink: '#E4EBE0', muted: '#98A595', line: '#2B352A',
  accent: '#84C48F', accentInk: '#0E1A10', accentSoft: '#1F3223',
  warn: '#E6BA62', warnSoft: '#362C15', danger: '#F0907F', dangerSoft: '#3A1E1A', field: '#141A14',
};
export type Colors = typeof light;
const ThemeCtx = createContext<Colors>(light);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  return <ThemeCtx.Provider value={scheme === 'dark' ? dark : light}>{children}</ThemeCtx.Provider>;
}
export const useColors = () => useContext(ThemeCtx);
export const isDark = (c: Colors) => c === dark;

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[s.card, { backgroundColor: c.surface, borderColor: c.line }, style]}>{children}</View>;
}

export function T({ children, kind = 'body', color, style, numberOfLines }: {
  children: ReactNode; kind?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'label' | 'mono';
  color?: string; style?: object; numberOfLines?: number;
}) {
  const c = useColors();
  return <Text numberOfLines={numberOfLines} style={[s[kind], { color: color ?? (kind === 'small' || kind === 'label' ? c.muted : c.ink) }, style]}>{children}</Text>;
}

export function Btn({ title, onPress, kind = 'plain', disabled, busy, style }: {
  title: string; onPress: () => void; kind?: 'primary' | 'plain' | 'ghost' | 'danger';
  disabled?: boolean; busy?: boolean; style?: ViewStyle;
}) {
  const c = useColors();
  const bg = kind === 'primary' ? c.accent : kind === 'ghost' ? 'transparent' : c.surface;
  const fg = kind === 'primary' ? c.accentInk : kind === 'danger' ? c.danger : kind === 'ghost' ? c.accent : c.ink;
  const border = kind === 'primary' ? c.accent : kind === 'ghost' ? 'transparent' : c.line;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }, style]}
    >
      {busy ? <ActivityIndicator color={fg} size="small" /> : null}
      <Text style={[s.btnText, { color: fg }]}>{title}</Text>
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
      style={[s.field, { backgroundColor: c.field, borderColor: c.line, color: c.ink }, width ? { width } : { flex: 1 }, style]}
    />
  );
}

export function Chip({ text, tone = 'soft' }: { text: string; tone?: 'soft' | 'warn' | 'done' }) {
  const c = useColors();
  const bg = tone === 'warn' ? c.warnSoft : tone === 'done' ? c.accent : c.accentSoft;
  const fg = tone === 'warn' ? c.warn : tone === 'done' ? c.accentInk : c.ink;
  return <View style={[s.chip, { backgroundColor: bg }]}><Text style={{ color: fg, fontSize: 12 }}>{text}</Text></View>;
}

export function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={onPress}
      style={[s.toggle, { borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accentSoft : 'transparent' }]}>
      <Text style={{ color: c.ink, fontWeight: '600' }}>{on ? '✓ ' : ''}{label}</Text>
    </Pressable>
  );
}

export function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  const c = useColors();
  return (
    <View style={[s.stepper, { borderColor: c.line }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={label + ' azalt'} onPress={() => value > min && onChange(value - 1)} style={s.stepBtn}>
        <Text style={{ color: c.ink, fontSize: 20 }}>−</Text>
      </Pressable>
      <Text style={[s.mono, { color: c.ink, fontSize: 17, minWidth: 34, textAlign: 'center' }]}>{value}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={label + ' artır'} onPress={() => value < max && onChange(value + 1)} style={s.stepBtn}>
        <Text style={{ color: c.ink, fontSize: 20 }}>+</Text>
      </Pressable>
    </View>
  );
}

export function Notice({ text, tone = 'warn' }: { text: string; tone?: 'warn' | 'info' | 'err' }) {
  const c = useColors();
  const bg = tone === 'err' ? c.dangerSoft : tone === 'info' ? c.accentSoft : c.warnSoft;
  const fg = tone === 'err' ? c.danger : tone === 'info' ? c.ink : c.warn;
  return <View style={[s.notice, { backgroundColor: bg }]}><Text style={{ color: fg, fontSize: 14, lineHeight: 20 }}>{text}</Text></View>;
}

export const Row = ({ children, style }: { children: ReactNode; style?: ViewStyle }) =>
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, style]}>{children}</View>;

export const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 12 },
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700' },
  h3: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.9, textTransform: 'uppercase' },
  mono: { fontVariant: ['tabular-nums'], fontFamily: 'Menlo' },
  btn: { minHeight: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { fontSize: 15, fontWeight: '600' },
  field: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, fontSize: 15 },
  chip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  toggle: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10 },
  stepBtn: { width: 44, height: 42, alignItems: 'center', justifyContent: 'center' },
  notice: { borderRadius: 12, padding: 12 },
});
