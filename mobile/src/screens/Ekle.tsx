import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, Switch, View } from 'react-native';
import { apiConfigured, parseImages, parseText, type ParsedItem } from '../api';
import { addItems, norm, roundQty } from '../logic';
import { useStore } from '../store';
import { Btn, Card, Field, Notice, Row, T, useColors } from '../ui';
import { UnitPicker } from './Dolap';

const MAX_IMAGES = 6;
const MAX_EDGE = 1568; // Claude görselleri zaten bu boyuta küçültür; daha büyüğü yalnızca yüklemeyi yavaşlatır

type Picked = { uri: string; width: number; height: number };
type ReviewRow = { on: boolean; name: string; qty: string; unit: string; category: string };

async function toJpegBase64(img: Picked) {
  const ctx = ImageManipulator.manipulate(img.uri);
  const long = Math.max(img.width, img.height);
  if (long > MAX_EDGE) {
    if (img.width >= img.height) ctx.resize({ width: MAX_EDGE });
    else ctx.resize({ height: MAX_EDGE });
  }
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!out.base64) throw new Error('Görsel hazırlanamadı.');
  return { mediaType: 'image/jpeg' as const, data: out.base64 };
}

export function EkleScreen({ go }: { go: (tab: 'dolap') => void }) {
  const { state, update, toast } = useStore();
  const c = useColors();
  const [text, setText] = useState('');
  const [images, setImages] = useState<Picked[]>([]);
  const [busy, setBusy] = useState<'text' | 'img' | null>(null);
  const [err, setErr] = useState<{ key: 'text' | 'img'; msg: string } | null>(null);
  const [review, setReview] = useState<{ source: 'text' | 'img'; rows: ReviewRow[] } | null>(null);

  const toReview = (items: ParsedItem[], source: 'text' | 'img') => {
    const rows = items.filter(x => x && x.name).map(x => {
      const n = norm(x.qty, x.unit);
      return { on: x.food !== false, name: x.name, qty: String(roundQty(n.qty || 1, n.unit)), unit: n.unit, category: x.category };
    });
    if (!rows.length) throw new Error('Listede malzeme bulunamadı. Metni ya da görseli kontrol et.');
    setReview({ source, rows });
  };

  async function run(key: 'text' | 'img', fn: () => Promise<void>) {
    setBusy(key); setErr(null);
    try { await fn(); } catch (e) { setErr({ key, msg: e instanceof Error ? e.message : 'Bir şeyler ters gitti.' }); }
    finally { setBusy(null); }
  }

  async function pick(fromCamera: boolean) {
    const room = MAX_IMAGES - images.length;
    if (room <= 0) { toast(`En fazla ${MAX_IMAGES} görsel ekleyebilirsin.`); return; }
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { toast('Kamera izni verilmedi. Ayarlar > Dolap Defteri bölümünden açabilirsin.'); return; }
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: true, selectionLimit: room, orderedSelection: true });
    if (res.canceled) return;
    setImages(prev => [...prev, ...res.assets.map(a => ({ uri: a.uri, width: a.width, height: a.height }))].slice(0, MAX_IMAGES));
  }

  function confirm() {
    if (!review) return;
    const rows = review.rows.filter(r => r.on);
    const res = addItems(state.items, rows); // yalnızca mesajdaki sayılar için
    update(s => ({ ...s, items: addItems(s.items, rows).items, invRev: s.invRev + 1 }));
    if (review.source === 'text') setText(''); else setImages([]);
    setReview(null);
    toast(`${res.added} yeni malzeme eklendi` + (res.increased ? `, ${res.increased} malzemenin miktarı arttı.` : '.'));
    go('dolap');
  }

  if (review) {
    const count = review.rows.filter(r => r.on).length;
    const set = (i: number, patch: Partial<ReviewRow>) =>
      setReview(rv => rv && { ...rv, rows: rv.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
    return (
      <Card>
        <T kind="h2">Kontrol et</T>
        <T kind="small">Okuduklarımı düzeltebilir, istemediğin satırı kapatabilirsin. Aynı isimli malzemeler dolaptakinin üstüne eklenir.</T>
        {review.rows.map((r, i) => (
          <View key={i} style={{ gap: 8, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: c.line, opacity: r.on ? 1 : 0.5 }}>
            <Row>
              <Switch value={r.on} onValueChange={v => set(i, { on: v })} accessibilityLabel={r.name + ' eklensin'} trackColor={{ true: c.accent }} />
              <Field value={r.name} onChangeText={v => set(i, { name: v })} accessibilityLabel="Ad" />
              <Field value={r.qty} onChangeText={v => set(i, { qty: v })} keyboardType="decimal-pad" width={84} accessibilityLabel="Miktar" />
            </Row>
            {r.on ? <UnitPicker value={r.unit} onChange={u => set(i, { unit: u })} /> : null}
          </View>
        ))}
        <Row>
          <Btn kind="primary" title={`Dolaba ekle (${count})`} disabled={!count} onPress={confirm} />
          <Btn title="Vazgeç" onPress={() => setReview(null)} />
        </Row>
      </Card>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      {!apiConfigured() ? <Notice text="Sunucu adresi ayarlanmamış; fiş okuma ve öneriler çalışmaz. Kurulum için README'ye bak." /> : null}
      <Card>
        <T kind="h2">Fiş veya sipariş ekran görüntüsü</T>
        <T kind="small">Market fişinin fotoğrafını çek ya da online alışveriş sitesindeki "Siparişlerim" sayfasının ekran görüntüsünü seç. Uzun siparişlerde birkaç ekran görüntüsünü birlikte seçebilirsin.</T>
        <Row>
          <Btn title="Galeriden seç" onPress={() => pick(false)} style={{ flex: 1 }} />
          <Btn title="Fotoğraf çek" onPress={() => pick(true)} style={{ flex: 1 }} />
        </Row>
        {images.length ? (
          <Row>
            {images.map((img, i) => (
              <Pressable key={img.uri + i} onPress={() => setImages(prev => prev.filter((_, j) => j !== i))}
                accessibilityRole="button" accessibilityLabel={`Görsel ${i + 1}, kaldırmak için dokun`}>
                <Image source={{ uri: img.uri }} style={{ width: 72, height: 72, borderRadius: 8, borderWidth: 1, borderColor: c.line }} />
                <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: c.ink, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
                  <T kind="small" color={c.bg}>×</T>
                </View>
              </Pressable>
            ))}
          </Row>
        ) : null}
        {err?.key === 'img' ? <Notice tone="err" text={err.msg} /> : null}
        <Btn kind="primary" title={busy === 'img' ? 'Okuyorum…' : `Oku${images.length ? ` (${images.length} görsel)` : ''}`}
          busy={busy === 'img'} disabled={!images.length || !!busy || !apiConfigured()}
          onPress={() => run('img', async () => {
            const payload = [];
            for (const img of images) payload.push(await toJpegBase64(img));
            toReview((await parseImages(payload)).items, 'img');
          })} />
      </Card>

      <Card>
        <T kind="h2">Yazarak ekle</T>
        <T kind="small">Dolabında ne varsa aklına geldiği gibi yaz; kg, gr, adet, litre kullanabilirsin.</T>
        <Field multiline value={text} onChangeText={setText} style={{ flex: 0, minHeight: 96, paddingTop: 10, textAlignVertical: 'top' }}
          placeholder="makarna 500 gr, domates 1 kg, sarımsak 1 kg, 10 yumurta, yarım litre süt" />
        {err?.key === 'text' ? <Notice tone="err" text={err.msg} /> : null}
        <Btn kind="primary" title={busy === 'text' ? 'Okuyorum…' : 'Listeyi çıkar'} busy={busy === 'text'}
          disabled={!text.trim() || !!busy || !apiConfigured()}
          onPress={() => run('text', async () => toReview((await parseText(text.trim())).items, 'text'))} />
      </Card>
    </View>
  );
}
