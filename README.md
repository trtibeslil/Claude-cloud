# Dolap Defteri

Evdeki yiyecekleri takip eden ve onlarla yemek öneren, yapay zekâ destekli uygulama.

## Ne yapar?

- **Dolap:** Evdeki malzemeleri kategorilere göre listeler, elle düzenleme ve silme yapılabilir.
- **Listeden seç:** 22 kategoride 400'den fazla ürün (meyve, sebze, beyaz et, kırmızı et, şarküteri, süt ürünleri…). Ürünü bul, miktarını ve isteğe bağlı fiyatını gir, sepete ekle; sepeti tek seferde dolaba ekle. Yapay zekâ gerekmez.
- **Ekle:** Market fişinin fotoğrafını çekebilir, online alışveriş sitesindeki "Siparişlerim" sayfasının ekran görüntüsünü (birden fazla da olabilir) yükleyebilir ya da malzemeleri serbest metinle yazabilirsin ("makarna 500 gr, domates 1 kg…"). Claude bunları okuyup listeye çevirir, sen kontrol edip onaylarsın.
- **Menü:** Kişi sayısı, gün sayısı (1–7), öğünler (kahvaltı, öğle, akşam) ve öğün başına seçenek sayısına (2–5) göre öneri yapar. Dolapta olmayan malzemeler "Eksik" olarak işaretlenir.
- **Bunu yapıyorum:** Kaç kişilik yaptığını sorar, kullanılan miktarları hesaplar (istersen düzeltirsin) ve dolaptan düşer. Biten malzemeler dolaptan çıkar ve sonraki menülerde kullanılmaz.
- **Geçmiş:** Yapılan yemekler listelenir; "Geri al" malzemeleri dolaba geri koyar.

## Klasörler

| Klasör | İçerik |
|---|---|
| `mobile/` | iOS/Android uygulaması (Expo, React Native, TypeScript). Veriler telefonda saklanır. |
| `server/` | Claude çağrılarını yapan küçük sunucu (Cloudflare Worker). Claude API anahtarı yalnızca burada durur. |
| `catalog/` | Ürün kataloğu. `build.py` listeyi üretir (mobil ve sunucu kopyalarını da yazar), `inject.py` web sürümüne gömer. |
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

## Tarifler ve besin değerleri

Mobil uygulama, sunucu ayarlı değilken menüyü uygulamaya gömülü 181 tariften (97 basit, 59 orta, 25 kompleks) önerir (`catalog/tarifler.py`). Kişi başı besin değerleri tahmin değil, malzeme gramajlarından hesaplanır:

- Kaynak: U.S. Department of Agriculture, Agricultural Research Service. *USDA National Nutrient Database for Standard Reference, Release 28* (2015), kamu malı. Dosya npm'deki `fda-nutrient-database@1.0.2` paketinden alınır.
- `catalog/besin.py` her malzemeyi SR28 kaydına bağlar ve `catalog/besin.json` tablosunu üretir (100 g başına kcal, protein, karbonhidrat, yağ). Adet/demet/paket için gram karşılığı, ml için yoğunluk, kılçıklı ve kemikli ürünlerde yenilebilir pay kullanılır. Derin yağda kızartmada yağın %15'i sayılır.
- SR28'de birebir karşılığı olmayan 16 Türk ürünü (kaşar, beyaz peynir, sucuk, tarhana, mantı, simit…) en yakın gıdadan ya da bileşenlerinden yaklaşık hesaplanır ve `approx` olarak işaretlidir.

```bash
python3 catalog/besin.py <ABBREV.txt yolu>
```

```bash
python3 catalog/tarifler.py
```

### Tarif önerme kuralı

Önem sırası: **1) protein, 2) karbonhidrat, 3) sebze.** Sarımsak, soğan, otlar, baharat, salça ve yağ yardımcıdır; tek başına bir tarifi önerdirmez. `catalog/tarifler.py` her malzemeye bir rol verir, `mobile/src/planner.ts` uygular:

- Tarifin ana proteini dolapta yoksa tarif önerilmez (kuzu kol yoksa kuzu tandır yok). Ette yumurta ve peynir yardımcıdır; yumurta yemeklerinde yumurta şarttır.
- Proteinli tarifte karbonhidratı ve sebzesinin ikisi birden eksikse önerilmez.
- Proteinsiz tarifte asıl malzeme şarttır (pirinç yoksa pilav, yufka yoksa börek yok); kütlece en büyük malzeme de şarttır (cacıkta yoğurt).
- Yemeğin adını veren malzeme şarttır (kıymalı patateste patates); hamur ve tahıl yemeklerinde karbonhidrat şarttır.
- Eşdeğer ürünler birbirinin yerine geçer: makarna türleri, pirinç türleri, bulgur türleri, kıyma türleri gibi.

Telefonda yapay zekâsız fiş okuma hazır ama kapalı: [mobile/src/ocr/README.md](mobile/src/ocr/README.md).
