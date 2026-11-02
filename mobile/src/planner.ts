// Yapay zekâsız menü önerisi: uygulamaya gömülü tariflerden dolaptaki malzemelere göre seçim.
// Saf fonksiyonlar (test: planner.test.ts). Tarifler catalog/tarifler.py ile üretilir, 4 kişiliktir.
import { fold } from './ocr/match';
import { fmtQty, norm, roundQty } from './units';
import type { Item, Option, Use } from './logic';

export type Recipe = {
  t: string; m: string[]; d: number; tags: string[];
  /** role: m olmazsa olmaz, k destek grubu (en az biri), s yardımcı — catalog/tarifler.py belirler. */
  i: [name: string, qty: number, unit: string, optional: 0 | 1, role?: 'm' | 'k' | 's'][];
  s: string[]; n: [kcal: number, protein: number, carbs: number, fat: number];
  /** Zorluk: 1 basit, 2 orta, 3 kompleks; p: püf noktası (kompleks tariflerde). */
  z: 1 | 2 | 3; p?: string;
};
const MEAL_KEY: Record<string, string> = { 'Kahvaltı': 'K', 'Öğle': 'O', 'Akşam': 'A' };
const BASE_SERVINGS = 4;
const words = (s: string) => fold(s).split(' ').filter(w => w.length >= 2);

const PASTA = ['Makarna', 'Spagetti', 'Penne makarna', 'Burgu makarna', 'Fiyonk makarna', 'Kelebek makarna'];
/** Birbirinin yerine geçebilen ürünler: tarif "Makarna" diyorsa dolaptaki spagetti de olur. */
const SUBSTITUTES = [
  PASTA,
  ['Pirinç', 'Baldo pirinç', 'Osmancık pirinç', 'Basmati pirinç'],
  ['Bulgur', 'Pilavlık bulgur', 'Köftelik bulgur'],
  ['Dana kıyma', 'Karışık kıyma', 'Kuzu kıyma'],
  ['Domates', 'Salkım domates', 'Cherry domates'],
  ['Sivri biber', 'Çarliston biber'],
  ['Kuru soğan', 'Kırmızı soğan'],
  ['Yoğurt', 'Süzme yoğurt'],
  ['Beyaz peynir', 'Ezine peyniri', 'Feta'],
  ['Kaşar peyniri', 'Eski kaşar'],
  ['Tavuk göğsü', 'Tavuk bonfile', 'Tavuk şiş'],
  ['Yumurta', 'Köy yumurtası'],
  ['Süt', 'Yarım yağlı süt', 'Laktozsuz süt'],
  ['Un', 'Tam buğday unu'],
  ['Ekmek', 'Tam buğday ekmeği', 'Kepekli ekmek', 'Çavdar ekmeği'],
].map(g => g.map(fold));

/** Her evde var sayılanlar: dolapta kayıtlı olmasa da tarif için mevcut sayılır, "eksik" gösterilmez.
 *  Dolapta kayıtlıysa yine dolaptan düşülür. */
export const STAPLES = new Set(['Zeytinyağı', 'Ayçiçek yağı', 'Mısırözü yağı', 'Tuz', 'Karabiber', 'Kimyon', 'Toz kırmızı biber',
  'Kırmızı toz biber (acı)', 'Pul biber', 'Un', ...PASTA].map(fold));
export const isStaple = (name: string) => STAPLES.has(fold(name));

/**
 * Tarif malzemesine dolapta karşılık gelen ürün: aynı ad, ya da aynı kategoride adı tarif malzemesini içeren ürün
 * ("Domates" ← "Salkım domates", "Spagetti" ← "Spagetti makarna"; ama "Domates" ← "Domates salçası" değil).
 */
export function stockFor(name: string, stock: Item[], catOf: (name: string) => string | undefined) {
  const f = fold(name);
  const exact = stock.find(i => i.qty > 0 && fold(i.name) === f);
  if (exact) return exact;
  const w = words(name), cat = catOf(name);
  const similar = stock.find(i => i.qty > 0 && (!cat || i.category === cat) && w.every(x => words(i.name).includes(x)));
  if (similar) return similar;
  const group = SUBSTITUTES.find(g => g.includes(f));
  return group ? stock.find(i => i.qty > 0 && group.includes(fold(i.name))) : undefined;
}

