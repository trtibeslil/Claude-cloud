// Çalıştırma: npm test
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { favoriteFromOption, favoriteFromRecipe, favoriteMeals, favoriteUses, isFavorite, toggleFavorite } from './favorites.ts';
import type { Recipe } from './planner.ts';

const recipes: Recipe[] = JSON.parse(readFileSync(new URL('./tarifler.json', import.meta.url), 'utf8'));
const catOf = () => undefined;
const item = (id: string, name: string, qty: number, unit: 'g' | 'adet') => ({ id, name, qty, unit, category: 'Diğer' });

test('Favori eklenir, aynı adla tekrar dokununca çıkarılır', () => {
  const menemen = favoriteFromRecipe(recipes.find(r => r.t === 'Menemen')!);
  let favs = toggleFavorite([], menemen);
  assert.ok(isFavorite(favs, 'menemen'));
  favs = toggleFavorite(favs, menemen);
  assert.equal(favs.length, 0);
});

test('Öğünler: gömülü tarif kendi öğünlerini, yapay zekâ önerisi eklendiği öğünü alır', () => {
  assert.deepEqual(favoriteMeals(recipes, 'Patatesli yumurta'), ['Kahvaltı', 'Öğle']);
  assert.deepEqual(favoriteMeals(recipes, 'Annemin güveci', 'Akşam'), ['Akşam']);
});

test('Favori bugünkü dolaba ve kişi sayısına göre hesaplanır', () => {
  const menemen = favoriteFromRecipe(recipes.find(r => r.t === 'Menemen')!);
  const r = favoriteUses(menemen, [item('y', 'Yumurta', 10, 'adet'), item('d', 'Domates', 1000, 'g')], 2, recipes, catOf);
  assert.deepEqual(r.uses.map(u => [u.name, u.qty]), [['Yumurta', 3], ['Domates', 200]]);
  assert.deepEqual(r.missing, ['Sivri biber']);
  // Gömülü olmayan (yapay zekâ) favori: kayıtlı malzemeler adla eşleşir ve ölçeklenir
  const ai = favoriteFromOption({ title: 'Annemin güveci', summary: '', minutes: 50, servings: 4,
    uses: [{ itemId: 'x', name: 'Domates', qty: 400, unit: 'g' }], extra: [{ name: 'Kuzu kol', amount: '1 kg' }] }, ['Akşam']);
  const r2 = favoriteUses(ai, [item('d', 'Domates', 1000, 'g')], 2, recipes, catOf);
  assert.deepEqual(r2.uses.map(u => [u.name, u.qty]), [['Domates', 200]]);
  assert.deepEqual(r2.missing, ['Kuzu kol']);
});
