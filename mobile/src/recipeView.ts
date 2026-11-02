// "Bunu yapıyorum" tarif ekranının saf hesapları: kişi sayısına göre malzeme listesi ve otomatik hazırlık adımları.
// (test: recipeView.test.ts)
import { fold } from './ocr/match';
import { isStaple, stockFor, type Recipe } from './planner';
import type { Item } from './logic';
import { fmtQty, norm } from './units';

const BASE_SERVINGS = 4;

export type IngredientStatus = 'have' | 'short' | 'staple' | 'optional' | 'missing';
export type IngredientRow = { name: string; amount: string; status: IngredientStatus; stockName?: string };

/** Tarif malzemelerini kişi sayısına göre ölçekler ve dolaptaki durumunu bulur. */
export function ingredientRows(r: Recipe, items: Item[], people: number, catOf: (n: string) => string | undefined): IngredientRow[] {
  const scale = people / BASE_SERVINGS;
  const rows = r.i.map(([name, qty, unit, optional]): IngredientRow => {
    const need = norm(qty * scale, unit);
    const amount = fmtQty(need.qty, need.unit);
    const it = stockFor(name, items, catOf);
    if (it) {
      const short = it.unit === need.unit && it.qty < need.qty * 0.8;
      return { name, amount, status: short ? 'short' : 'have', stockName: fold(it.name) === fold(name) ? undefined : it.name };
    }
    if (isStaple(name)) return { name, amount, status: 'staple' };
    return { name, amount, status: optional ? 'optional' : 'missing' };
  });
  // Önce zorunlular, isteğe bağlılar sonda
  return [...rows.filter(x => x.status !== 'optional'), ...rows.filter(x => x.status === 'optional')];
}

const has = (names: string[], re: RegExp) => names.filter(n => re.test(fold(n)));
const list = (xs: string[]) => xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' ve ' + xs[xs.length - 1];
const lc = (s: string) => s.toLocaleLowerCase('tr');

/**
 * Tarifin adımlarından önce yapılacak hazırlık: ıslatma, etin oda sıcaklığına gelmesi, yıkama, fırını ısıtma...
 * Malzeme adlarından ve adımlardan çıkarılır; adımlarda zaten anlatılanı tekrar etmez.
 */
export function prepSteps(r: Recipe, catOf: (n: string) => string | undefined): string[] {
  const names = r.i.map(x => x[0]);
  const text = fold(r.s.join(' '));
  const out = ['Malzemelerin hepsini tezgâha çıkar, ölç ve kullanacağın tencere/tavayı hazırla.'];

  const dry = has(names, /^(kuru fasulye|nohut|barbunya|borulce)$/);
  if (dry.length && !/islat/.test(text)) out.push(`${list(dry)} kuruysa bir gece önceden bol suda ıslat; sabah suyunu dök, durula.`);

  const rice = has(names, /pirinc$/);
  if (rice.length && !/islat|beklet/.test(text)) out.push('Pirinci ılık tuzlu suda 20 dakika beklet, sonra suyu berraklaşana kadar yıka ve süz.');

  const meat = names.filter(n => ['Kırmızı Et', 'Beyaz Et'].includes(catOf(n) ?? '') && !/kiyma|kofte|ciger/.test(fold(n)));
  if (meat.length) out.push(`${list(meat)}: pişirmeden 20-30 dakika önce buzdolabından çıkar, kâğıt havluyla kurula. Kuru et daha iyi kızarır.`);

  const fish = names.filter(n => catOf(n) === 'Balık & Deniz Ürünleri' && !/ton baligi/.test(fold(n)));
  if (fish.length) out.push(`${list(fish)}: soğuk suda durula, kâğıt havluyla iyice kurula, pişene kadar buzdolabında tut.`);

  const wash = names.filter(n => ['Sebze', 'Meyve', 'Yeşillik & Taze Ot'].includes(catOf(n) ?? '')
    && !/^(kuru sogan|kirmizi sogan|sarimsak|patates|limon)$/.test(fold(n)) && !/dondurulmus|konserve/.test(fold(n)));
  const greens = wash.some(n => catOf(n) === 'Yeşillik & Taze Ot');
  if (wash.length) out.push(`Yıka ve süz: ${lc(list(wash))}.${greens ? ' Yeşillikleri doğramadan önce iyice kurula, yoksa yemeği sulandırır.' : ''}`);

  const peel = has(names, /^(kuru sogan|kirmizi sogan|sarimsak|patates|havuc)$/);
  if (peel.length) out.push(`Soy: ${lc(list(peel))}. Tarifte nasıl doğranacağı yazıyor; hepsini baştan doğrayıp kaplara ayırırsan pişirirken telaş olmaz.`);

  const oven = /firin/.test(text) && !/firini.*isit|isitilmis firin|onceden isit/.test(text);
  const temp = r.s.join(' ').match(/(\d{3})\s*(?:°C|derece)/);
  if (oven) out.push(`Fırını ${temp ? temp[1] + ' dereceye' : 'tarifteki sıcaklığa'} önceden ısıt (yaklaşık 15 dakika).`);
  return out;
}