type Evaluated = {
  recipe: Recipe; uses: Use[]; missing: { name: string; amount: string }[]; have: number; short: number;
  /** Tarif önerme kuralı: olmazsa olmaz malzemelerin hepsi ve destek grubundan en az biri dolapta. */
  feasible: boolean;
  /** Dolapta olmayan olmazsa olmaz malzemeler. */
  mustMissing: string[];
  /** Kural ihlali sayısı (eksik olmazsa olmaz + karşılanmayan destek grubu); 0 ise tam uygun. */
  deviation: number;
  /** Dolapta gerçekten bulunan asıl (m/k) malzeme sayısı; evde var sayılanlar sayılmaz. */
  relevant: number;
};

/** Tarifin bu kişi sayısı için dolaptan ne kullanacağını ve neyin eksik olduğunu hesaplar. */
export function evaluate(r: Recipe, stock: Item[], people: number, catOf: (name: string) => string | undefined): Evaluated {
  const scale = people / BASE_SERVINGS;
  const uses: Use[] = [], missing: Evaluated['missing'] = [];
  let have = 0, short = 0, support = 0, supportHave = 0, relevant = 0;
  const mustMissing: string[] = [];
  for (const [name, qty, unit, optional, role] of r.i) {
    const need = norm(qty * scale, unit);
    const it = stockFor(name, stock, catOf);
    const present = !!it || isStaple(name);
    if (it && (role === 'm' || role === 'k')) relevant++;
    if (!optional && role === 'm' && !present) mustMissing.push(name);
    if (!optional && role === 'k') { support++; if (present) supportHave++; }
    if (!it) {
      if (present) continue; // evde var sayılan: eksik değil, düşülecek kayıt da yok
      if (!optional) missing.push({ name, amount: fmtQty(need.qty, need.unit) });
      continue;
    }
    // Birimler farklıysa (ör. tarif adet, dolap g) güvenle çevrilemez; tarifteki sayıyı dolaptaki kadarla sınırla.
    const take = it.unit === need.unit ? Math.min(need.qty, it.qty) : Math.min(qty * scale, it.qty);
    if (it.unit === need.unit && it.qty < need.qty * 0.8) short++;
    have++;
    uses.push({ itemId: it.id, name: it.name, qty: roundQty(take, it.unit), unit: it.unit });
  }
  const deviation = mustMissing.length + (support > 0 && supportHave === 0 ? 1 : 0);
  return { recipe: r, uses, missing, have, short, mustMissing, deviation, relevant, feasible: deviation === 0 };
}

export function toOption(e: Evaluated, people: number): Option {
  const r = e.recipe;
  return {
    title: r.t,
    summary: e.mustMissing.length ? `Ana malzeme eksik: ${e.mustMissing.join(', ')}`
      : e.deviation ? 'Ana malzemelerin bir kısmı eksik'
      : e.missing.length ? `${e.missing.length} malzeme eksik` : e.short ? 'Bazı malzemeler azalmış' : 'Malzemelerin hepsi dolapta',
    stretch: e.deviation > 0,
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
        // Dolapta en az bir asıl malzemesi olmalı (yalnızca sarımsak ya da evde var sayılanlarla öneri yok).
        // Önce tam uygunlar, sonda en fazla bir kural ihlali olan "esnek" öneriler.
        .filter(e => e.relevant > 0 && e.deviation <= 1)
        // Dolaptaki asıl malzemelerden daha çoğunu kullanan tarif öne geçer (tavuk + domates varken tavuk sote, domates çorbasından önce).
        .map(e => ({ e, score: e.deviation * 1000 + e.missing.length * 10 + e.short * 3 - e.relevant * 20 - e.have
          // Son yapılanlar ve aynı plandaki tekrarlar geriye düşer (başka seçenek yoksa yine de gelebilir).
          + (recent.has(fold(e.recipe.t)) ? 60 : 0) + (chosen.has(e.recipe.t) ? 100 : 0) }))
        .sort((a, b) => a.score - b.score || a.e.recipe.t.localeCompare(b.e.recipe.t, 'tr'));
      // Önce tam uygunlar; yetmezse kalan yerler esnek önerilerle dolar. 4+ seçenekte sona çeşitlilik için en fazla bir esnek öneri.
      const exact = ranked.filter(x => x.e.deviation === 0), loose = ranked.filter(x => x.e.deviation > 0);
      const nLoose = Math.min(loose.length, Math.max(o.options - exact.length, o.options >= 4 ? 1 : 0));
      const picked = [...exact.slice(0, o.options - nLoose), ...loose.slice(0, nLoose)].map(x => x.e);
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
