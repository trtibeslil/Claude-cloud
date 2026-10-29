// Dolap hesapları: birimler, birleştirme, yemek yapınca düşme ve geri alma.
// Saf fonksiyonlar; ekranlar ve kayıt katmanı bunları kullanır.

export const UNITS = ['g', 'ml', 'adet', 'paket', 'demet', 'kutu', 'şişe'] as const;
export type Unit = (typeof UNITS)[number];
export const CATS = [
  'Sebze & Meyve', 'Et, Tavuk & Balık', 'Süt & Kahvaltılık', 'Kuru Gıda & Bakliyat',
  'Baharat, Sos & Yağ', 'Donuk', 'İçecek', 'Diğer',
] as const;
export const MEALS = ['Kahvaltı', 'Öğle', 'Akşam'] as const;

export type Item = { id: string; name: string; qty: number; unit: Unit; category: string };
export type Use = { itemId: string; name: string; qty: number; unit: string };
export type Option = {
  title: string; summary: string; minutes: number; servings: number;
  uses: Use[]; extra: { name: string; amount: string }[];
  steps?: string[]; tip?: string;
};
export type Slot = { meal: string; options: Option[]; done: { option: number; people: number } | null };
export type Plan = { createdAt: number; invRev: number; people: number; days: { label: string; meals: Slot[] }[] };
export type UsedLine = { itemId: string; name: string; unit: Unit; category: string; qty: number; before: number };
export type HistoryEntry = {
  id: string; title: string; people: number; at: number; used: UsedLine[];
  source: { d: number; m: number; o: number } | null;
};
export type Settings = { people: number; days: number; meals: string[]; options: number };
export type State = { items: Item[]; plan: Plan | null; history: HistoryEntry[]; invRev: number; settings: Settings };

export const blankState = (): State => ({
  items: [], plan: null, history: [], invRev: 0,
  settings: { people: 4, days: 1, meals: ['Kahvaltı', 'Öğle', 'Akşam'], options: 3 },
});

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const lower = (s: string) => String(s ?? '').trim().toLocaleLowerCase('tr');
export const toNumber = (v: unknown) => Number(String(v ?? '').replace(',', '.')) || 0;

/** Birimi temel birime çevirir: kg→g, l→ml, tane→adet. */
export function norm(qty: unknown, unit: unknown): { qty: number; unit: Unit } {
  const q = toNumber(qty);
  const u = lower(String(unit ?? '')).replace(/\.$/, '');
  if (['kg', 'kilo', 'kilogram'].includes(u)) return { qty: q * 1000, unit: 'g' };
  if (['g', 'gr', 'gram'].includes(u)) return { qty: q, unit: 'g' };
  if (['l', 'lt', 'litre', 'liter'].includes(u)) return { qty: q * 1000, unit: 'ml' };
  if (['ml', 'mililitre'].includes(u)) return { qty: q, unit: 'ml' };
  if (['adet', 'tane', 'ad', 'x'].includes(u)) return { qty: q, unit: 'adet' };
  if ((UNITS as readonly string[]).includes(u)) return { qty: q, unit: u as Unit };
  return { qty: q, unit: 'adet' };
}

export function roundQty(q: number, unit: string) {
  if (unit === 'g' || unit === 'ml') return Math.round(q);
  return Math.round(q * 10) / 10;
}

const nf = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
export function fmtQty(q: number, unit: string) {
  if (unit === 'g' && q >= 1000) return nf.format(Math.round(q / 10) / 100) + ' kg';
  if (unit === 'ml' && q >= 1000) return nf.format(Math.round(q / 10) / 100) + ' L';
  return nf.format(roundQty(q, unit)) + ' ' + unit;
}

/** Bu miktarın altı "bitti" sayılır. */
export const nearlyZero = (q: number, unit: string) => (unit === 'g' || unit === 'ml' ? q < 5 : q < 0.25);

// Claude bazen listede olmayan kategori adı verir (ör. "Et", "Sos & Yağ"); en yakın kategoriye eşle.
export function normCategory(c: unknown) {
  const s = String(c ?? '');
  if ((CATS as readonly string[]).includes(s)) return s;
  const words = lower(s).split(/[\s,&/]+/).filter(w => w.length > 1);
  return CATS.find(k => words.some(w => lower(k).split(/[\s,&/]+/).includes(w))) ?? 'Diğer';
}

export type Draft = { name: string; qty: unknown; unit: unknown; category?: unknown };

/** Yeni malzemeleri dolaba ekler; aynı ad ve birimdeki malzemenin üstüne koyar. */
export function addItems(items: Item[], list: Draft[]) {
  const next = items.map(i => ({ ...i }));
  let added = 0, increased = 0;
  for (const raw of list) {
    const n = norm(raw.qty, raw.unit);
    const name = String(raw.name ?? '').trim();
    if (!name || !(n.qty > 0)) continue;
    const ex = next.find(i => lower(i.name) === lower(name) && i.unit === n.unit);
    if (ex) { ex.qty = roundQty(ex.qty + n.qty, n.unit); increased++; }
    else {
      next.push({ id: uid(), name, qty: roundQty(n.qty, n.unit), unit: n.unit, category: normCategory(raw.category) });
      added++;
    }
  }
  return { items: next, added, increased };
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
