# Dolap Defteri'ni TestFlight'a koymak

Bu rehber, bilgisayarında Xcode olmadan, uygulamayı bulutta derleyip TestFlight'a göndermeyi anlatır. Komutların hepsi bilgisayarındaki terminalde çalışır (Mac ya da Windows fark etmez; Node.js 20+ yüklü olmalı).

## Neye ihtiyacın var?

| Ne | Neden | Ücret |
|---|---|---|
| **Apple Developer Program** üyeliği (developer.apple.com) | TestFlight ve App Store için zorunlu | Yıllık 99 $ |
| **Expo hesabı** (expo.dev) | Uygulamayı bulutta derler ve Apple'a gönderir | Ücretsiz plan yeterli |
| **Cloudflare hesabı** (cloudflare.com) | Fiş okuma ve tarif isteklerini Claude'a ileten küçük sunucu | Ücretsiz plan yeterli |
| **Anthropic API anahtarı** (console.anthropic.com) | Claude çağrıları | Kullanım kadar öde (aşağıda tahmin var) |

> Not: Claude aboneliğin (claude.ai) ile API ayrı faturalanır. API için console.anthropic.com'dan kredi yüklemen gerekir.

## 1. Sunucuyu yayınla (bir kez)

```bash
cd server
npm install
npx wrangler login
```

Claude API anahtarını ve uygulamanın sunucuya kendini tanıtacağı gizli anahtarı kaydet. `APP_KEY` için uzun rastgele bir metin uydur (ör. `openssl rand -hex 24` çıktısı) ve bir kenara not et:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

```bash
npx wrangler secret put APP_KEY
```

```bash
npm run deploy
```

Komut sonunda `https://dolap-defteri-api.<hesabın>.workers.dev` gibi bir adres yazar. Çalıştığını tarayıcıda `.../health` açarak kontrol et; `{"ok":true}` görmelisin.

## 2. Uygulamayı ayarla

`mobile/eas.json` içindeki `EXPO_PUBLIC_API_URL` değerini 1. adımdaki adresle değiştir.

`mobile/app.json` içindeki `bundleIdentifier` (`com.dolapdefteri.app`) App Store'da benzersiz olmalı. Başkası almışsa kendine göre değiştir (ör. `com.alperen.dolapdefteri`).

`APP_KEY`'i dosyaya yazmak yerine Expo'ya gizli değişken olarak ver:

```bash
cd mobile
npm install
npx eas-cli@latest login
npx eas-cli@latest init
```

```bash
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_APP_KEY --value "<APP_KEY ile aynı değer>" --visibility sensitive
```

## 3. Derle ve TestFlight'a gönder

```bash
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

İlk seferde Apple hesabınla giriş yapmanı ister; sertifikaları ve App Store Connect'teki uygulama kaydını EAS kendisi oluşturur. Derleme 15–30 dakika sürer. Bittiğinde App Store Connect'te işlenir (genelde 10–30 dakika), ardından **TestFlight** sekmesinde görünür.

TestFlight uygulamasını iPhone'una kur, App Store Connect > TestFlight > Internal Testing bölümünden kendini test kullanıcısı olarak ekle ve davet e-postasındaki bağlantıdan yükle.

## Sonraki sürümler

Kodda değişiklik yaptıktan sonra yalnızca 3. adımı tekrar çalıştırman yeterli; sürüm numarası otomatik artar.

## Tahmini Claude maliyeti

Claude Opus 5.5 kullanılıyor (girdi 4 $ / milyon token, çıktı 20 $ / milyon token). Kabaca:

- Bir fiş veya sipariş ekran görüntüsü okumak: ~1–3 sent
- 1 günlük, 3 öğünlük, 3 seçenekli menü: ~3–6 sent
- 7 günlük menü: ~15–30 sent
- Tarif adımları: ~1 sent

Günlük normal kullanım ayda birkaç dolar tutar. Console'da harcama limiti koymanı öneririm.

## Güvenlik notu

`APP_KEY` derlenen uygulamanın içinde bulunur. Bu yüzden rastgele kişilerin sunucunu kullanmasını engeller ama kararlı biri uygulamayı söküp anahtarı bulabilir. TestFlight ve kişisel kullanım için yeterli. App Store'a herkese açık çıkmadan önce kullanıcı girişi ve kullanım limiti eklemek gerekir.
