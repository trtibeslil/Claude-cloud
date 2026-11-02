// Yemek fotoğrafı (Vikipedi/Commons) ve altında fotoğrafçı/lisans bilgisi. Fotoğraf yoksa sade bir kapak.
import { useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from 'react-native';
import { hidePhoto, usePhoto } from './photos';
import { useStore } from './store';
import { Icon, useColors } from './ui';

export function DishPhoto({ title, height = 220, radius = 22, credit = true, placeholder = true }: {
  title: string; height?: number; radius?: number; credit?: boolean; placeholder?: boolean;
}) {
  const c = useColors();
  const { state, toast } = useStore();
  const photo = usePhoto(title, state.settings.photos !== false);
  const [failed, setFailed] = useState(false);

  if (!photo || failed) {
    if (!placeholder) return null;
    return (
      <View style={{ height: Math.min(height, 120), borderRadius: radius, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {photo === undefined && !failed ? <ActivityIndicator color={c.accent} /> : <Icon name="restaurant" size={38} color={c.accent} />}
      </View>
    );
  }
  return (
    <View style={{ gap: 4 }}>
      <View style={{ height, borderRadius: radius, overflow: 'hidden', backgroundColor: c.field }}>
        <Image source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover"
          accessibilityLabel={`${title} fotoğrafı`} onError={() => setFailed(true)} />
      </View>
      {credit ? (
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(photo.page).catch(() => {})}
          onLongPress={() => { hidePhoto(title); toast('Bu fotoğraf bir daha gösterilmeyecek.'); }}>
          <Text style={{ fontSize: 11, color: c.muted }} numberOfLines={1}>
            Foto: {photo.artist} · {photo.license} · Wikimedia Commons
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
