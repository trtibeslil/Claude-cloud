// Uygulama durumu: telefonda (AsyncStorage) saklanır, her değişiklikte kaydedilir.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { blankState, type State } from './logic';

const KEY = 'dolap-defteri-v1';

type Ctx = {
  state: State;
  loaded: boolean;
  update: (fn: (s: State) => State) => void;
  toast: (msg: string) => void;
  toastMsg: string | null;
};
const StoreCtx = createContext<Ctx | null>(null);

function merged(raw: Partial<State> | null): State {
  const b = blankState();
  if (!raw) return b;
  return { ...b, ...raw, settings: { ...b.settings, ...raw.settings } };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(blankState);
  const [loaded, setLoaded] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
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
  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(null), 4000);
  }, []);

  return <StoreCtx.Provider value={{ state, loaded, update, toast, toastMsg }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('StoreProvider eksik');
  return ctx;
}
