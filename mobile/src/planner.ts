// Yapay zekâsız menü önerisi: uygulamaya gömülü tariflerden dolaptaki malzemelere göre seçim.
// Saf fonksiyonlar (test: planner.test.ts). Tarifler catalog/tarifler.py ile üretilir, 4 kişiliktir.
import { fold } from './ocr/match';
import { fmtQty, norm, roundQty } from './units';
import type { Item, Option, Use } from './logic';

export type Recipe = {
  t: string; m: string[]; d: number; tags: string[];
  i: [name: string, qty: number, unit: string, optional: 0 | 1][];
  s: string[]; n: [kcal: number, protein: number, carbs: number, fat: number];
  /** Zorluk: 1 basit, 2 orta, 3 kompleks; p: püf noktası (kompleks tariflerde). */
  z: 1 | 2 | 3; p?: string;
};
const MEAL_KEY: Record<string, string> = { 'Kahvaltı': 'K', 'Öğle': 'O', 'Akşam': 'A' };
const BASE_SERVINGS = 4;
const words = (s: string) => fold(s).split(' ').filter(w => w.length >= 2);

/**
 * Tarif malzemesine dolapta karşılık gelen ürün: aynı ad, ya da aynı kategoride adı tarif malzemesini içeren ürün
 * ("Domates" ← "Salkım domates", "Spagetti" ← "Spagetti makarna"; ama "Domates" ← "Domates salçası" değil).
 */
export function stockFor(name: string, stock: Item[], catOf: (name: string) => string | undefined) {
  const f = fold(name);
  const exact = stock.find(i => i.qty > 0 && fold(i.name) === f);
  if (exact) return exact;
  const w = words(name), cat = catOf(name);
  return stock.find(i => i.qty > 0 && (!cat || i.category === cat) && w.every(x => words(i.name).includes(x)));
}

type Evaluated = { recipe: Recipe; uses: Use[]; missing: { name: string; amount: string }[]; have: number; short: number };

/** Tarifin bu kişi sayısı için dolaptan ne kullanacağını ve neyin eksik olduğunu hesaplar. */
export function evaluate(r: Recipe, stock: Item[], people: number, catOf: (name: string) => string | undefined): Evaluated {
  const scale = people / BASE_SERVINGS;
  const uses: Use[] = [], missing: Evaluated['missing'] = [];
  let have = 0, short = 0;
  for (const [name, qty, unit, optional] of r.i) {
    const need = norm(qty * scale, unit);
    const it = stockFor(name, stock, catOf);
    if (!it) {
      if (!optional) missing.push({ name, amount: fmtQty(need.qty, need.unit) });
      continue;
    }
    // Birimler farklıysa (ör. tarif adet, dolap g) güvenle çevrilemez; tarifteki sayıyı dolaptaki kadarla sınırla.
    const take = it.unit === need.unit ? Math.min(need.qty, it.qty) : Math.min(qty * scale, it.qty);
    if (it.unit === need.unit && it.qty < need.qty * 0.8) short++;
    have++;
    uses.push({ itemId: it.id, name: it.name, qty: roundQty(take, it.unit), unit: it.unit });
  }
  return { recipe: r, uses, missing, have, short };
}

export function toOption(e: Evaluated, people: number): Option {
  const r = e.recipe;
  return {
    title: r.t,
    summary: e.missing.length ? `${e.missing.length} malzeme eksik` : e.short ? 'Bazı malzemeler azalmış' : 'Malzemelerin hepsi dolapta',
    minutes: r.d, servings: people, uses: e.uses, extra: e.missing, steps: r.s, tip: r.p, level: r.z,
    nutrition: { kcal: r.n[0], protein: r.n[1], carbs: r.n[2], fat: r.n[3] },
  };
}

export type PlanInput = {
  people: number; days: number; meals: string[]; options: number; recent: string[];
  /** İstenen zorluk seviyeleri (1 basit, 2 orta, 3 kompleks); boşsa hepsi. */
  levels?: number[];
  catOf: (name: string) => string | undefined;
};

/** Günler ilerledikçe ilk seçenekleri sanal olarak dolaptan düşerek plan kurar. */
export function planMenu(recipes: Recipe[], items: Item[], o: PlanInput) {
  const stock = items.map(i => ({ ...i }));
  const recent = new Set(o.recent.map(fold));
  const chosen = new Set<string>();
  const days: { meals: { meal: string; options: Option[] }[] }[] = [];
  for (let d = 0; d < o.days; d++) {
    const meals: { meal: string; options: Option[] }[] = [];
    for (const meal of o.meals) {
      const key = MEAL_KEY[meal];
      const ranked = recipes.filter(r => r.m.includes(key) && (!o.levels?.length || o.levels.includes(r.z)))
        .map(r => evaluate(r, stock, o.people, o.catOf))
        .filter(e => e.have > 0)
        .map(e => ({ e, score: e.missing.length * 10 + e.short * 3 - e.have
          + (recent.has(fold(e.recipe.t)) ? 20 : 0) + (chosen.has(e.recipe.t) ? 15 : 0) }))
        .sort((a, b) => a.score - b.score || a.e.recipe.t.localeCompare(b.e.recipe.t, 'tr'));
      const picked = ranked.slice(0, o.options).map(x => x.e);
      if (!picked.length) continue;
      picked.forEach(e => chosen.add(e.recipe.t));
      // İlk seçenek yapılacakmış gibi malzemeleri sanal dolaptan düş.
      for (const u of picked[0].uses) {
        const it = stock.find(i => i.id === u.itemId);
        if (it) it.qty = Math.max(0, it.qty - u.qty);
      }
      meals.push({ meal, options: picked.map(e => toOption(e, o.people)) });
    }
    days.push({ meals });
  }
  return days;
}
