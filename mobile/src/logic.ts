// Dolap hesapları: birimler, birleştirme, yemek yapınca düşme ve geri alma.
// Saf fonksiyonlar; ekranlar ve kayıt katmanı bunları kullanır.

import { lower, norm, roundQty, nearlyZero, toNumber, type Unit } from './units';
export * from './units';
import catalog from './urunler.json';

// Ürün kataloğu: catalog/build.py üretir, buraya kopyalar.
export const CATS: string[] = catalog.cats.map(c => c.n);
export const CAT_HUE: Record<string, number> = Object.fromEntries(catalog.cats.map(c => [c.n, c.h]));
const CAT_BY_KEY: Record<string, string> = Object.fromEntries(catalog.cats.map(c => [c.k, c.n]));
export type Product = { name: string; cat: string; unit: string; q: number };
export const PRODUCTS: Product[] = (catalog.items as [string, string, string, number][])
  .map(([name, k, unit, q]) => ({ name, cat: CAT_BY_KEY[k], unit, q }));
export const MEALS = ['Kahvaltı', 'Öğle', 'Akşam'] as const;

// unitPrice: TL / g, ml ya da adet (fiyat biliniyorsa)
export type Item = { id: string; name: string; qty: number; unit: Unit; category: string; unitPrice?: number };
export type Use = { itemId: string; name: string; qty: number; unit: string };
export type Option = {
  title: string; summary: string; minutes: number; servings: number;
  uses: Use[]; extra: { name: string; amount: string }[];
  steps?: string[]; tip?: string;
  /** Kişi başı yaklaşık besin değerleri (gram), biliniyorsa. */
  nutrition?: { kcal: number; protein: number; carbs: number; fat: number } | null;
  /** Zorluk: 1 basit, 2 orta, 3 kompleks (gömülü tariflerde). */
  level?: 1 | 2 | 3;
};
export type Slot = { meal: string; options: Option[]; done: { option: number; people: number } | null };
export type Plan = { createdAt: number; invRev: number; people: number; days: { label: string; meals: Slot[] }[] };
export type UsedLine = { itemId: string; name: string; unit: Unit; category: string; qty: number; before: number };
export type HistoryEntry = {
  id: string; title: string; people: number; at: number; used: UsedLine[];
  source: { d: number; m: number; o: number } | null;
};
// swipe: listelerde sağa/sola kaydırarak ekleme-azaltma; haptics: titreşimle geri bildirim
// palette: renk teması (ui.tsx PALETTES); levels: istenen tarif zorlukları (1 basit, 2 orta, 3 kompleks); textScale: yazı boyutu çarpanı
export type Settings = {
  people: number; days: number; meals: string[]; options: number; swipe: boolean; haptics: boolean; palette: string;
  levels: number[]; textScale: number;
};
/** Favori tarif: menüden ya da tarif listesinden eklenir; meals hangi öğün sekmelerinde görüneceğini söyler. */
export type Favorite = {
  title: string; meals: string[]; minutes: number; servings: number;
  uses: { name: string; qty: number; unit: string }[]; extra: { name: string; amount: string }[];
  steps?: string[]; tip?: string; nutrition?: Option['nutrition']; level?: 1 | 2 | 3; at: number;
};
// aliases: fiş satırı (sadeleştirilmiş) → kullanıcının onayladığı ürün adı; telefonda fiş okuma bunlardan öğrenir.
export type State = {
  items: Item[]; plan: Plan | null; history: HistoryEntry[]; invRev: number; settings: Settings;
  aliases: Record<string, string>; favorites: Favorite[];
};

