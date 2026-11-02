import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { favKey, favoriteFromRecipe, favoriteUses, isFavorite, toggleFavorite } from '../favorites';
import { lower, MEALS, type Favorite } from '../logic';
import { catOf, RECIPES } from '../recipes';
import { useStore } from '../store';
import { Btn, Card, Chip, Field, IconBtn, Row, T, useColors } from '../ui';
import { levelName, type CookRequest } from './Menu';

const MEAL_KEY: Record<string, string> = { 'Kahvaltı': 'K', 'Öğle': 'O', 'Akşam': 'A' };

/** Favori tarifler; kahvaltı, öğle ve akşam ayrı sekmelerde. */
export function FavoritesCard({ onCook }: { onCook: (r: CookRequest) => void }) {
  const { state, update, toast } = useStore();
  const c = useColors();
  const favs = state.favorites;
  const [meal, setMeal] = useState<string>('Kahvaltı');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const people = state.settings.people;

  const toggle = (fav: Favorite) => {
    const adding = !isFavorite(favs, fav.title);
    update(s => ({ ...s, favorites: toggleFavorite(s.favorites, fav) }));
    toast(adding ? `${fav.title} favorilere eklendi.` : `${fav.title} favorilerden çıkarıldı.`, adding ? undefined : {
      label: 'Geri al', onPress: () => update(s => ({ ...s, favorites: isFavorite(s.favorites, fav.title) ? s.favorites : [fav, ...s.favorites] })),
    });
  };

  const list = favs.filter(f => f.meals.includes(meal));
  const query = lower(q);
  const found = query ? RECIPES.filter(r => r.m.includes(MEAL_KEY[meal]) && lower(r.t).includes(query)).slice(0, 5) : [];

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <T kind="h2">Favoriler</T>
        <T kind="small">{favs.length} tarif</T>
      </Row>
      <Row style={{ gap: 6, flexWrap: 'nowrap' }}>
        {MEALS.map(m => {
          const on = m === meal;
          const n = favs.filter(f => f.meals.includes(m)).length;
          return (
            <Pressable key={m} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { setMeal(m); setOpen(null); setQ(''); }}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999, backgroundColor: on ? c.accent : c.field }}>
              <T style={{ fontWeight: '700', color: on ? c.accentInk : c.ink }}>{m}</T>
              <T kind="small" color={on ? c.accentInk : c.muted}>{n} tarif</T>
            </Pressable>
          );
        })}
      </Row>

      {list.length ? list.map((f, i) => {
        const { uses, missing } = favoriteUses(f, state.items, people, RECIPES, catOf);
        const isOpen = open === favKey(f.title);
        return (
          <View key={favKey(f.title)} style={{ gap: 8, paddingTop: i ? 12 : 0, borderTopWidth: i ? 1 : 0, borderColor: c.line }}>
            <Row style={{ flexWrap: 'nowrap' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <T kind="h3">{f.title}</T>
                <T kind="small">{[f.level ? levelName(f.level) : '', f.minutes ? `${f.minutes} dk` : '', f.nutrition?.kcal ? `${f.nutrition.kcal} kcal / kişi` : ''].filter(Boolean).join(' · ')}</T>
              </View>
              <IconBtn name="heart" label={`${f.title} favorilerden çıkar`} tone="accent" onPress={() => toggle(f)} />
            </Row>
            <Row style={{ gap: 6 }}>
              {missing.length
                ? <Chip tone="warn" text={`Eksik: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ` +${missing.length - 3}` : ''}`} />
                : <Chip tone="done" text="Malzemelerin hepsi dolapta" />}
            </Row>
            {isOpen && f.steps?.length ? (
              <View style={{ gap: 6 }}>
                {f.steps.map((step, j) => <T key={j} kind="small" color={c.ink}>{j + 1}. {step}</T>)}
                {f.tip ? <T kind="small">Püf noktası: {f.tip}</T> : null}
              </View>
            ) : null}
            <Row>
              {f.steps?.length ? <Btn title={isOpen ? 'Tarifi gizle' : 'Tarif'} onPress={() => setOpen(isOpen ? null : favKey(f.title))} /> : null}
              <Btn kind="primary" title="Bunu yapıyorum" disabled={!uses.length}
                onPress={() => onCook({ title: f.title, servings: people, uses, people, source: null })} />
            </Row>
          </View>
        );
      }) : (
        <T kind="small">Henüz favori {lower(meal)} yemeği yok. Menüdeki tariflerde kalbe dokun ya da aşağıdan ara.</T>
      )}

      <Field value={q} onChangeText={setQ} placeholder={`${meal} tariflerinde ara ve favorile`} style={{ flex: 0 }} autoCorrect={false} />
      {found.map(r => {
        const fav = isFavorite(favs, r.t);
        return (
          <Row key={r.t} style={{ flexWrap: 'nowrap' }}>
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '600' }}>{r.t}</T>
              <T kind="small">{levelName(r.z)} · {r.d} dk · {r.n[0]} kcal / kişi</T>
            </View>
            <IconBtn name={fav ? 'heart' : 'heart-outline'} tone={fav ? 'accent' : 'plain'}
              label={fav ? `${r.t} favorilerden çıkar` : `${r.t} favorilere ekle`} onPress={() => toggle(favoriteFromRecipe(r))} />
          </Row>
        );
      })}
      {query && !found.length ? <T kind="small">Bu adla {lower(meal)} tarifi yok.</T> : null}
    </Card>
  );
}
