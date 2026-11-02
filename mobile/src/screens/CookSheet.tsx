// "Bunu yapıyorum": yemeğin fotoğrafı, kişi sayısına göre malzemeler, hazırlık, adım adım yapılışı ve sonunda dolaptan düşme.
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import * as api from '../api';
import { DishPhoto } from '../DishPhoto';
import { applyCook, cookRows, fmtQty, nearlyZero, norm, toNumber, type CookRow } from '../logic';
import { findRecipe } from '../favorites';
import { catOf, RECIPES } from '../recipes';
import { ingredientRows, prepSteps, type IngredientStatus } from '../recipeView';
import { useStore } from '../store';
import { Btn, Card, Chip, Field, Icon, IconBtn, Row, Stepper, T, useColors, type IconName } from '../ui';
import { levelName, type CookRequest } from './Menu';

const STATUS: Record<IngredientStatus, { icon: IconName; text: string }> = {
  have: { icon: 'checkmark-circle', text: 'dolapta' },
  short: { icon: 'alert-circle', text: 'dolapta az' },
  staple: { icon: 'home', text: 'evde var sayılır' },
  optional: { icon: 'ellipse-outline', text: 'isteğe bağlı' },
  missing: { icon: 'close-circle', text: 'eksik' },
};

export function CookSheet({ req, onClose }: { req: CookRequest | null; onClose: () => void }) {
  const { state, update, toast } = useStore();
  const c = useColors();
  const [people, setPeople] = useState(req?.people ?? 4);
  const [rows, setRows] = useState<CookRow[]>([]);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [aiSteps, setAiSteps] = useState<{ steps: string[]; tip: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!req) return;
    setPeople(req.people);
    setRows(cookRows(state.items, req.uses, req.people, req.servings));
    setDone({}); setAiSteps(null); setErr(null);
    // yalnızca yeni bir istek açıldığında hesapla
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  const recipe = req ? findRecipe(RECIPES, req.title) : undefined;
  const ingredients = useMemo(() => (recipe ? ingredientRows(recipe, state.items, people, catOf) : null), [recipe, state.items, people]);
  const prep = useMemo(() => (recipe ? prepSteps(recipe, catOf) : []), [recipe]);
  const steps = recipe?.s ?? req?.steps ?? aiSteps?.steps;
  const tip = recipe?.p ?? req?.tip ?? aiSteps?.tip;
  const minutes = recipe?.d ?? req?.minutes;
  const level = recipe?.z ?? req?.level;
  const kcal = recipe?.n[0];
  const doneCount = steps ? steps.filter((_, i) => done[i]).length : 0;

  const changePeople = (n: number) => {
    if (!req) return;
    setPeople(n);
    setRows(prev => cookRows(state.items, req.uses, n, req.servings, prev));
  };

  const loadSteps = async () => {
    if (!req) return;
    setLoading(true); setErr(null);
    try {
      const ingr = req.uses.map(u => { const n = norm(u.qty, u.unit); return `${u.name} ${fmtQty(n.qty, n.unit)}`; })
        .concat((req.extra ?? []).map(x => `${x.name} ${x.amount}`));
      setAiSteps(await api.getSteps({ title: req.title, servings: people, ingredients: ingr }));
    } catch (e) { setErr(e instanceof Error ? e.message : 'Tarif alınamadı.'); }
    finally { setLoading(false); }
  };

  const confirm = () => {
    if (!req) return;
    const { state: next, finished } = applyCook(state, { title: req.title, people, rows, source: req.source });
    update(() => next);
    onClose();
    toast(finished.length ? `Dolap güncellendi. Biten: ${finished.join(', ')}.` : 'Dolap güncellendi. Afiyet olsun!');
  };

  const section = (title: string, right?: string) => (
    <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
      <T kind="h3">{title}</T>
      {right ? <T kind="small">{right}</T> : null}
    </Row>
  );

  return (
    <Modal visible={!!req} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 48, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <T kind="label">Bugün mutfakta</T>
          <IconBtn name="close" label="Kapat" onPress={onClose} />
        </Row>
        {req ? <DishPhoto title={req.title} height={240} /> : null}
        <T kind="h1">{req?.title}</T>
        <Row style={{ gap: 6 }}>
          {level ? <Chip tone={level === 3 ? 'warn' : 'soft'} text={levelName(level)!} /> : null}
          {minutes ? <Chip text={`${minutes} dk`} /> : null}
          {kcal ? <Chip text={`Kişi başı ${kcal} kcal`} /> : null}
          {steps ? <Chip text={`${steps.length} adım`} /> : null}
        </Row>

        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T style={{ fontWeight: '700' }}>Kaç kişilik yapıyorsun?</T>
            <Stepper label="Kişi sayısı" value={people} min={1} max={30} onChange={changePeople} />
          </Row>
          <T kind="small">Malzeme miktarları ve dolaptan düşülecekler kişi sayısına göre değişir.</T>
        </Card>

        {section('Malzemeler', `${people} kişilik`)}
        <Card style={{ gap: 0, paddingVertical: 6 }}>
          {ingredients ? ingredients.map((x, i) => {
            const st = STATUS[x.status];
            const tone = x.status === 'missing' ? c.danger : x.status === 'short' ? c.warn : x.status === 'have' ? c.fresh : c.muted;
            return (
              <Row key={x.name} style={{ flexWrap: 'nowrap', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: c.line }}>
                <Icon name={st.icon} size={20} color={tone} />
                <View style={{ flex: 1 }}>
                  <T style={{ fontWeight: '600' }}>{x.name}</T>
                  <T kind="small" color={x.status === 'missing' ? c.danger : undefined}>
                    {st.text}{x.stockName ? ` (${x.stockName})` : ''}
                  </T>
                </View>
                <T style={{ fontWeight: '700' }}>{x.amount}</T>
              </Row>
            );
          }) : (
            <>
              {req?.uses.map((u, i) => {
                const n = norm(u.qty * people / (req.servings || people), u.unit);
                return (
                  <Row key={u.name} style={{ flexWrap: 'nowrap', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: c.line }}>
                    <Icon name="checkmark-circle" size={20} color={c.fresh} />
                    <T style={{ flex: 1, fontWeight: '600' }}>{u.name}</T>
                    <T style={{ fontWeight: '700' }}>{fmtQty(n.qty, n.unit)}</T>
                  </Row>
                );
              })}
              {req?.extra?.map(x => (
                <Row key={'x' + x.name} style={{ flexWrap: 'nowrap', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderColor: c.line }}>
                  <Icon name="close-circle" size={20} color={c.danger} />
                  <T style={{ flex: 1, fontWeight: '600' }}>{x.name}</T>
                  <T style={{ fontWeight: '700' }}>{x.amount}</T>
                </Row>
              ))}
            </>
          )}
        </Card>

        {prep.length ? (
          <>
            {section('Hazırlık')}
            <Card>
              {prep.map((p, i) => (
                <Row key={i} style={{ flexWrap: 'nowrap', gap: 10, alignItems: 'flex-start' }}>
                  <Icon name="ellipse" size={8} color={c.accent} />
                  <T style={{ flex: 1 }}>{p}</T>
                </Row>
              ))}
            </Card>
          </>
        ) : null}

        {section('Yapılışı', steps ? `${doneCount}/${steps.length} tamam` : undefined)}
        {steps ? steps.map((step, i) => {
          const on = !!done[i];
          return (
            <Pressable key={i} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`Adım ${i + 1}: ${step}`}
              onPress={() => setDone(d => ({ ...d, [i]: !d[i] }))}
              style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 18, backgroundColor: on ? c.freshSoft : c.surface, alignItems: 'flex-start' }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.fresh : c.accent }}>
                {on ? <Icon name="checkmark" size={18} color={c.freshInk} /> : <T style={{ color: c.accentInk, fontWeight: '800' }}>{i + 1}</T>}
              </View>
              <T style={{ flex: 1, textDecorationLine: on ? 'line-through' : 'none', opacity: on ? 0.6 : 1 }}>{step}</T>
            </Pressable>
          );
        }) : loading ? (
          <Row><ActivityIndicator color={c.muted} /><T kind="small">Tarif yazılıyor…</T></Row>
        ) : (
          <Card>
            <T kind="small">{err ?? 'Bu yemeğin adımları uygulamada yok.'}</T>
            {api.apiConfigured() ? <Btn title="Tarifi yazdır" icon="sparkles-outline" onPress={loadSteps} /> : null}
          </Card>
        )}
        {steps?.length ? <T kind="small">Bitirdiğin adıma dokun, işaretlensin.</T> : null}

        {tip ? (
          <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 18, backgroundColor: c.accent2Soft, alignItems: 'flex-start' }}>
            <Icon name="bulb" size={22} color={c.warn} />
            <View style={{ flex: 1, gap: 2 }}>
              <T style={{ fontWeight: '800' }}>Püf noktası</T>
              <T>{tip}</T>
            </View>
          </View>
        ) : null}

        {section('Dolaptan düşülecek')}
        <Card style={{ gap: 0, paddingVertical: 6 }}>
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
        </Card>
        <T kind="small">Miktarları kişi sayısına göre hesapladım. Gerçekte kullandığın farklıysa kutulardan düzelt.</T>
        <Btn kind="primary" icon="checkmark-done" title="Yaptım, dolaptan düş" onPress={confirm} />
      </ScrollView>
    </Modal>
  );
}