export const blankState = (): State => ({
  items: [], plan: null, history: [], invRev: 0, aliases: {}, favorites: [],
  settings: { people: 4, days: 1, meals: ['Kahvaltı', 'Öğle', 'Akşam'], options: 3, swipe: true, haptics: true, palette: 'portakal', levels: [1, 2, 3], textScale: 1 },
});

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const PRODUCT_BY_NAME = new Map(PRODUCTS.map(p => [lower(p.name), p]));
export const findProduct = (name: string) => PRODUCT_BY_NAME.get(lower(name));
// Eski sürümlerin kategori adları → katalog kategorileri
const OLD_CATS: Record<string, string> = {
  'Sebze & Meyve': 'Sebze', 'Et, Tavuk & Balık': 'Kırmızı Et', 'Süt & Kahvaltılık': 'Süt & Süt Ürünleri',
  'Kuru Gıda & Bakliyat': 'Bakliyat', 'Baharat, Sos & Yağ': 'Sos, Salça & Konserve', 'Donuk': 'Dondurulmuş',
};
// Claude bazen listede olmayan kategori adı verir (ör. "Et", "Sos & Yağ"); en yakın kategoriye eşle.
export function normCategory(c: unknown) {
  const s = String(c ?? '');
  if (CATS.includes(s)) return s;
  if (OLD_CATS[s]) return OLD_CATS[s];
  const words = lower(s).split(/[\s,&/]+/).filter(w => w.length > 1);
  return CATS.find(k => words.some(w => lower(k).split(/[\s,&/]+/).includes(w))) ?? 'Diğer';
}
/** Katalogdaki ürünün kategorisi önce gelir; yoksa verilen kategori normalleştirilir. */
export const categoryFor = (name: string, cat?: unknown) => findProduct(name)?.cat ?? normCategory(cat);

/** Eski ve yeni partinin miktara göre ağırlıklı ortalama birim fiyatı. */
export function mergePrice(oldQty: number, oldUp: number | undefined, addQty: number, addUp: number | undefined) {
  if (!(addUp && addUp > 0)) return oldUp;
  if (!(oldUp && oldUp > 0)) return addUp;
  return (oldQty * oldUp + addQty * addUp) / (oldQty + addQty);
}
const money = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
export const fmtTL = (v: number) => money.format(Math.round(v * 100) / 100);
export function perLabel(it: Item) {
  if (!(it.unitPrice && it.unitPrice > 0)) return '';
  if (it.unit === 'g') return fmtTL(it.unitPrice * 1000) + '/kg';
  if (it.unit === 'ml') return fmtTL(it.unitPrice * 1000) + '/L';
  return fmtTL(it.unitPrice) + '/' + it.unit;
}

/** price: o satır için ödenen toplam tutar (TL), isteğe bağlı. */
export type Draft = { name: string; qty: unknown; unit: unknown; category?: unknown; price?: unknown };

/** Yeni malzemeleri dolaba ekler; aynı ad ve birimdeki malzemenin üstüne koyar. */
export function addItems(items: Item[], list: Draft[]) {
  const next = items.map(i => ({ ...i }));
  let added = 0, increased = 0;
  for (const raw of list) {
    const n = norm(raw.qty, raw.unit);
    const name = String(raw.name ?? '').trim();
    if (!name || !(n.qty > 0)) continue;
    const price = toNumber(raw.price);
    const up = price > 0 ? price / n.qty : undefined;
    const ex = next.find(i => lower(i.name) === lower(name) && i.unit === n.unit);
    if (ex) {
      const p = mergePrice(ex.qty, ex.unitPrice, n.qty, up);
      ex.qty = roundQty(ex.qty + n.qty, n.unit);
      if (p) ex.unitPrice = p;
      increased++;
    } else {
      const it: Item = { id: uid(), name, qty: roundQty(n.qty, n.unit), unit: n.unit, category: categoryFor(name, raw.category) };
      if (up) it.unitPrice = up;
      next.push(it);
      added++;
    }
  }
  return { items: next, added, increased };
}

/** Bir kaydırmada eklenen/azaltılan miktar (temel birimde): katalogdaki varsayılan miktar, yoksa 250 g/ml ya da 1. */
export function swipeStep(item: Pick<Item, 'name' | 'unit'>) {
  const p = findProduct(item.name);
  if (p) {
    const n = norm(p.q, p.unit);
    if (n.unit === item.unit && n.qty > 0) return n.qty;
  }
  return item.unit === 'g' || item.unit === 'ml' ? 250 : 1;
}

/** Dolaptaki malzemeyi bir adım artırır ya da azaltır; bitince çıkarır. */
export function nudgeItem(items: Item[], id: string, dir: 1 | -1) {
  const it = items.find(i => i.id === id);
  if (!it) return { items, removed: null as Item | null, item: null as Item | null };
  const qty = roundQty(it.qty + dir * swipeStep(it), it.unit);
  if (dir < 0 && nearlyZero(qty, it.unit)) return { items: items.filter(i => i.id !== id), removed: it, item: null };
  const next = { ...it, qty: Math.max(0, qty) };
  return { items: items.map(i => (i.id === id ? next : i)), removed: null, item: next };
}

