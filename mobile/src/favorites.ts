// Favori tarifler: ekleme/çıkarma ve dolaptaki güncel malzemelere göre kullanım hesabı. Saf fonksiyonlar (test: favorites.test.ts).
import type { Favorite, Item, Option, Use } from './logic';
import { evaluate, stockFor, type Recipe } from './planner';
import { lower, norm, roundQty } from './units';

const MEAL_NAMES: Record<string, string> = { K: 'Kahvaltı', O: 'Öğle', A: 'Akşam' };
export const favKey = (title: string) => lower(title);
export const isFavorite = (favs: Favorite[], title: string) => favs.some(f => favKey(f.title) === favKey(title));
export const findRecipe = (recipes: Recipe[], title: string) => recipes.find(r => favKey(r.t) === favKey(title));

/** Gömülü tarifse kendi öğünleri; değilse eklendiği öğün. */
export function favoriteMeals(recipes: Recipe[], title: string, meal?: string) {
  const r = findRecipe(recipes, title);
  if (r) return r.m.map(k => MEAL_NAMES[k]).filter(Boolean);
  return meal ? [meal] : ['Kahvaltı', 'Öğle', 'Akşam'];
}

export function favoriteFromOption(o: Option, meals: string[]): Favorite {
  return {
    title: o.title, meals, minutes: o.minutes, servings: o.servings,
    uses: o.uses.map(u => ({ name: u.name, qty: u.qty, unit: u.unit })), extra: o.extra,
    steps: o.steps, tip: o.tip, nutrition: o.nutrition ?? null, at: Date.now(),
  };
}

export function favoriteFromRecipe(r: Recipe): Favorite {
  return {
    title: r.t, meals: favoriteMeals([r], r.t), minutes: r.d, servings: 4,
    uses: r.i.filter(x => !x[3]).map(([name, qty, unit]) => ({ name, qty, unit })), extra: [],
    steps: r.s, nutrition: { kcal: r.n[0], protein: r.n[1], carbs: r.n[2], fat: r.n[3] }, at: Date.now(),
  };
}

/** Varsa çıkarır, yoksa başa ekler. */
export function toggleFavorite(favs: Favorite[], fav: Favorite) {
  return isFavorite(favs, fav.title) ? favs.filter(f => favKey(f.title) !== favKey(fav.title)) : [fav, ...favs];
}

/** Favoriyi bugünkü dolapla ve kişi sayısıyla eşleştirir: dolaptan ne kullanılacak, ne eksik. */
export function favoriteUses(f: Favorite, items: Item[], people: number, recipes: Recipe[], catOf: (n: string) => string | undefined) {
  const r = findRecipe(recipes, f.title);
  if (r) {
    const e = evaluate(r, items, people, catOf);
    return { uses: e.uses, missing: e.missing.map(m => m.name) };
  }
  const scale = people / (f.servings || people);
  const uses: Use[] = [], missing: string[] = [];
  for (const u of f.uses) {
    const it = stockFor(u.name, items, catOf);
    if (!it) { missing.push(u.name); continue; }
    const n = norm(u.qty * scale, u.unit);
    const take = it.unit === n.unit ? Math.min(n.qty, it.qty) : Math.min(u.qty * scale, it.qty);
    uses.push({ itemId: it.id, name: it.name, qty: roundQty(take, it.unit), unit: it.unit });
  }
  for (const x of f.extra) if (!stockFor(x.name, items, catOf)) missing.push(x.name);
  return { uses, missing };
}
