import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { addItems, CAT_HUE, CATS, fmtTL, lower, norm, PRODUCTS, toNumber, type Product } from '../logic';
import { useStore } from '../store';
import { Btn, Card, Chip, Field, isDark, Row, T, Toggle, useColors, type Colors } from '../ui';

const INPUT_UNITS = ['kg', 'g', 'l', 'ml', 'adet', 'paket', 'demet', 'kutu', 'şişe'];
const QUICK: Record<string, number[]> = {
  kg: [0.5, 1, 2], g: [250, 500, 1000], l: [0.5, 1, 2], ml: [250, 500, 1000], adet: [1, 2, 6, 10],
  paket: [1, 2, 3], demet: [1, 2], kutu: [1, 2, 3], 'şişe': [1, 2],
};
const nf = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
export const catColor = (c: Colors, cat: string) => `hsl(${CAT_HUE[cat] ?? 30}, ${isDark(c) ? '62%, 66%' : '60%, 44%'})`;
const CATS_WITH_ITEMS = CATS.filter(k => PRODUCTS.some(p => p.cat === k));

/** Katalogdan ürün seçip miktar girerek sepete ekleme; sepet tek seferde dolaba eklenir. */
export function PickCard({ go }: { go: (tab: 'dolap') => void }) {
  const { state, update, toast, basket, setBasket } = useStore();
  const c = useColors();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(CATS_WITH_ITEMS[0]);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState({ qty: '', unit: 'kg', price: '' });

  const query = lower(q);
  const list: (Product & { custom?: boolean })[] = useMemo(() => {
    const found = query ? PRODUCTS.filter(p => lower(p.name).includes(query)).slice(0, 40) : PRODUCTS.filter(p => p.cat === cat);
    if (query && !found.some(p => lower(p.name) === query)) {
      const name = q.trim().charAt(0).toLocaleUpperCase('tr') + q.trim().slice(1);
      return [...found, { name, cat: 'Diğer', unit: 'adet', q: 1, custom: true }];
    }
    return found;
  }, [query, cat, q]);

  const toggle = (p: Product) => {
    if (open === p.name) { setOpen(null); return; }
    const prev = basket.find(b => lower(b.name) === lower(p.name));
    setDraft(prev ? { qty: String(prev.qty), unit: String(prev.unit), price: String(prev.price ?? '') } : { qty: String(p.q), unit: p.unit, price: '' });
    setOpen(p.name);
  };
  const addToBasket = (p: Product) => {
    if (!(norm(draft.qty, draft.unit).qty > 0)) { toast('Miktar gir.'); return; }
    setBasket(b => [...b.filter(x => lower(x.name) !== lower(p.name)), { name: p.name, category: p.cat, ...draft }]);
    setOpen(null);
    toast(`${p.name} sepete eklendi.`);
  };
  const confirm = () => {
    const res = addItems(state.items, basket); // yalnızca mesajdaki sayılar için
    update(s => ({ ...s, items: addItems(s.items, basket).items, invRev: s.invRev + 1 }));
    setBasket(() => []);
    setQ('');
    toast(`${res.added} yeni malzeme eklendi` + (res.increased ? `, ${res.increased} malzemenin miktarı arttı.` : '.'));
    go('dolap');
  };

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <T kind="h2">Listeden seç</T>
        <T kind="small">{PRODUCTS.length} ürün</T>
      </Row>
      <T kind="small">Aldığın ürünü bul, miktarını gir ve sepete ekle. Sepettekileri tek seferde dolaba eklersin.</T>
      <Field placeholder="Ürün ara: domates, tavuk göğsü, kaşar…" value={q} onChangeText={t => { setQ(t); setOpen(null); }}
        style={{ flex: 0 }} clearButtonMode="while-editing" autoCorrect={false} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} accessibilityRole="tablist">
        {CATS_WITH_ITEMS.map(k => {
          const on = k === cat && !query;
          return (
            <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: on }}
              onPress={() => { setCat(k); setQ(''); setOpen(null); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? c.ink : c.field }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: catColor(c, k) }} />
              <T kind="small" color={on ? c.bg : c.ink} style={{ fontWeight: '600' }}>{k}</T>
            </Pressable>
          );
        })}
      </ScrollView>

      <View>
        {list.map(p => {
          const inBasket = basket.some(b => lower(b.name) === lower(p.name));
          const isOpen = open === p.name;
          return (
            <View key={p.name} style={isOpen ? { backgroundColor: c.field, borderRadius: 14, marginVertical: 4 } : undefined}>
              <Pressable onPress={() => toggle(p)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, minHeight: 46 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: catColor(c, p.cat) }} />
                <T style={{ flex: 1, fontWeight: '600' }}>
                  {p.custom ? `"${p.name}" ekle (listede yok)` : p.name}
                  {query && !p.custom ? <T kind="small"> · {p.cat}</T> : null}
                </T>
                {inBasket ? <Chip tone="done" text="Sepette" /> : <T color={c.accent} style={{ fontWeight: '800', fontSize: 18 }}>+</T>}
              </Pressable>
              {isOpen ? (
                <View style={{ gap: 10, paddingHorizontal: 10, paddingBottom: 12 }}>
                  <Row>
                    <Field value={draft.qty} onChangeText={v => setDraft(d => ({ ...d, qty: v }))} keyboardType="decimal-pad" width={90}
                      accessibilityLabel={p.name + ' miktarı'} style={{ backgroundColor: c.surface }} />
                    <Field value={draft.price} onChangeText={v => setDraft(d => ({ ...d, price: v }))} keyboardType="decimal-pad" width={100}
                      placeholder="Fiyat ₺" accessibilityLabel="Fiyat (TL, isteğe bağlı)" style={{ backgroundColor: c.surface }} />
                  </Row>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {INPUT_UNITS.map(u => <Toggle key={u} label={u} on={draft.unit === u} onPress={() => setDraft(d => ({ ...d, unit: u }))} />)}
                  </ScrollView>
                  <Row style={{ gap: 6 }}>
                    {(QUICK[draft.unit] ?? []).map(v => (
                      <Btn key={v} title={`${nf.format(v)} ${draft.unit}`} onPress={() => setDraft(d => ({ ...d, qty: String(v) }))} style={{ minHeight: 36 }} />
                    ))}
                  </Row>
                  <Btn kind="primary" title={inBasket ? 'Sepeti güncelle' : 'Sepete ekle'} onPress={() => addToBasket(p)} />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {basket.length ? (
        <View style={{ gap: 8, padding: 14, borderRadius: 18, backgroundColor: c.accentSoft }}>
          <T kind="label" color={c.accent}>Sepet · {basket.length} ürün</T>
          {basket.map((b, i) => (
            <Row key={b.name + i} style={{ flexWrap: 'nowrap' }}>
              <T style={{ flex: 1, fontWeight: '600' }}>{b.name}</T>
              <T kind="mono">{nf.format(toNumber(b.qty))} {String(b.unit)}{toNumber(b.price) > 0 ? ` · ${fmtTL(toNumber(b.price))}` : ''}</T>
              <Btn kind="ghost" title="Çıkar" onPress={() => setBasket(x => x.filter((_, j) => j !== i))} style={{ minHeight: 32 }} />
            </Row>
          ))}
          <Btn kind="primary" title={`Dolaba ekle (${basket.length})`} onPress={confirm} />
        </View>
      ) : (
        <T kind="small">Sepet boş. Ürüne dokunup miktarını gir.</T>
      )}
    </Card>
  );
}
