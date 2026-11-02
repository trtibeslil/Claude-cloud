// Telefonun metin tanımasından gelen satırları (fiş ya da "Siparişlerim" ekran görüntüsü) ürün satırlarına çevirir.
// Yapay zekâ kullanmaz; Türk market fişlerinin yaygın kalıplarına dayanır. Saf fonksiyonlar, test: receipt.test.ts.
//
// Metin tanıma satırların konumunu vermez ve fişte ürün adı ile fiyat ayrı satırlar olarak gelebilir;
// bu yüzden fiyatsız adlar sıraya alınır, sonradan gelen tek başına fiyatlar sırayla bunlara verilir.

export type ReceiptLine = {
  raw: string;            // fişteki ürün adı (temizlenmiş)
  qty: number;            // temel birimde: g, ml ya da adet
  unit: 'g' | 'ml' | 'adet';
  price: number | null;   // satır toplamı (TL), indirim düşülmüş
};

const PRICE = String.raw`(\d{1,3}(?:[.\s]\d{3})*[.,]\d{2}|\d{1,5}[.,]\d{2})`;
const SKIP = new RegExp([
  'TOPLAM', 'TOPKDV', 'KDV', 'ARA ?TOP', 'NAK[İI]T', 'KRED[İI]', '\\bKART\\b', 'PARA [ÜU]ST', 'F[İI][ŞS] ?NO', 'TAR[İI]H', 'SAAT',
  'V\\.?D\\b', 'VKN', 'TCKN', 'MERS[İI]S', '\\bZ ?NO', '\\bEKU\\b', '\\bKASA\\b', 'KAS[İI]YER', 'TE[ŞS]EKK', 'POŞET', 'POSET', 'BANKA',
  '\\bONAY\\b', '\\bREF\\b', 'ADRES', '\\bTEL\\b', 'WWW', '\\.COM', 'TESL[İI]MAT', 'KARGO', 'H[İI]ZMET BEDEL', 'SEPET', 'S[İI]PAR[İI][ŞS] (NO|TAR)',
  'MAH\\.', 'CAD\\.', 'SOK\\.', 'A\\.\\s?Ş\\.', '\\bLTD', 'T[İI]C\\.', 'MA[ĞG]AZA', 'S[İI]PAR[İI][ŞS]', 'B[İI]LG[İI] F[İI][ŞS]', 'E-?AR[ŞS][İI]V', '\\bÖDEME', '\\bODEME', 'ODENEN', 'ÖDENEN', '\\bTUTAR',
].join('|'), 'i');
const DISCOUNT = /(İND[İI]R[İI]M|INDIRIM|KAMPANYA|KUPON|PUAN)/i;
const DATE_TIME = /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b|\b\d{1,2}:\d{2}\b/;

/** "1.234,56" / "34,90" / "34.90" → sayı */
export function parsePrice(s: string): number {
  let t = s.replace(/\s/g, '');
  if (/[.,]\d{2}$/.test(t)) {
    const dec = t.slice(-2);
    t = t.slice(0, -3).replace(/[.,]/g, '') + '.' + dec;
  }
  return Number(t) || 0;
}
const num = (s: string) => Number(s.replace(',', '.')) || 0;

/** Ürün adındaki paket boyutu: "SPAGETTI 500 G", "SUT 1L", "YOGURT 1,5 KG" */
export function packSize(name: string): { qty: number; unit: 'g' | 'ml' } | null {
  const m = name.match(/(\d+(?:[.,]\d+)?)\s*(KG|GR|G|LT|L|ML|CL)\b/i);
  if (!m) return null;
  const v = num(m[1]);
  const u = m[2].toUpperCase();
  if (u === 'KG') return { qty: v * 1000, unit: 'g' };
  if (u === 'G' || u === 'GR') return { qty: v, unit: 'g' };
  if (u === 'L' || u === 'LT') return { qty: v * 1000, unit: 'ml' };
  if (u === 'CL') return { qty: v * 10, unit: 'ml' };
  return { qty: v, unit: 'ml' };
}

/** "YUMURTA 15'Lİ", "30 LU" → parça sayısı */
const PIECES = /(\d{1,3})\s*'?\s*(?:L[İIUÜ])(?![A-Za-zÇĞİÖŞÜçğıöşü])/i;
export function pieceCount(name: string) {
  const m = name.match(PIECES);
  return m ? Number(m[1]) : null;
}

