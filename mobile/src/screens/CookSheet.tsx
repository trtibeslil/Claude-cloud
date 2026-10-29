import { useEffect, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { applyCook, cookRows, fmtQty, nearlyZero, toNumber, type CookRow } from '../logic';
import { useStore } from '../store';
import { Btn, Field, Row, Stepper, T, useColors } from '../ui';
import type { CookRequest } from './Menu';

export function CookSheet({ req, onClose }: { req: CookRequest | null; onClose: () => void }) {
  const { state, update, toast } = useStore();
  const c = useColors();
  const [people, setPeople] = useState(req?.people ?? 4);
  const [rows, setRows] = useState<CookRow[]>([]);

  useEffect(() => {
    if (!req) return;
    setPeople(req.people);
    setRows(cookRows(state.items, req.uses, req.people, req.servings));
    // yalnızca yeni bir istek açıldığında hesapla
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  const changePeople = (n: number) => {
    if (!req) return;
    setPeople(n);
    setRows(prev => cookRows(state.items, req.uses, n, req.servings, prev));
  };

  const confirm = () => {
    if (!req) return;
    const { state: next, finished } = applyCook(state, { title: req.title, people, rows, source: req.source });
    update(() => next);
    onClose();
    toast(finished.length ? `Dolap güncellendi. Biten: ${finished.join(', ')}.` : 'Dolap güncellendi. Afiyet olsun!');
  };

  return (
    <Modal visible={!!req} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={{ backgroundColor: c.surface }} contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <T kind="h2" style={{ flex: 1 }}>{req?.title}</T>
          <Btn kind="ghost" title="Vazgeç" onPress={onClose} />
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <T style={{ fontWeight: '600' }}>Kaç kişilik yapıyorsun?</T>
          <Stepper label="Kişi sayısı" value={people} min={1} max={30} onChange={changePeople} />
        </Row>
        <View>
          <T kind="label">Dolaptan düşülecek</T>
          {rows.length ? rows.map((r, i) => {
            const it = state.items.find(x => x.id === r.itemId);
            if (!it) return null;
            const left = Math.max(0, it.qty - toNumber(r.use));
            return (
              <Row key={r.itemId} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: c.line, flexWrap: 'nowrap' }}>
                <View style={{ flex: 1 }}>
                  <T>{it.name}</T>
                  <T kind="small">{nearlyZero(left, it.unit) ? 'bitecek' : 'kalan ' + fmtQty(left, it.unit)}</T>
                </View>
                <Field width={90} keyboardType="decimal-pad" value={r.use} style={{ textAlign: 'right' }}
                  accessibilityLabel={it.name + ' kullanılan miktar'}
                  onChangeText={v => setRows(prev => prev.map(x => (x.itemId === r.itemId ? { ...x, use: v, edited: true } : x)))} />
                <T kind="small" style={{ width: 36 }}>{it.unit}</T>
              </Row>
            );
          }) : <T kind="small">Bu yemekte dolaptaki malzemelerden kullanım bulunamadı.</T>}
        </View>
        <T kind="small">Miktarları kişi sayısına göre hesapladım. Gerçekte kullandığın farklıysa kutulardan düzelt.</T>
        <Btn kind="primary" title="Yaptım, dolaptan düş" onPress={confirm} />
      </ScrollView>
    </Modal>
  );
}
