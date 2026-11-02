// Çalıştırma: npm test
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { evaluate, planMenu, stockFor, type Recipe } from './planner.ts';

const recipes: Recipe[] = JSON.parse(readFileSync(new URL('./tarifler.json', import.meta.url), 'utf8'));
const catalog = JSON.parse(readFileSync(new URL('./urunler.json', import.meta.url), 'utf8'));
const catName = Object.fromEntries(catalog.cats.map((c: { k: string; n: string }) => [c.k, c.n]));
const catOf = (name: string) => { const p = catalog.items.find((i: string[]) => i[0].toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr')); return p ? catName[p[1]] : undefined; };
const item = (id: string, name: string, qty: number, unit: 'g' | 'ml' | 'adet', category = catOf(name) ?? 'Diğer') => ({ id, name, qty, unit, category });
const opts = { people: 4, days: 1, meals: ['Kahvaltı', 'Akşam'], options: 3, recent: [], catOf };

test('Tarif malzemesi dolapta benzer adla eşleşir ama salça domates sayılmaz', () => {
  const stock = [item('a', 'Salkım domates', 1000, 'g', 'Sebze'), item('b', 'Domates salçası', 830, 'g')];
  assert.equal(stockFor('Domates', stock, catOf)?.id, 'a');
  assert.equal(stockFor('Domates', [stock[1]], catOf), undefined);
});

test('Menemen 2 kişi için ölçeklenir, eksik zorunlu malzeme listelenir', () => {
  const menemen = recipes.find(r => r.t === 'Menemen')!;
  const e = evaluate(menemen, [item('y', 'Yumurta', 10, 'adet'), item('d', 'Domates', 1000, 'g')], 2, catOf);
  assert.deepEqual(e.uses.map(u => [u.name, u.qty]), [['Yumurta', 3], ['Domates', 200]]);
  assert.deepEqual(e.missing.map(m => m.name), ['Sivri biber']);
});

test('Plan dolaptakilere uygun tarifleri öne alır ve günler arasında tekrar etmez', () => {
  const stock = [item('y', 'Yumurta', 30, 'adet'), item('d', 'Domates', 2000, 'g'), item('b', 'Sivri biber', 500, 'g'),
    item('m', 'Spagetti', 1000, 'g'), item('s', 'Sarımsak', 250, 'g'), item('k', 'Dana kıyma', 1000, 'g'), item('o', 'Kuru soğan', 2000, 'g')];
  const plan = planMenu(recipes, stock, { ...opts, days: 2 });
  assert.equal(plan.length, 2);
  assert.equal(plan[0].meals[0].options[0].title, 'Menemen');
  assert.equal(plan[0].meals[0].options[0].extra.length, 0);
  const dinner = plan[0].meals[1].options.map(o => o.title);
  assert.equal(dinner.length, 3);
  assert.ok(dinner.includes('Domatesli makarna') || dinner.includes('Izgara köfte'), dinner.join(', '));
  assert.notEqual(plan[1].meals[1].options[0].title, plan[0].meals[1].options[0].title);
  assert.ok(plan[0].meals[0].options[0].nutrition && plan[0].meals[0].options[0].steps!.length > 0);
});

test('Dolap boşsa öneri çıkmaz', () => {
  assert.deepEqual(planMenu(recipes, [], opts), [{ meals: [] }]);
});

test('Besin değerleri USDA SR28 tablosundan hesaplanır (domatesli makarna, kişi başı)', () => {
  const besin = JSON.parse(readFileSync(new URL('../../catalog/besin.json', import.meta.url), 'utf8'));
  const r = recipes.find(x => x.t === 'Domatesli makarna')!;
  // 500 g makarna + 500 g domates + 15 g sarımsak + 40 ml zeytinyağı (0,92 g/ml) + 1 demet fesleğen (30 g), 4 kişi
  const g: Record<string, number> = { Spagetti: 500, Domates: 500, Sarımsak: 15, Zeytinyağı: 40 * 0.92, Fesleğen: 30 };
  const kcal = Object.entries(g).reduce((t, [n, w]) => t + besin[n].kcal * w / 100, 0) / 4;
  assert.equal(r.n[0], Math.round(kcal));
  for (const x of recipes) assert.ok(x.n.length === 4 && x.n[0] > 0, x.t);
});

test('Zorluk seçimi: yalnızca seçilen seviyelerdeki tarifler önerilir', () => {
  const stock = [item('y', 'Yumurta', 30, 'adet'), item('d', 'Domates', 2000, 'g'), item('k', 'Dana kıyma', 1000, 'g'),
    item('o', 'Kuru soğan', 2000, 'g'), item('p', 'Patates', 2000, 'g'), item('u', 'Un', 2000, 'g'), item('t', 'Tereyağı', 500, 'g')];
  const only = (levels: number[]) => planMenu(recipes, stock, { ...opts, meals: ['Akşam'], options: 5, levels })[0].meals[0].options;
  const complex = only([3]);
  assert.ok(complex.length > 0);
  for (const o of complex) assert.equal(o.level, 3, o.title);
  for (const o of only([1])) assert.equal(o.level, 1, o.title);
  assert.ok(recipes.filter(r => r.z === 3).every(r => r.s.length >= 7 && r.p), 'kompleks tarifler ayrıntılı ve püf noktalı');
});

test('Kural: sadece sarımsak varken hiçbir tarif önerilmez', () => {
  const plan = planMenu(recipes, [item('s', 'Sarımsak', 250, 'g')], { ...opts, meals: ['Kahvaltı', 'Öğle', 'Akşam'], options: 5 });
  assert.deepEqual(plan[0].meals, []);
});

test('Kural: ana protein yoksa (kuzu kol, ahtapot) o tarif önerilmez', () => {
  const stock = [item('s', 'Sarımsak', 250, 'g'), item('p', 'Patates', 2000, 'g'), item('o', 'Kuru soğan', 1000, 'g'), item('l', 'Limon', 500, 'g')];
  const titles = planMenu(recipes, stock, { ...opts, meals: ['Akşam'], options: 5 })[0].meals.flatMap(m => m.options.map(o => o.title));
  assert.ok(!titles.includes('Kuzu tandır') && !titles.includes('Ahtapot ızgara'), titles.join(', '));
  const tandir = recipes.find(r => r.t === 'Kuzu tandır')!;
  assert.equal(evaluate(tandir, stock, 4, catOf).feasible, false);
  assert.equal(evaluate(tandir, [...stock, item('k', 'Kuzu kol', 1500, 'g')], 4, catOf).feasible, true);
});

test('Kural: pirinç yoksa pilav önerilmez; baldo pirinç varsa olur', () => {
  const pilav = recipes.find(r => r.t === 'Tereyağlı pirinç pilavı')!;
  const base = [item('t', 'Tereyağı', 250, 'g')];
  assert.equal(evaluate(pilav, base, 4, catOf).feasible, false);
  assert.equal(evaluate(pilav, [...base, item('b', 'Baldo pirinç', 1000, 'g')], 4, catOf).feasible, true);
});

test('Kural: proteinli tarifte karbonhidrat ve sebzenin ikisi birden eksikse önerilmez', () => {
  const karniyarik = recipes.find(r => r.t === 'Karnıyarık')!;
  const meat = [item('k', 'Dana kıyma', 500, 'g')];
  assert.equal(evaluate(karniyarik, meat, 4, catOf).feasible, false);                                   // patlıcan yok
  assert.equal(evaluate(karniyarik, [...meat, item('p', 'Patlıcan', 1000, 'g')], 4, catOf).feasible, true);
  const sote = recipes.find(r => r.t === 'Tavuk sote')!;
  const chicken = [item('t', 'Tavuk göğsü', 600, 'g')];
  assert.equal(evaluate(sote, chicken, 4, catOf).feasible, false);                                       // sebzelerin hiçbiri yok
  assert.equal(evaluate(sote, [...chicken, item('d', 'Domates', 500, 'g')], 4, catOf).feasible, true);   // biri yeterli
});

test('Eşdeğer ürünler: tarif "Makarna" diyorsa dolaptaki spagetti kullanılır', () => {
  const r = recipes.find(x => x.t === 'Kıymalı makarna')!;
  const e = evaluate(r, [item('s', 'Spagetti', 500, 'g'), item('k', 'Dana kıyma', 500, 'g')], 4, catOf);
  assert.equal(e.feasible, true);
  assert.ok(e.uses.some(u => u.name === 'Spagetti'));
});
