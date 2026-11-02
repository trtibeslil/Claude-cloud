import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Pressable, ScrollView, Switch, Text, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CookSheet } from './src/screens/CookSheet';
import { DolapScreen } from './src/screens/Dolap';
import { EkleScreen } from './src/screens/Ekle';
import { GecmisScreen } from './src/screens/Gecmis';
import { MenuScreen, type CookRequest } from './src/screens/Menu';
import { StoreProvider, useStore } from './src/store';
import { Card, Icon, IconBtn, isDark, PALETTES, Row, shadow, T, TEXT_SCALES, ThemeProvider, useColors, useScale, type IconName, type PaletteId } from './src/ui';

type Tab = 'dolap' | 'ekle' | 'menu' | 'gecmis';
const TABS: { key: Tab; label: string; icon: IconName; iconOn: IconName }[] = [
  { key: 'dolap', label: 'Dolap', icon: 'file-tray-stacked-outline', iconOn: 'file-tray-stacked' },
  { key: 'ekle', label: 'Ekle', icon: 'add-circle-outline', iconOn: 'add-circle' },
  { key: 'menu', label: 'Menü', icon: 'restaurant-outline', iconOn: 'restaurant' },
  { key: 'gecmis', label: 'Geçmiş', icon: 'time-outline', iconOn: 'time' },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Themed />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

/** Seçilen renk temasını uygular (tema ayarı uygulama durumunda saklanır). */
function Themed() {
  const { state } = useStore();
  return <ThemeProvider palette={state.settings.palette} textScale={state.settings.textScale}><Main /></ThemeProvider>;
}

function Main() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { loaded, toastMsg, state, update, toast } = useStore();
  const k = useScale();
  // A− / A+: yazı boyutunu bir seviye küçült/büyüt
  const stepText = (dir: 1 | -1) => {
    const i = TEXT_SCALES.findIndex(([v]) => v === (state.settings.textScale || 1));
    const next = TEXT_SCALES[Math.min(TEXT_SCALES.length - 1, Math.max(0, (i < 0 ? 1 : i) + dir))];
    update(s => ({ ...s, settings: { ...s.settings, textScale: next[0] } }));
    toast(`Yazı boyutu: ${next[1]}`);
  };
  const [tab, setTab] = useState<Tab>('dolap');
  const [cook, setCook] = useState<CookRequest | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const go = (t: Tab) => { setTab(t); scroll.current?.scrollTo({ y: 0, animated: false }); };
  const tabBarSpace = 86 * Math.max(1, k) + insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={isDark(c) ? 'light' : 'dark'} />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: tabBarSpace + 16, paddingLeft: Math.max(16, insets.left), paddingRight: Math.max(16, insets.right), gap: 18 }}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <Text style={{ fontSize: 30 * Math.min(k, 1.2), fontWeight: '800', letterSpacing: -0.6, color: c.ink, flexShrink: 1 }}>
              Dolap <Text style={{ color: c.accent }}>Defteri</Text>
            </Text>
            <Row style={{ gap: 6, flexWrap: 'nowrap' }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Yazıyı küçült" onPress={() => stepText(-1)} hitSlop={6}
                style={[{ height: 42, minWidth: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface }, shadow(c)]}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: c.ink }}>A−</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Yazıyı büyüt" onPress={() => stepText(1)} hitSlop={6}
                style={[{ height: 42, minWidth: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface }, shadow(c)]}>
                <Text style={{ fontSize: 19, fontWeight: '800', color: c.ink }}>A+</Text>
              </Pressable>
              <IconBtn name="options-outline" label="Ayarlar" onPress={() => setSettingsOpen(true)} />
            </Row>
          </Row>
          {!loaded ? <ActivityIndicator color={c.muted} /> :
            tab === 'dolap' ? <DolapScreen go={go} /> :
            tab === 'ekle' ? <EkleScreen go={go} /> :
            tab === 'menu' ? <MenuScreen onCook={setCook} /> :
            <GecmisScreen />}
        </ScrollView>
      </KeyboardAvoidingView>

      {toastMsg ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: tabBarSpace + 8, alignItems: 'center' }}>
          <View accessibilityLiveRegion="polite" style={[{ backgroundColor: c.ink, paddingLeft: 18, paddingRight: toastMsg.action ? 6 : 18, paddingVertical: 6, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }, shadow(c, true)]}>
            <Text style={{ color: c.bg, fontSize: 14 * k, fontWeight: '600', flexShrink: 1 }}>{toastMsg.msg}</Text>
            {toastMsg.action ? (
              <Pressable accessibilityRole="button" onPress={toastMsg.action.onPress}
                style={{ backgroundColor: c.accent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ color: c.accentInk, fontWeight: '700', fontSize: 14 * k }}>{toastMsg.action.label}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <View accessibilityRole="tablist" style={[{
        position: 'absolute', left: Math.max(12, insets.left), right: Math.max(12, insets.right), bottom: insets.bottom + 10,
        flexDirection: 'row', backgroundColor: c.surface, borderRadius: 26, padding: 6, gap: 4,
      }, shadow(c, true)]}>
        {TABS.map(t => {
          const on = t.key === tab;
          return (
            <Pressable key={t.key} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.label} onPress={() => go(t.key)}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2, borderRadius: 20, backgroundColor: on ? c.accentSoft : 'transparent' }}>
              <Icon name={on ? t.iconOn : t.icon} size={22} color={on ? c.accent : c.muted} />
              <Text style={{ fontSize: 12 * Math.min(k, 1.3), fontWeight: '700', color: on ? c.accent : c.muted }} numberOfLines={1}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <CookSheet req={cook} onClose={() => setCook(null)} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useColors();
  const { state, update } = useStore();
  const st = state.settings;
  const set = (patch: Partial<typeof st>) => update(s => ({ ...s, settings: { ...s.settings, ...patch } }));
  const row = (title: string, desc: string, value: boolean, onChange: (v: boolean) => void) => (
    <Row style={{ flexWrap: 'nowrap', gap: 14 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontWeight: '700' }}>{title}</T>
        <T kind="small">{desc}</T>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.accent }} accessibilityLabel={title} />
    </Row>
  );
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, gap: 18 }}>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <T kind="h2">Ayarlar</T>
          <IconBtn name="close" label="Kapat" onPress={onClose} />
        </Row>
        <Card>
          <T kind="label">Ekleme ve çıkarma</T>
          {row('Kaydırarak ekle ve azalt',
            'Dolapta ve ürün listesinde bir satırı sağa kaydırınca eklenir, sola kaydırınca azaltılır. Dokunarak düzenleme her zaman açık.',
            st.swipe, v => set({ swipe: v }))}
          {row('Titreşimle geri bildirim', 'Kaydırma işlemi gerçekleşince telefon hafifçe titrer.', st.haptics, v => set({ haptics: v }))}
        </Card>
        <Card>
          <T kind="label">Yazı boyutu</T>
          <T kind="small">Tüm metin ve düğmeler büyür. Başlıktaki A− ve A+ ile de değiştirebilirsin.</T>
          <Row style={{ gap: 6 }}>
            {TEXT_SCALES.map(([v, name]) => {
              const on = (st.textScale || 1) === v;
              return (
                <Pressable key={v} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`Yazı boyutu ${name}`}
                  onPress={() => set({ textScale: v })}
                  style={{ alignItems: 'center', justifyContent: 'center', minWidth: 56, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14, backgroundColor: on ? c.accent : c.field }}>
                  <Text style={{ fontSize: 16 * v, fontWeight: '800', color: on ? c.accentInk : c.ink }}>Aa</Text>
                  <Text style={{ fontSize: 11, color: on ? c.accentInk : c.muted }}>{name}</Text>
                </Pressable>
              );
            })}
          </Row>
        </Card>
        <Card>
          <T kind="label">Renk teması</T>
          {(Object.keys(PALETTES) as PaletteId[]).map(id => {
            const p = PALETTES[id], on = (st.palette || 'portakal') === id;
            return (
              <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => set({ palette: id })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, backgroundColor: on ? c.accentSoft : 'transparent' }}>
                <View style={{ flexDirection: 'row' }}>
                  {[p.light.accent, p.light.accent2, p.light.bg].map((col, i) => (
                    <View key={i} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: col, marginLeft: i ? -8 : 0, borderWidth: 2, borderColor: c.surface }} />
                  ))}
                </View>
                <T style={{ flex: 1, fontWeight: on ? '700' : '500' }}>{p.name}</T>
                {on ? <Icon name="checkmark-circle" size={22} color={c.accent} /> : null}
              </Pressable>
            );
          })}
        </Card>
        <Card>
          <T kind="label">Kaydırma ne kadar ekler?</T>
          <T kind="small">Her kaydırma, ürün listesindeki varsayılan miktar kadar ekler ya da azaltır: domates 1 kg, yumurta 10 adet, maydanoz 1 demet gibi. Listede olmayan ürünlerde 250 g, 250 ml ya da 1 adet.</T>
        </Card>
      </ScrollView>
    </Modal>
  );
}
