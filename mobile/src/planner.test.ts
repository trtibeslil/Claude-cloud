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
