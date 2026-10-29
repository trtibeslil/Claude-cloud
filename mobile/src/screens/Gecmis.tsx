import { View } from 'react-native';
import { fmtQty, undoHistory } from '../logic';
import { useStore } from '../store';
import { Btn, Card, T, useColors } from '../ui';

const fmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export function GecmisScreen() {
  const { state, update, toast } = useStore();
  const c = useColors();
  if (!state.history.length) {
    return (
      <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
        <T kind="h2">Henüz yemek kaydı yok</T>
        <T kind="small" style={{ textAlign: 'center' }}>Menüde bir tarifte "Bunu yapıyorum" dediğinde burada görünür. Yanlışlıkla düşülen malzemeleri buradan geri alabilirsin.</T>
      </Card>
    );
  }
  return (
    <View style={{ gap: 12 }}>
      <T kind="h2">Yaptıkların</T>
      <Card style={{ gap: 0 }}>
        {state.history.map((e, i) => (
          <View key={e.id} style={{ gap: 4, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: c.line }}>
            <T kind="h3">{e.title}</T>
            <T kind="small">{fmt.format(e.at)} · {e.people} kişilik</T>
            <T kind="small">{e.used.length ? e.used.map(u => `${u.name} ${fmtQty(u.qty, u.unit)}`).join(', ') : 'Dolaptan bir şey düşülmedi.'}</T>
            <View style={{ alignItems: 'flex-start' }}>
              <Btn kind="ghost" title="Geri al" onPress={() => {
                update(s => undoHistory(s, e.id));
                toast(`"${e.title}" geri alındı, malzemeler dolaba döndü.`);
              }} />
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}
