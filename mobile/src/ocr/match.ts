// Fiş satırını ürün kataloğuyla eşleştirir; kullanıcının önceki düzeltmeleri (aliases) önce gelir.
import type { Product } from '../logic';

/** Türkçe harfleri sadeleştirir: metin tanıma "ş, ğ, ı" harflerini sık karıştırır. */
export function fold(s: string) {
  return s.toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
const tokens = (s: string) => fold(s).split(' ').filter(t => t.length >= 2 && !/^\d+$/.test(t));

/** Kelime eşleşmesi: 2 tam, 1 yakın (fiş kısaltması "salk" ~ "salkim" ya da ek "domatesi" ~ "domates"), 0 yok.
 *  Yakınlık en az 4 harf ve en fazla 3 harf farkla sınırlı: "sut" ≠ "sutlac", "zeytin" ≠ "zeytinyagi". */
function tokenHit(productToken: string, lineTokens: string[]) {
  let best = 0;
  for (const t of lineTokens) {
    if (t === productToken) return 2;
    const [short, long] = t.length < productToken.length ? [t, productToken] : [productToken, t];
    if (short.length >= 4 && long.length - short.length <= 3 && long.startsWith(short)) best = 1;
  }
  return best;
}

export const aliasKey = (raw: string) => fold(raw);

export function matchProduct(raw: string, products: Product[], aliases: Record<string, string>): { name: string; product: Product | null } {
  const alias = aliases[aliasKey(raw)];
  if (alias) return { name: alias, product: products.find(p => p.name === alias) ?? null };
  const lt = tokens(raw);
  let best: Product | null = null, bestScore = 0;
  for (const p of products) {
    const pt = tokens(p.name);
    const hits = pt.map(t => tokenHit(t, lt));
    if (!pt.length || hits.includes(0)) continue;
    // tam eşleşen kelime, sonra daha çok ve daha uzun kelime eşleşen ürün kazanır
    const score = hits.filter(x => x === 2).length * 1000 + pt.length * 10 + pt.join('').length;
    if (score > bestScore) { best = p; bestScore = score; }
  }
  if (best) return { name: best.name, product: best };
  // Türkçe karaktersiz basılmış fişte "ZEYTIN"deki I aslında İ'dir; Türkçe büyük harf yoksa I → i.
  const pretty = /[ÇĞİÖŞÜ]/.test(raw) ? raw.toLocaleLowerCase('tr') : raw.toLowerCase();
  return { name: pretty.charAt(0).toLocaleUpperCase('tr') + pretty.slice(1), product: null };
}
