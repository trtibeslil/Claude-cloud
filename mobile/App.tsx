import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CookSheet } from './src/screens/CookSheet';
import { DolapScreen } from './src/screens/Dolap';
import { EkleScreen } from './src/screens/Ekle';
import { GecmisScreen } from './src/screens/Gecmis';
import { MenuScreen, type CookRequest } from './src/screens/Menu';
import { StoreProvider, useStore } from './src/store';
import { isDark, T, ThemeProvider, useColors } from './src/ui';

type Tab = 'dolap' | 'ekle' | 'menu' | 'gecmis';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dolap', label: 'Dolap', icon: '▤' },
  { key: 'ekle', label: 'Ekle', icon: '＋' },
  { key: 'menu', label: 'Menü', icon: '◔' },
  { key: 'gecmis', label: 'Geçmiş', icon: '↺' },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StoreProvider>
          <Main />
        </StoreProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function Main() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { loaded, toastMsg } = useStore();
  const [tab, setTab] = useState<Tab>('dolap');
  const [cook, setCook] = useState<CookRequest | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const go = (t: Tab) => { setTab(t); scroll.current?.scrollTo({ y: 0, animated: false }); };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={isDark(c) ? 'light' : 'dark'} />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 24, paddingLeft: Math.max(16, insets.left), paddingRight: Math.max(16, insets.right), gap: 16 }}>
          <T kind="h1">Dolap Defteri</T>
          {!loaded ? <ActivityIndicator color={c.muted} /> :
            tab === 'dolap' ? <DolapScreen go={go} /> :
            tab === 'ekle' ? <EkleScreen go={go} /> :
            tab === 'menu' ? <MenuScreen onCook={setCook} /> :
            <GecmisScreen />}
        </ScrollView>
      </KeyboardAvoidingView>

      {toastMsg ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 76, alignItems: 'center' }}>
          <View accessibilityLiveRegion="polite" style={{ backgroundColor: c.ink, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }}>
            <Text style={{ color: c.bg, fontSize: 14 }}>{toastMsg}</Text>
          </View>
        </View>
      ) : null}

      <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: c.surface, borderTopWidth: 1, borderColor: c.line, paddingBottom: insets.bottom }}>
        {TABS.map(t => {
          const on = t.key === tab;
          return (
            <Pressable key={t.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => go(t.key)}
              style={{ flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 6, gap: 2 }}>
              <Text style={{ fontSize: 20, color: on ? c.accent : c.muted }}>{t.icon}</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: on ? c.accent : c.muted }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <CookSheet req={cook} onClose={() => setCook(null)} />
    </View>
  );
}
