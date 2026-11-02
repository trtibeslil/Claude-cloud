// Vikipedi sonuçlarından yemek fotoğrafı seçme kuralları (saf; test: recipeView.test.ts).
import { fold } from './ocr/match';

/** Maddenin yemek maddesi olduğunu kategorilerinden anlar ("Menemen" ilçe maddesini eler). */
const FOOD_CAT = /mutfa|yemek|corba|tatli|pilav|kebap|kebab|kofte|borek|hamur isi|salata|kahvalti|meze|\bsos(lar)?\b|ekmek|makarna|zeytinyagli|dolma|sarma/;
const NOT_FOOD_CAT = /ilce|mahalle|\bkoy(ler|leri)?\b|\bil(ler|leri)?\b|sehir|nufus|futbol|film|album|sarki|kisiler|dogumlu/;
export function isFoodPage(categories: string[]) {
  const cs = categories.map(c => fold(c.replace(/^Kategori:/, '')));
  return cs.some(c => FOOD_CAT.test(c)) && !cs.some(c => NOT_FOOD_CAT.test(c));
}
/** Harita, logo, bayrak, çizim gibi fotoğraf olmayan dosyaları eler. */
export function isPhotoFile(name: string) {
  const f = fold(name);
  return /\.(jpe?g|webp)$/i.test(name) && !/map|harita|logo|flag|bayrak|locator|konum|icon|ikon|diagram|coat of arms|\barma\b/.test(f);
}
