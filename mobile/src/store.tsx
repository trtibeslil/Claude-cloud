// Uygulama durumu: telefonda (AsyncStorage) saklanır, her değişiklikte kaydedilir.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { blankState, categoryFor, CATS, type Draft, type State } from './logic';

const KEY = 'dolap-defteri-v1';

type Ctx = {
  state: State;
  loaded: boolean;
  update: (fn: (s: State) => State) => void;
  /** Kısa bildirim; isteğe bağlı tek düğmesi olur (ör. "Geri al"). */
  toast: (msg: string, action?: ToastAction) => void;
  toastMsg: { msg: string; action?: ToastAction } | null;
  /** Listeden seçilip henüz dolaba eklenmemiş ürünler; sekme değişince kaybolmasın diye burada, kaydedilmez. */
  basket: Draft[];
  setBasket: (fn: (b: Draft[]) => Draft[]) => void;
};
export type ToastAction = { label: string; onPress: () => void };
const StoreCtx = createContext<Ctx | null>(null);

function merged(raw: Partial<State> | null): State {
  const b = blankState();
  if (!raw) return b;
  const m = { ...b, ...raw, settings: { ...b.settings, ...raw.settings } };
  // Eski kategori adları ve "Diğer"e düşmüş katalog ürünleri yeni kategorilere taşınır.
  m.items = (m.items ?? []).map(i => (CATS.includes(i.category) && i.category !== 'Diğer' ? i : { ...i, category: categoryFor(i.name, i.category) }));
  return m;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(blankState);
  const [loaded, setLoaded] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ msg: string; action?: ToastAction } | null>(null);
  const [basket, setBasketState] = useState<Draft[]>([]);
  const setBasket = useCallback((fn: (b: Draft[]) => Draft[]) => setBasketState(fn), []);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(raw => { if (raw) setState(merged(JSON.parse(raw))); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state, loaded]);

  const update = useCallback((fn: (s: State) => State) => setState(fn), []);
  const toast = useCallback((msg: string, action?: ToastAction) => {
    setToastMsg({ msg, action });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(null), action ? 6000 : 3500);
  }, []);

  return <StoreCtx.Provider value={{ state, loaded, update, toast, toastMsg, basket, setBasket }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('StoreProvider eksik');
  return ctx;
}
