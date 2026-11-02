# Telefonda fiş okuma (şu an kapalı)

Fişin ya da "Siparişlerim" ekran görüntüsünün yazısını telefonun kendisi okur: iPhone'da Apple Vision, Android'de Google ML Kit (`expo-text-extractor` paketi). İnternet, sunucu ya da yapay zekâ gerekmez; kullanıcıya ücreti yoktur.

## Nasıl çalışır

1. **`engine.ts`**: Görseldeki yazıyı satır satır alır.
2. **`receipt.ts`**: Satırları kurallarla ürün satırına çevirir. Tanıdığı kalıplar:
   - Tartılı ürün: `1,245 KG X 39,90`
   - Çoklu adet: `2 X 17,45`
   - Ad ve fiyat aynı satırda: `DOMATES SALKIM %1 *49,68`
   - Ad ile fiyatın ayrı satırlarda geldiği fişler
   - Parça sayısı: `YUMURTA 15'Lİ`
   - Paket boyutu: `500 G`, `1 L`
   - Sipariş ekranı: `2 adet`, `₺139,80`

   İndirimi önceki üründen düşer. Toplam, KDV, ödeme, poşet, teslimat, mağaza adı, tarih gibi satırları atlar.
3. **`match.ts`**: Okunan adı ürün kataloğuyla eşleştirir (`DOMATES SALKIM` → Salkım domates). Fiş kısaltmalarını ve Türkçe karakter hatalarını tolere eder.
4. **Öğrenme:** Kullanıcı kontrol ekranında bir adı düzeltip eklediğinde (`state.aliases`) bu eşleşme hatırlanır. Aynı fiş satırı bir dahaki sefere doğrudan doğru adla gelir.
5. **`screens/OcrCard.tsx`**: Görsel seçme ve okunanları kontrol ekranı. Kullanıcı onaylamadan hiçbir şey dolaba eklenmez.

## Açmak için

1. `src/ocr/engine.ts` içinde `OCR_ENABLED = true` yap.
2. `package.json` içindeki `expo.autolinking.exclude` listesinden `"expo-text-extractor"`ı çıkar. Liste boş kalırsa `autolinking` bölümünü tamamen silebilirsin.
3. Yeni bir derleme al. Bu yerel (native) bir modül olduğu için Expo Go'da çalışmaz:

```bash
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

Kapalıyken modül uygulamaya bağlanmaz ve "Fişi telefonla oku" kartı görünmez. Uygulamanın geri kalanı bundan etkilenmez.

## Testler

```bash
npm test
```

Testler BİM tarzı bir fişi, ad ile fiyatın ayrı satırlarda okunduğu bir fişi, bir online sipariş ekranını ve öğrenilen düzeltmeleri kapsar. Gerçek fişlerle karşılaşılan yeni kalıplar `receipt.test.ts` dosyasına örnek olarak eklenmeli.

## Bilinen sınırlar

- `expo-text-extractor` tanıma dilini ayarlamıyor; ş, ğ, ı harfleri zaman zaman yanlış okunabilir. Eşleştirme bu yüzden Türkçe harfleri sadeleştirerek karşılaştırır.
- Paket satırların ekrandaki konumunu vermiyor. Ad ve fiyat ayrı satırlarda geldiğinde fiyatlar sırayla adlara verilir; düzensiz fişlerde kontrol ekranında düzeltme gerekebilir.
- Paket Expo SDK 54 ile yayınlanmış; projede SDK 58 var. Açtıktan sonraki ilk derlemede iOS ve Android derlemesinin başarılı olduğu kontrol edilmeli.
- Daha iyi sonuç için ileride Türkçe dil ayarı (`tr-TR`) ve satır konumlarını veren küçük bir yerel modül yazılabilir; `engine.ts` dışında bir şey değişmez.
