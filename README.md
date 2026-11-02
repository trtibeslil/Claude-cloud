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

Önem sırası: **1) protein, 2) karbonhidrat, 3) sebze.** `catalog/tarifler.py` her malzemeye bir rol verir (olmazsa olmaz, destek, yardımcı), `mobile/src/planner.ts` önerileri buna göre sıralar:

- **Önce tam uygun tarifler:** ana proteini, adını veren malzemesi ve karbonhidrat ya da sebzesinden en az biri dolapta olanlar. Proteinsiz tarifte asıl malzeme (pilavda pirinç, börekte yufka) şarttır.
- **Sonda esnek öneriler:** en fazla bir ana malzemesi eksik tarifler, "Ana malzeme eksik: …" uyarısıyla. Tam uygunlar yetmezse boşlukları doldurur; 4+ seçenekte sona en fazla bir tane eklenir.
- Dolapta tarifin en az bir asıl malzemesi bulunmalı; yalnızca sarımsak, soğan ya da evde var sayılanlarla öneri yapılmaz.
- **Evde var sayılanlar:** zeytinyağı, ayçiçek yağı, mısırözü yağı, tuz, karabiber, kimyon, toz ve pul biber, un ve her türlü makarna. Dolapta kayıtlı olmasa da mevcut sayılır, "eksik" gösterilmez; kayıtlıysa dolaptan düşülür.
- Dolaptaki asıl malzemelerden daha çoğunu kullanan tarif öne geçer; son yapılanlar ve aynı plandaki tekrarlar geriye düşer.
- Eşdeğer ürünler birbirinin yerine geçer (makarna, pirinç, bulgur, kıyma, domates türleri…).

Telefonda yapay zekâsız fiş okuma hazır ama kapalı: [mobile/src/ocr/README.md](mobile/src/ocr/README.md).
