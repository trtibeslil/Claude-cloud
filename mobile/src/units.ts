// Birim hesapları: JSON içe aktarmadan saf fonksiyonlar (Node testleri de doğrudan kullanır).

export const UNITS = ['g', 'ml', 'adet', 'paket', 'demet', 'kutu', 'şişe'] as const;
export type Unit = (typeof UNITS)[number];

export const lower = (s: string) => String(s ?? '').trim().toLocaleLowerCase('tr');
export const toNumber = (v: unknown) => Number(String(v ?? '').replace(',', '.')) || 0;

/** Birimi temel birime çevirir: kg→g, l→ml, tane→adet. */
export function norm(qty: unknown, unit: unknown): { qty: number; unit: Unit } {
  const q = toNumber(qty);
  const u = lower(String(unit ?? '')).replace(/\.$/, '');
  if (['kg', 'kilo', 'kilogram'].includes(u)) return { qty: q * 1000, unit: 'g' };
  if (['g', 'gr', 'gram'].includes(u)) return { qty: q, unit: 'g' };
  if (['l', 'lt', 'litre', 'liter'].includes(u)) return { qty: q * 1000, unit: 'ml' };
  if (['ml', 'mililitre'].includes(u)) return { qty: q, unit: 'ml' };
  if (['adet', 'tane', 'ad', 'x'].includes(u)) return { qty: q, unit: 'adet' };
  if ((UNITS as readonly string[]).includes(u)) return { qty: q, unit: u as Unit };
  return { qty: q, unit: 'adet' };
}

export function roundQty(q: number, unit: string) {
  if (unit === 'g' || unit === 'ml') return Math.round(q);
  return Math.round(q * 10) / 10;
}

const nf = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
export function fmtQty(q: number, unit: string) {
  if (unit === 'g' && q >= 1000) return nf.format(Math.round(q / 10) / 100) + ' kg';
  if (unit === 'ml' && q >= 1000) return nf.format(Math.round(q / 10) / 100) + ' L';
  return nf.format(roundQty(q, unit)) + ' ' + unit;
}

/** Bu miktarın altı "bitti" sayılır. */
export const nearlyZero = (q: number, unit: string) => (unit === 'g' || unit === 'ml' ? q < 5 : q < 0.25);
