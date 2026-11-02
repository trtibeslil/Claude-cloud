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
import { Card, Icon, IconBtn, isDark, PALETTES, Row, shadow, T, ThemeProvider, useColors, type IconName, type PaletteId } from './src/ui';

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
  return <ThemeProvider palette={state.settings.palette}><Main /></ThemeProvider>;
}

function Main() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { loaded, toastMsg } = useStore();
  const [tab, setTab] = useState<Tab>('dolap');
  const [cook, setCook] = useState<CookRequest | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const go = (t: Tab) => { setTab(t); scroll.current?.scrollTo({ y: 0, animated: false }); };
  const tabBarSpace = 86 + insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={isDark(c) ? 'light' : 'dark'} />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: tabBarSpace + 16, paddingLeft: Math.max(16, insets.left), paddingRight: Math.max(16, insets.right), gap: 18 }}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <Text style={{ fontSize: 30, fontWeight: '800', letterSpacing: -0.6, color: c.ink }}>
              Dolap <Text style={{ color: c.accent }}>Defteri</Text>
            </Text>
            <IconBtn name="options-outline" label="Ayarlar" onPress={() => setSettingsOpen(true)} />
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
            <Text style={{ color: c.bg, fontSize: 14, fontWeight: '600', flexShrink: 1 }}>{toastMsg.msg}</Text>
            {toastMsg.action ? (
              <Pressable accessibilityRole="button" onPress={toastMsg.action.onPress}
                style={{ backgroundColor: c.accent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ color: c.accentInk, fontWeight: '700' }}>{toastMsg.action.label}</Text>
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
              <Text style={{ fontSize: 12, fontWeight: '700', color: on ? c.accent : c.muted }}>{t.label}</Text>
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
