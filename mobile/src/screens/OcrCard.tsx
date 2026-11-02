import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { addItems, PRODUCTS, roundQty } from '../logic';
import { recognizeText } from '../ocr/engine';
import { aliasKey, matchProduct } from '../ocr/match';
import { parseReceipt } from '../ocr/receipt';
import { useStore } from '../store';
import { Btn, Card, Field, Notice, Row, T, useColors } from '../ui';
import { UnitPicker } from './Dolap';

type Row = { on: boolean; raw: string; name: string; qty: string; unit: string; price: string };
const MAX_ALIASES = 500;

/** Telefonun kendi metin tanımasıyla fiş / sipariş ekran görüntüsü okuma. Yalnızca OCR_ENABLED açıkken gösterilir. */
export function OcrCard({ go }: { go: (tab: 'dolap') => void }) {
  const { state, update, toast } = useStore();
  const c = useColors();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);

  async function read(fromCamera: boolean) {
    setErr(null);
    if (fromCamera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
      toast('Kamera izni verilmedi. Ayarlar > Dolap Defteri bölümünden açabilirsin.');
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: true, selectionLimit: 6, orderedSelection: true });
    if (res.canceled) return;
    setBusy(true);
    try {
      const lines: string[] = [];
      for (const a of res.assets) lines.push(...(await recognizeText(a.uri)));
      const parsed = parseReceipt(lines).map((l): Row => {
        const m = matchProduct(l.raw, PRODUCTS, state.aliases);
        return { on: !!m.product || l.price != null, raw: l.raw, name: m.name, qty: String(roundQty(l.qty, l.unit)), unit: l.unit, price: l.price != null ? String(l.price) : '' };
      });
      if (!parsed.length) throw new Error('Görselde ürün satırı bulunamadı. Fişin tamamı net görünecek şekilde tekrar dene.');
      setRows(parsed);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Görsel okunamadı.');
    } finally {
      setBusy(false);
    }
  }

  function confirm() {
    if (!rows) return;
    const chosen = rows.filter(r => r.on);
    const res = addItems(state.items, chosen); // yalnızca mesajdaki sayılar için
    update(s => {
      // Kullanıcının onayladığı adlar hatırlanır: aynı fiş satırı bir dahaki sefere doğru gelir.
      const aliases = { ...s.aliases };
      for (const r of chosen) if (r.name.trim()) aliases[aliasKey(r.raw)] = r.name.trim();
      const keys = Object.keys(aliases);
      for (const k of keys.slice(0, Math.max(0, keys.length - MAX_ALIASES))) delete aliases[k];
      return { ...s, items: addItems(s.items, chosen).items, invRev: s.invRev + 1, aliases };
    });
    setRows(null);
    toast(`${res.added} yeni malzeme eklendi` + (res.increased ? `, ${res.increased} malzemenin miktarı arttı.` : '.'));
    go('dolap');
  }

  if (rows) {
    const set = (i: number, patch: Partial<Row>) => setRows(rs => rs && rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    const count = rows.filter(r => r.on).length;
    return (
      <Card>
        <T kind="h2">Okunanları kontrol et</T>
        <T kind="small">Telefonun okuduğu satırlar. Yanlış adı düzelt, ürün olmayan satırı kapat. Düzelttiğin adları hatırlarım.</T>
        {rows.map((r, i) => (
          <View key={i} style={{ gap: 8, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: c.line, opacity: r.on ? 1 : 0.5 }}>
            <T kind="small">Fişte: {r.raw}</T>
            <Row>
              <Switch value={r.on} onValueChange={v => set(i, { on: v })} accessibilityLabel={r.name + ' eklensin'} trackColor={{ true: c.accent }} />
              <Field value={r.name} onChangeText={v => set(i, { name: v })} accessibilityLabel="Ad" />
            </Row>
            {r.on ? (
              <>
                <Row>
                  <Field value={r.qty} onChangeText={v => set(i, { qty: v })} keyboardType="decimal-pad" width={90} accessibilityLabel="Miktar" />
                  <Field value={r.price} onChangeText={v => set(i, { price: v })} keyboardType="decimal-pad" width={100} placeholder="Fiyat ₺" accessibilityLabel="Fiyat (TL)" />
                </Row>
                <UnitPicker value={r.unit} onChange={u => set(i, { unit: u })} />
              </>
            ) : null}
          </View>
        ))}
        <Row>
          <Btn kind="primary" title={`Dolaba ekle (${count})`} disabled={!count} onPress={confirm} />
          <Btn title="Vazgeç" onPress={() => setRows(null)} />
        </Row>
      </Card>
    );
  }

  return (
    <Card>
      <T kind="h2">Fişi telefonla oku</T>
      <T kind="small">Fişin fotoğrafını çek ya da "Siparişlerim" ekran görüntüsünü seç. Yazıyı telefonun kendisi okur; internet ya da yapay zekâ gerekmez.</T>
      <Row>
        <Btn title="Galeriden seç" onPress={() => read(false)} disabled={busy} busy={busy} style={{ flex: 1 }} />
        <Btn title="Fotoğraf çek" onPress={() => read(true)} disabled={busy} style={{ flex: 1 }} />
      </Row>
      {err ? <Notice tone="err" text={err} /> : null}
    </Card>
  );
}
