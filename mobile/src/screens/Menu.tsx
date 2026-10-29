import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as api from '../api';
import { dayLabel, findItem, fmtQty, MEALS, norm, type Option, type Slot, type Use } from '../logic';
import { useStore } from '../store';
import { Btn, Card, Chip, Field, Notice, Row, Stepper, T, Toggle, useColors } from '../ui';

export type CookRequest = { title: string; servings: number; uses: Use[]; people: number; source: { d: number; m: number; o: number } | null };

export function MenuScreen({ onCook }: { onCook: (r: CookRequest) => void }) {
  const { state, update } = useStore();
  const st = state.settings;
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<{ key: string; msg: string } | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [adhocText, setAdhocText] = useState('');

  const setSettings = (patch: Partial<typeof st>) => update(s => ({ ...s, settings: { ...s.settings, ...patch } }));

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key); setErr(null);
    try { await fn(); } catch (e) { setErr({ key, msg: e instanceof Error ? e.message : 'Bir şeyler ters gitti.' }); }
    finally { setBusy(null); }
  }

  const makePlan = () => run('plan', async () => {
    if (!state.items.length) throw new Error('Önce dolaba birkaç malzeme ekle.');
    if (!st.meals.length) throw new Error('En az bir öğün seç.');
    const out = await api.makePlan({
      items: state.items, people: st.people, days: st.days, meals: st.meals, options: st.options,
      recent: state.history.slice(0, 10).map(h => h.title),
    });
    const days = out.days.slice(0, st.days).map((d, i) => ({
      label: dayLabel(i),
      meals: d.meals.filter(m => m.options.length).map((m): Slot => ({ meal: m.meal, done: null, options: m.options.slice(0, 5) })),
    })).filter(d => d.meals.length);
    if (!days.length) throw new Error('Menü oluşturulamadı. Tekrar dene.');
    update(s => ({ ...s, plan: { createdAt: Date.now(), invRev: s.invRev, people: st.people, days } }));
    setOpen({});
  });

  const loadSteps = (d: number, m: number, o: number) => {
    const key = `${d}-${m}-${o}`;
    const opt = state.plan!.days[d].meals[m].options[o];
    const nowOpen = !open[key];
    setOpen(x => ({ ...x, [key]: nowOpen }));
    if (!nowOpen || opt.steps) return;
    run('steps:' + key, async () => {
      const ingredients = opt.uses.map(u => { const n = norm(u.qty, u.unit); return `${u.name} ${fmtQty(n.qty, n.unit)}`; })
        .concat(opt.extra.map(x => `${x.name} ${x.amount}`));
      const out = await api.getSteps({ title: opt.title, servings: opt.servings, ingredients });
      update(s => {
        if (!s.plan) return s;
        const plan = structuredClone(s.plan);
        const target = plan.days[d]?.meals[m]?.options[o];
        if (target) { target.steps = out.steps; target.tip = out.tip; }
        return { ...s, plan };
      });
    });
  };

  const adhoc = () => run('adhoc', async () => {
    const out = await api.adhoc({ text: adhocText.trim(), defaultPeople: st.people, items: state.items });
    setAdhocText('');
    onCook({ title: out.title || adhocText.trim(), servings: out.servings || st.people, uses: out.uses, people: out.servings || st.people, source: null });
  });

  const p = state.plan;
  return (
    <View style={{ gap: 16 }}>
      <Card>
        <T kind="h2">Menü ayarları</T>
        <Row style={{ justifyContent: 'space-between' }}><T>Kişi sayısı</T><Stepper label="Kişi sayısı" value={st.people} min={1} max={20} onChange={n => setSettings({ people: n })} /></Row>
        <Row style={{ justifyContent: 'space-between' }}><T>Kaç günlük</T><Stepper label="Gün sayısı" value={st.days} min={1} max={7} onChange={n => setSettings({ days: n })} /></Row>
        <Row style={{ justifyContent: 'space-between' }}><T>Öğün başına seçenek</T><Stepper label="Seçenek sayısı" value={st.options} min={2} max={5} onChange={n => setSettings({ options: n })} /></Row>
        <T>Öğünler</T>
        <Row>
          {MEALS.map(m => (
            <Toggle key={m} label={m} on={st.meals.includes(m)}
              onPress={() => setSettings({ meals: MEALS.filter(x => (x === m ? !st.meals.includes(m) : st.meals.includes(x))) })} />
          ))}
        </Row>
        <T kind="small">{st.days} gün × {st.meals.length} öğün × {st.options} seçenek, {st.people} kişilik</T>
        {err?.key === 'plan' ? <Notice tone="err" text={err.msg} /> : null}
        <Btn kind="primary" title={busy === 'plan' ? 'Menü hazırlanıyor…' : p ? 'Yeni menü öner' : 'Menü öner'}
          busy={busy === 'plan'} disabled={!!busy || !api.apiConfigured()} onPress={makePlan} />
      </Card>

      {p && p.invRev !== state.invRev ? <Notice tone="info" text="Dolap bu menüden sonra değişti. Güncel malzemelere göre yeni menü önerebilirsin." /> : null}

      {p?.days.map((day, d) => (
        <View key={d} style={{ gap: 10 }}>
          <T kind="h2">{day.label}</T>
          {day.meals.map((slot, m) => (
            <View key={m} style={{ gap: 8 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T kind="label">{slot.meal}</T>
                {slot.done ? <Chip tone="done" text={`Yapıldı · ${slot.done.people} kişi`} /> : null}
              </Row>
              {slot.options.map((o, oi) => (
                <OptionCard key={oi} o={o} slot={slot} oi={oi} open={!!open[`${d}-${m}-${oi}`]}
                  loading={busy === `steps:${d}-${m}-${oi}`} error={err?.key === `steps:${d}-${m}-${oi}` ? err.msg : null}
                  disabled={!!busy && busy !== `steps:${d}-${m}-${oi}`}
                  onSteps={() => loadSteps(d, m, oi)}
                  onCook={() => onCook({ title: o.title, servings: o.servings, uses: o.uses, people: p.people || st.people, source: { d, m, o: oi } })} />
              ))}
            </View>
          ))}
        </View>
      ))}

      <Card>
        <T kind="h3">Menü dışında bir şey mi yaptın?</T>
        <T kind="small">Ne yaptığını yaz, dolaptan düşülecekleri hesaplayayım.</T>
        <Field value={adhocText} onChangeText={setAdhocText} placeholder="Ör. 2 kişilik menemen yaptım" style={{ flex: 0 }} />
        {err?.key === 'adhoc' ? <Notice tone="err" text={err.msg} /> : null}
        <Btn kind="primary" title={busy === 'adhoc' ? 'Hesaplıyorum…' : 'Hesapla'} busy={busy === 'adhoc'}
          disabled={!adhocText.trim() || !!busy || !state.items.length || !api.apiConfigured()} onPress={adhoc} />
      </Card>
    </View>
  );
}

function OptionCard({ o, slot, oi, open, loading, error, disabled, onSteps, onCook }: {
  o: Option; slot: Slot; oi: number; open: boolean; loading: boolean; error: string | null; disabled: boolean;
  onSteps: () => void; onCook: () => void;
}) {
  const { state } = useStore();
  const c = useColors();
  const cooked = slot.done?.option === oi;
  const gone = o.uses.filter(u => !findItem(state.items, u));
  return (
    <Card style={{ opacity: slot.done && !cooked ? 0.55 : 1, borderColor: cooked ? c.accent : c.line, borderWidth: cooked ? 2 : 1 }}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <T kind="h3" style={{ flex: 1 }}>{o.title}</T>
        {o.minutes ? <T kind="small">{o.minutes} dk</T> : null}
      </Row>
      {o.summary ? <T kind="small" color={c.ink}>{o.summary}</T> : null}
      <T kind="small">
        Dolaptan: {o.uses.length ? o.uses.map((u, i) => {
          const n = norm(u.qty, u.unit || findItem(state.items, u)?.unit);
          return (i ? ', ' : '') + `${u.name} ${fmtQty(n.qty, n.unit)}`;
        }).join('') : '—'}
      </T>
      {o.extra.length || gone.length ? (
        <Row style={{ gap: 6 }}>
          {o.extra.map(x => <Chip key={'e' + x.name} tone="warn" text={'Eksik: ' + x.name} />)}
          {gone.map(u => <Chip key={'g' + u.name} tone="warn" text={'Bitti: ' + u.name} />)}
        </Row>
      ) : null}
      {open ? (
        loading ? <Row><ActivityIndicator color={c.muted} /><T kind="small">Tarif yazılıyor…</T></Row>
          : o.steps ? (
            <View style={{ gap: 6 }}>
              {o.steps.map((step, i) => <T key={i} kind="small" color={c.ink}>{i + 1}. {step}</T>)}
              {o.tip ? <T kind="small">İpucu: {o.tip}</T> : null}
            </View>
          ) : error ? <Notice tone="err" text={error} /> : null
      ) : null}
      <Row>
        <Btn title={open ? 'Tarifi gizle' : 'Tarif'} onPress={onSteps} disabled={disabled || !api.apiConfigured()} />
        {cooked ? null : <Btn kind="primary" title="Bunu yapıyorum" onPress={onCook} />}
      </Row>
    </Card>
  );
}