/** Fiş adından vergi oranı, yıldız, paket boyutu gibi gürültüyü atar. */
export function cleanName(name: string) {
  return name
    .replace(/%\s?\d{1,2}/g, ' ')
    .replace(/[*#]+/g, ' ')
    .replace(/(\d+(?:[.,]\d+)?)\s*(KG|GR|G|LT|L|ML|CL)\b/gi, ' ')
    .replace(/\b\d+\s*(AD|ADET|X)\b/gi, ' ')
    .replace(new RegExp(PIECES.source, 'gi'), ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

type Building = { name: string; price: number | null; count: number; weightG: number | null; unitPrice: number | null };

export function parseReceipt(input: string[] | string): ReceiptLine[] {
  const lines = (Array.isArray(input) ? input.join('\n') : input)
    .split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);

  const items: Building[] = [];
  let pending: { count: number; weightG: number | null; unitPrice: number | null } | null = null;
  const priceless: Building[] = []; // fiyatı sonradan gelecek adlar (sütunları ayrı okunan fişler)

  for (const line of lines) {
    if (DATE_TIME.test(line) && !/[A-ZÇĞİÖŞÜa-zçğıöşü]{3,}.*\d+[.,]\d{2}\s*$/.test(line)) continue;

    // İndirim: önceki ürünün fiyatından düş
    if (DISCOUNT.test(line)) {
      const m = line.match(new RegExp(PRICE + String.raw`\s*(TL|₺)?\s*$`));
      const last = items[items.length - 1];
      if (m && last && last.price != null) last.price = Math.max(0, last.price - parsePrice(m[1]));
      continue;
    }
    if (SKIP.test(line)) continue;

    // Tartılı ürün satırı: "1,245 KG X 39,90" (ürün satırından önce gelir)
    let m = line.match(new RegExp(String.raw`^(\d+[.,]\d+)\s*KG\s*[xX*]\s*` + PRICE, 'i'));
    if (m) { pending = { count: 1, weightG: Math.round(num(m[1]) * 1000), unitPrice: parsePrice(m[2]) }; continue; }

    // Çoklu adet satırı: "2 X 17,45" / "3 AD X 9,90"
    m = line.match(new RegExp(String.raw`^(\d{1,3})\s*(?:AD(?:ET)?\.?)?\s*[xX*]\s*` + PRICE, 'i'));
    if (m) { pending = { count: Number(m[1]), weightG: null, unitPrice: parsePrice(m[2]) }; continue; }

    // Sipariş ekranı adet satırı: "2 adet", "Adet: 3", "x2" (ürünün ardından gelir)
    m = line.match(/^(?:ADET\s*:?\s*(\d{1,3})|(\d{1,3})\s*(?:ADET|AD\.?)|[xX]\s?(\d{1,3}))$/i);
    if (m) {
      const last = items[items.length - 1];
      if (last) last.count = Number(m[1] ?? m[2] ?? m[3]);
      continue;
    }

    // Tek başına fiyat: sütunları ayrı okunmuş fişte sıradaki fiyatsız ada verilir
    m = line.match(new RegExp(String.raw`^\*?\s?` + PRICE + String.raw`\s*(TL|₺)?$`, 'i')) ?? line.match(new RegExp(String.raw`^₺\s?` + PRICE + '$'));
    if (m) {
      const target = priceless.shift();
      if (target) target.price = parsePrice(m[1]);
      continue;
    }

    // Ad + fiyat aynı satırda: "DOMATES SALKIM %1 *49,68" / "Spagetti 500 g ₺34,90"
    m = line.match(new RegExp(String.raw`^(.*?[A-Za-zÇĞİÖŞÜçğıöşü]{2}.*?)\s+(?:%\s?\d{1,2}\s+)?(?:\*|₺)?\s?` + PRICE + String.raw`\s*(TL|₺)?$`, 'i'));
    if (m) {
      items.push({ name: m[1], price: parsePrice(m[2]), count: pending?.count ?? 1, weightG: pending?.weightG ?? null, unitPrice: pending?.unitPrice ?? null });
      pending = null;
      continue;
    }

    // Yalnızca ad (en az iki harf): fiyatı sonra gelebilir
    if (/[A-Za-zÇĞİÖŞÜçğıöşü]{2,}/.test(line) && line.length <= 60) {
      const b: Building = { name: line, price: null, count: pending?.count ?? 1, weightG: pending?.weightG ?? null, unitPrice: pending?.unitPrice ?? null };
      if (b.unitPrice != null) b.price = Math.round((b.weightG ? (b.weightG / 1000) * b.unitPrice : b.count * b.unitPrice) * 100) / 100;
      pending = null;
      items.push(b);
      if (b.price == null) priceless.push(b);
    }
  }

  return items.flatMap((b): ReceiptLine[] => {
    const raw = cleanName(b.name);
    if (raw.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '').length < 2) return [];
    if (b.weightG) return [{ raw, qty: b.weightG, unit: 'g', price: b.price }];
    const pieces = pieceCount(b.name);
    if (pieces) return [{ raw, qty: pieces * b.count, unit: 'adet', price: b.price }];
    const size = packSize(b.name);
    if (size) return [{ raw, qty: size.qty * b.count, unit: size.unit, price: b.price }];
    return [{ raw, qty: b.count, unit: 'adet', price: b.price }];
  });
}
