# Dolap Defteri

Evdeki yiyecekleri takip eden ve onlarla yemek öneren, yapay zekâ destekli uygulama.

## Ne yapar?

- **Dolap:** Evdeki malzemeleri kategorilere göre listeler, elle düzenleme ve silme yapılabilir.
- **Ekle:** Market fişinin fotoğrafını çekebilir, online alışveriş sitesindeki "Siparişlerim" sayfasının ekran görüntüsünü (birden fazla da olabilir) yükleyebilir ya da malzemeleri serbest metinle yazabilirsin ("makarna 500 gr, domates 1 kg…"). Claude bunları okuyup listeye çevirir, sen kontrol edip onaylarsın.
- **Menü:** Kişi sayısı, gün sayısı (1–7), öğünler (kahvaltı, öğle, akşam) ve öğün başına seçenek sayısına (2–5) göre öneri yapar. Dolapta olmayan malzemeler "Eksik" olarak işaretlenir.
- **Bunu yapıyorum:** Kaç kişilik yaptığını sorar, kullanılan miktarları hesaplar (istersen düzeltirsin) ve dolaptan düşer. Biten malzemeler dolaptan çıkar ve sonraki menülerde kullanılmaz.
- **Geçmiş:** Yapılan yemekler listelenir; "Geri al" malzemeleri dolaba geri koyar.

## Klasörler

| Klasör | İçerik |
|---|---|
| `mobile/` | iOS/Android uygulaması (Expo, React Native, TypeScript). Veriler telefonda saklanır. |
| `server/` | Claude çağrılarını yapan küçük sunucu (Cloudflare Worker). Claude API anahtarı yalnızca burada durur. |
| `dolap-defteri/` | claude.ai üzerinde çalışan web sürümü (tek HTML dosyası, Artifact olarak yayınlanır). |

TestFlight'a koymak için adım adım rehber: [TESTFLIGHT.md](TESTFLIGHT.md).

## Geliştirme

```bash
cd mobile && npm install && npx tsc --noEmit
```

```bash
cd server && npm install && npm run typecheck
```

Mobil uygulama `src/logic.ts` içindeki saf fonksiyonlarla dolap hesaplarını yapar (birim çevirme, birleştirme, düşme, geri alma); `src/api.ts` sunucuya istek atar. Sunucu her uç nokta için Claude'dan şemaya uygun JSON (structured outputs) ister.