export function findItem(items: Item[], u: { itemId?: string; name?: string }) {
  return items.find(i => i.id === u.itemId) ?? items.find(i => lower(i.name) === lower(u.name ?? ''));
}

/** Tarifteki miktarı kişi sayısına ölçekler; dolaptaki miktarı geçmez. */
export function usedFor(u: Use, item: Item, people: number, servings: number) {
  const n = norm(u.qty, u.unit || item.unit);
  const base = n.unit === item.unit ? n.qty : toNumber(u.qty); // farklı boyutlar (adet/g) güvenle çevrilemez
  const q = (base * people) / (servings || people);
  return Math.min(roundQty(q, item.unit), item.qty);
}

export type CookRow = { itemId: string; use: string; edited: boolean };

export function cookRows(items: Item[], uses: Use[], people: number, servings: number, prev: CookRow[] = []): CookRow[] {
  const kept = new Map(prev.filter(r => r.edited).map(r => [r.itemId, r]));
  const rows: CookRow[] = [];
  for (const u of uses) {
    const it = findItem(items, u);
    if (!it || rows.some(r => r.itemId === it.id)) continue;
    rows.push(kept.get(it.id) ?? { itemId: it.id, use: String(usedFor(u, it, people, servings)), edited: false });
  }
  return rows;
}

/** "Yaptım" deyince malzemeleri düşer, geçmişe yazar, menüde öğünü işaretler. */
export function applyCook(
  state: State,
  c: { title: string; people: number; rows: CookRow[]; source: HistoryEntry['source'] },
) {
  const items = state.items.map(i => ({ ...i }));
  const used: UsedLine[] = [], finished: string[] = [];
  for (const r of c.rows) {
    const it = items.find(i => i.id === r.itemId);
    const q = Math.max(0, toNumber(r.use));
    if (!it || !q) continue;
    const before = it.qty;
    const take = Math.min(q, it.qty);
    it.qty = roundQty(it.qty - take, it.unit);
    used.push({ itemId: it.id, name: it.name, unit: it.unit, category: it.category, qty: take, before });
    if (nearlyZero(it.qty, it.unit)) finished.push(it.name);
  }
  let plan = state.plan;
  if (c.source && plan) {
    const s = c.source;
    plan = {
      ...plan,
      days: plan.days.map((d, di) => di !== s.d ? d : {
        ...d, meals: d.meals.map((m, mi) => mi !== s.m ? m : { ...m, done: { option: s.o, people: c.people } }),
      }),
    };
  }
  const entry: HistoryEntry = { id: uid(), title: c.title, people: c.people, at: Date.now(), used, source: c.source };
  const next: State = {
    ...state,
    items: items.filter(i => !nearlyZero(i.qty, i.unit)),
    plan,
    history: [entry, ...state.history].slice(0, 60),
    invRev: state.invRev + 1,
  };
  return { state: next, finished };
}

export function undoHistory(state: State, id: string): State {
  const e = state.history.find(x => x.id === id);
  if (!e) return state;
  const items = state.items.map(i => ({ ...i }));
  for (const u of e.used) {
    const it = items.find(i => i.id === u.itemId);
    if (it) it.qty = roundQty(it.qty + u.qty, it.unit);
    else items.push({ id: u.itemId, name: u.name, unit: u.unit, category: u.category, qty: u.before });
  }
  let plan = state.plan;
  if (e.source && plan) {
    const s = e.source;
    plan = {
      ...plan,
      days: plan.days.map((d, di) => di !== s.d ? d : {
        ...d, meals: d.meals.map((m, mi) => mi !== s.m ? m : { ...m, done: null }),
      }),
    };
  }
  return { ...state, items, plan, history: state.history.filter(x => x.id !== id), invRev: state.invRev + 1 };
}

export function dayLabel(i: number) {
  const d = new Date();
  d.setDate(d.getDate() + i);
  const s = d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
  if (i === 0) return 'Bugün · ' + s;
  if (i === 1) return 'Yarın · ' + s;
  return s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
}
