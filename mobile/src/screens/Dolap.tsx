import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { addItems, CATS, fmtQty, lower, norm, nudgeItem, perLabel, roundQty, swipeStep, UNITS, type Item } from '../logic';
import { catColor } from './Pick';
import { useStore } from '../store';
import { Btn, Card, Field, Icon, Row, SwipeHint, SwipeRow, T, Toggle, useColors, useScale } from '../ui';

export function DolapScreen({ go }: { go: (tab: 'ekle' | 'menu') => void }) {
  const { state, update, toast } = useStore();
  const c = useColors();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const k = useScale();

  if (!state.items.length) {
    return (
      <View style={{ gap: 16 }}>
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <T kind="h2">Dolabın boş görünüyor</T>
          <T kind="small" style={{ textAlign: 'center' }}>Aldıklarını ürün listesinden seçerek başla: meyve, sebze, et, şarküteri ve daha fazlası.</T>
          <Btn kind="primary" title="Malzeme ekle" onPress={() => go('ekle')} />
        </Card>
        <ManualAdd />
      </View>
    );
  }

  const q = lower(query);
  const items = state.items.filter(i => !q || lower(i.name).includes(q));
  const cats = new Set(state.items.map(i => i.category));
  const { swipe, haptics } = state.settings;

  const nudge = (it: Item, dir: 1 | -1) => {
    const before = state.items;
    const r = nudgeItem(state.items, it.id, dir);
    update(s => ({ ...s, items: nudgeItem(s.items, it.id, dir).items, invRev: s.invRev + 1 }));
    if (r.removed) {
      toast(`${it.name} bitti, dolaptan çıkarıldı.`, {
        label: 'Geri al',
        onPress: () => { update(s => ({ ...s, items: s.items.some(i => i.id === it.id) ? s.items : [...s.items, before.find(i => i.id === it.id)!], invRev: s.invRev + 1 })); toast('Geri alındı.'); },
      });
    } else if (r.item) {
      toast(`${it.name}: ${fmtQty(r.item.qty, r.item.unit)}`);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <T kind="h2">{state.items.length} malzeme</T>
          <T kind="small">{cats.size} kategori</T>
        </View>
        <Btn title="Menü öner" onPress={() => go('menu')} />
      </Row>
      <Field placeholder="Dolapta ara" value={query} onChangeText={setQuery} style={{ flex: 0 }} clearButtonMode="while-editing" />
      {swipe ? <SwipeHint right="artır" left="azalt" /> : null}
      <Card style={{ gap: 0 }}>
        {!items.length ? <T kind="small">Aramana uyan malzeme yok.</T> : null}
        {CATS.map(cat => {
          const list = items.filter(i => i.category === cat).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
          if (!list.length) return null;
          return (
            <View key={cat}>
              <Row style={{ paddingTop: 14, paddingBottom: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: catColor(c, cat) }} />
                <T kind="label">{cat}</T>
              </Row>
              {list.map((it, idx) => editing === it.id
                ? <EditRow key={it.id} item={it} onDone={() => setEditing(null)} />
                : (
                  <View key={it.id} style={{ borderTopWidth: idx ? 1 : 0, borderColor: c.line }}>
                    <SwipeRow enabled={swipe} haptics={haptics}
                      rightLabel={'+' + fmtQty(swipeStep(it), it.unit)} leftLabel={'−' + fmtQty(swipeStep(it), it.unit)}
                      onRight={() => nudge(it, 1)} onLeft={() => nudge(it, -1)}>
                      <Pressable onPress={() => setEditing(it.id)} accessibilityRole="button" accessibilityLabel={`${it.name}, ${fmtQty(it.qty, it.unit)}`} accessibilityHint="Düzenlemek için dokun"
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <T style={{ fontWeight: '600' }}>{it.name}</T>
                          {it.unitPrice ? <T kind="small">{perLabel(it)}</T> : null}
                        </View>
                        <View style={{ backgroundColor: c.field, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <T kind="mono" style={{ fontSize: 13 * k }}>{fmtQty(it.qty, it.unit)}</T>
                        </View>
                        <Icon name="chevron-forward" size={16} color={c.muted} />
                      </Pressable>
                    </SwipeRow>
                  </View>
                ))}
            </View>
          );
        })}
      </Card>
      <ManualAdd />
    </View>
  );

}

function EditRow({ item, onDone }: { item: Item; onDone: () => void }) {
  const { update, toast } = useStore();
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(String(item.qty));
  const [unit, setUnit] = useState<string>(item.unit);
  return (
    <View style={{ gap: 8, paddingVertical: 10 }}>
      <Field value={name} onChangeText={setName} accessibilityLabel="Ad" style={{ flex: 0 }} />
      <Row>
        <Field value={qty} onChangeText={setQty} keyboardType="decimal-pad" width={100} accessibilityLabel="Miktar" />
        <UnitPicker value={unit} onChange={setUnit} />
      </Row>
      <Row>
        <Btn kind="primary" title="Kaydet" onPress={() => {
          const n = norm(qty, unit);
          update(s => ({
            ...s, invRev: s.invRev + 1,
            items: n.qty > 0
              ? s.items.map(i => i.id === item.id ? { ...i, name: name.trim() || i.name, qty: roundQty(n.qty, n.unit), unit: n.unit } : i)
              : s.items.filter(i => i.id !== item.id),
          }));
          onDone();
        }} />
        <Btn title="Vazgeç" onPress={onDone} />
        <Btn kind="danger" title="Bitti, sil" onPress={() => {
          update(s => ({ ...s, invRev: s.invRev + 1, items: s.items.filter(i => i.id !== item.id) }));
          toast(item.name + ' dolaptan çıkarıldı.');
          onDone();
        }} />
      </Row>
    </View>
  );
}

export function UnitPicker({ value, onChange }: { value: string; onChange: (u: string) => void }) {
  return (
    <Row style={{ gap: 6 }}>
      {UNITS.map(u => <Toggle key={u} label={u} on={value === u} onPress={() => onChange(u)} />)}
    </Row>
  );
}

function ManualAdd() {
  const { update, toast } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('g');
  const [cat, setCat] = useState('Diğer');
  if (!open) return <Btn kind="ghost" title="+ Elle tek malzeme ekle" onPress={() => setOpen(true)} />;
  return (
    <Card>
      <T kind="h3">Elle ekle</T>
      <Field placeholder="Ör. Pirinç" value={name} onChangeText={setName} style={{ flex: 0 }} accessibilityLabel="Malzeme adı" />
      <Field placeholder="Miktar, ör. 1000" value={qty} onChangeText={setQty} keyboardType="decimal-pad" style={{ flex: 0 }} accessibilityLabel="Miktar" />
      <UnitPicker value={unit} onChange={setUnit} />
      <T kind="label">Kategori</T>
      <Row style={{ gap: 6 }}>{CATS.map(k => <Toggle key={k} label={k} on={cat === k} onPress={() => setCat(k)} />)}</Row>
      <Row>
        <Btn kind="primary" title="Ekle" onPress={() => {
          if (!name.trim() || !(Number(qty.replace(',', '.')) > 0)) { toast('Ad ve miktar gir.'); return; }
          update(s => { const r = addItems(s.items, [{ name, qty, unit, category: cat }]); return { ...s, items: r.items, invRev: s.invRev + 1 }; });
          toast(name.trim() + ' eklendi.');
          setName(''); setQty('');
        }} />
        <Btn title="Kapat" onPress={() => setOpen(false)} />
      </Row>
    </Card>
  );
}
