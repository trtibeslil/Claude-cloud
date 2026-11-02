// Çalıştırma: npm test
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Recipe } from './planner.ts';
import { ingredientRows, prepSteps } from './recipeView.ts';
import { isFoodPage, isPhotoFile } from './photoMatch.ts';

const recipes: Recipe[] = JSON.parse(readFileSync(new URL('./tarifler.json', import.meta.url), 'utf8'));
const catalog = JSON.parse(readFileSync(new URL('./urunler.json', import.meta.url), 'utf8'));
const catName = Object.fromEntries(catalog.cats.map((c: { k: string; n: string }) => [c.k, c.n]));
const catOf = (name: string) => { const p = catalog.items.find((i: string[]) => i[0].toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr')); return p ? catName[p[1]] : undefined; };
const item = (id: string, name: string, qty: number, unit: 'g' | 'ml' | 'adet') => ({ id, name, qty, unit, category: catOf(name) ?? 'Diğer' });
const r = (t: string) => recipes.find(x => x.t === t)!;

test('Malzemeler kişi sayısına göre ölçeklenir ve dolap durumu gösterilir', () => {
  const rows = ingredientRows(r('Menemen'), [item('y', 'Yumurta', 2, 'adet'), item('d', 'Salkım domates', 1000, 'g')], 2, catOf);
  const by = Object.fromEntries(rows.map(x => [x.name, x]));
  assert.equal(by['Yumurta'].amount, '3 adet');
  assert.equal(by['Yumurta'].status, 'short');
  assert.equal(by['Domates'].status, 'have');
  assert.equal(by['Domates'].stockName, 'Salkım domates');
  assert.equal(by['Sivri biber'].status, 'missing');
  assert.equal(rows.at(-1)!.status, 'optional');
});

test('Evde var sayılanlar eksik görünmez', () => {
  const rows = ingredientRows(r('Mercimek çorbası'), [], 4, catOf);
  for (const x of rows.filter(x => ['Zeytinyağı', 'Ayçiçek yağı', 'Tuz', 'Kimyon', 'Un', 'Pul biber'].includes(x.name))) assert.equal(x.status, 'staple', x.name);
});

test('Hazırlık: kuru fasulye ıslatılır, et oda sıcaklığına gelir, fırın ısıtılır', () => {
  const kf = prepSteps({ ...r('Etli kuru fasulye'), s: ['Fasulyeyi haşla.'] }, catOf).join(' ');
  assert.match(kf, /Kuru fasulye kuruysa bir gece önceden bol suda ıslat/);
  assert.match(kf, /Dana kuşbaşı: .*buzdolabından çıkar/);
  // Adımlarda zaten anlatılıyorsa tekrar etmez
  assert.doesNotMatch(prepSteps(r('Etli kuru fasulye'), catOf).join(' '), /ıslat/);
  const firin = recipes.find(x => x.s.some(s => /200 derece/.test(s)))!;
  assert.match(prepSteps(firin, catOf).join(' '), /Fırını 200 dereceye/);
  for (const x of recipes) assert.ok(prepSteps(x, catOf).length >= 1);
});

test('Fotoğraf seçimi: ilçe maddesi ve harita elenir', () => {
  assert.equal(isFoodPage(['Kategori:Türk mutfağı', 'Kategori:Yumurta yemekleri']), true);
  assert.equal(isFoodPage(["Kategori:İzmir'in ilçeleri", 'Kategori:Menemen']), false);
  assert.equal(isPhotoFile('Menemen yemeği.jpg'), true);
  assert.equal(isPhotoFile('Yarma çorbası.JPG'), true);
  assert.equal(isPhotoFile('Menemen location map.svg'), false);
  assert.equal(isPhotoFile('Izmir districts map.jpg'), false);
});
