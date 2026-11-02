// Çalıştırma: node --experimental-strip-types --test src/ocr/receipt.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { matchProduct } from './match.ts';
import { parseReceipt } from './receipt.ts';

const catalog = JSON.parse(readFileSync(new URL('../urunler.json', import.meta.url), 'utf8'));
const byKey = Object.fromEntries(catalog.cats.map((c: { k: string; n: string }) => [c.k, c.n]));
const products = catalog.items.map(([name, k, unit, q]: [string, string, string, number]) => ({ name, cat: byKey[k], unit, q }));
const names = (lines: string[]) => parseReceipt(lines).map(l => matchProduct(l.raw, products, {}).name);

test('BİM tarzı fiş: tartılı ürün, çoklu adet, paket boyutu, indirim, atlanan satırlar', () => {
  const out = parseReceipt(`BİM BİRLEŞİK MAĞAZALAR A.Ş.
TARİH: 29.10.2026 SAAT: 18:42
FİŞ NO: 0045
1,245 KG X 39,90
DOMATES SALKIM %1 *49,68
2 X 17,45
SPAGETTI MAKARNA 500 G %1 *34,90
SUT TAM YAGLI 1 L %1 *32,50
SELE ZEYTIN %1 *89,00
INDIRIM -10,00
POSET %20 *0,50
TOPKDV *2,10
TOPLAM *205,58
NAKIT *210,00`);
  assert.deepEqual(out.map(l => [l.raw, l.qty, l.unit, l.price]), [
    ['DOMATES SALKIM', 1245, 'g', 49.68],
    ['SPAGETTI MAKARNA', 1000, 'g', 34.9],
    ['SUT TAM YAGLI', 1000, 'ml', 32.5],
    ['SELE ZEYTIN', 1, 'adet', 79],
  ]);
  assert.deepEqual(names(out.map(l => l.raw)), ['Salkım domates', 'Spagetti', 'Süt', 'Sele zeytin']);
});

test('Ad ve fiyat sütunları ayrı okunmuş fiş', () => {
  const out = parseReceipt(['YUMURTA 15 LI', 'KASAR PEYNIRI 400 GR', 'TAVUK GOGSU', '*89,90', '*159,00', '*189,50']);
  assert.deepEqual(out.map(l => [l.raw, l.qty, l.unit, l.price]), [
    ['YUMURTA', 15, 'adet', 89.9],
    ['KASAR PEYNIRI', 400, 'g', 159],
    ['TAVUK GOGSU', 1, 'adet', 189.5],
  ]);
  assert.deepEqual(names(out.map(l => l.raw)), ['Yumurta', 'Kaşar peyniri', 'Tavuk göğsü']);
});

test('Online sipariş ekranı: adet satırı ürünün ardından, ₺ fiyat ayrı satırda', () => {
  const out = parseReceipt(`Siparişlerim
Sipariş No: 123456
Pınar Süzme Peynir 500 g
2 adet
₺139,80
Banvit Bütün Piliç
1 adet
₺214,95
Muz 1 kg
₺64,90
Teslimat ücreti ₺0,00
Toplam ₺419,65`);
  assert.deepEqual(out.map(l => [l.raw, l.qty, l.unit, l.price]), [
    ['Pınar Süzme Peynir', 1000, 'g', 139.8],
    ['Banvit Bütün Piliç', 1, 'adet', 214.95],
    ['Muz', 1000, 'g', 64.9],
  ]);
});

test('Kullanıcının önceki düzeltmesi (alias) eşleştirmeden önce gelir', () => {
  assert.equal(matchProduct('Banvit Bütün Piliç', products, { 'banvit butun pilic': 'Bütün tavuk' }).name, 'Bütün tavuk');
  assert.equal(matchProduct('BANVIT BUTUN PILIC', products, { 'banvit butun pilic': 'Bütün tavuk' }).name, 'Bütün tavuk');
});
