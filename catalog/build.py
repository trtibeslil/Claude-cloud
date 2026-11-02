# Ürün kataloğunu üretir: python3 catalog/build.py  ->  catalog/urunler.json, mobile/src/urunler.json, server/src/categories.json
# Web sürümüne gömmek için ardından: python3 catalog/inject.py
# Satır biçimi: "Ad | birim | varsayılan miktar"  (birim: kg, g, l, ml, adet, paket, demet, kutu, şişe)
import json

CATS = [
  # anahtar, görünen ad, renk tonu (hue)
  ("meyve", "Meyve", 12), ("sebze", "Sebze", 125), ("yesillik", "Yeşillik & Taze Ot", 95),
  ("beyaz-et", "Beyaz Et", 32), ("kirmizi-et", "Kırmızı Et", 355), ("balik", "Balık & Deniz Ürünleri", 200),
  ("sarkuteri", "Şarküteri", 335), ("sut", "Süt & Süt Ürünleri", 212), ("peynir", "Peynir", 46),
  ("kahvaltilik", "Yumurta & Kahvaltılık", 38), ("bakliyat", "Bakliyat", 24), ("tahil", "Pirinç, Makarna & Tahıl", 42),
  ("un", "Un, Şeker & Pastacılık", 30), ("ekmek", "Ekmek & Fırın", 28), ("yag", "Yağlar", 55),
  ("baharat", "Baharat", 18), ("sos", "Sos, Salça & Konserve", 4), ("dondurulmus", "Dondurulmuş", 190),
  ("kuruyemis", "Kuruyemiş & Kuru Meyve", 26), ("atistirmalik", "Atıştırmalık & Tatlı", 320),
  ("icecek", "İçecek", 268), ("diger", "Diğer", 30),
]

ITEMS = {
"meyve": """Elma|kg|1; Yeşil elma|kg|1; Armut|kg|1; Muz|kg|1; Portakal|kg|2; Mandalina|kg|1; Greyfurt|kg|1;
Limon|kg|0.5; Misket limonu|adet|4; Kivi|kg|0.5; Çilek|g|500; Kiraz|kg|0.5; Vişne|kg|0.5; Üzüm|kg|1;
Karpuz|adet|1; Kavun|adet|1; Şeftali|kg|1; Nektarin|kg|1; Kayısı|kg|0.5; Erik|kg|0.5; Ayva|kg|1; Nar|kg|1;
İncir|kg|0.5; Ananas|adet|1; Mango|adet|1; Avokado|adet|2; Böğürtlen|g|125; Ahududu|g|125;
Yaban mersini|g|125; Trabzon hurması|kg|1; Dut|g|500; Hindistan cevizi|adet|1; Yenidünya|kg|0.5; Malta eriği|kg|0.5""",
"sebze": """Domates|kg|1; Salkım domates|kg|1; Cherry domates|g|500; Salatalık|kg|1; Sivri biber|g|500;
Çarliston biber|g|500; Kapya biber|g|500; Dolmalık biber|g|500; Acı biber|g|250; Patlıcan|kg|1; Kabak|kg|1;
Havuç|kg|1; Patates|kg|2; Kuru soğan|kg|2; Kırmızı soğan|kg|1; Sarımsak|g|250; Lahana|adet|1;
Kırmızı lahana|adet|1; Karnabahar|adet|1; Brokoli|adet|1; Ispanak|kg|1; Pırasa|kg|1; Kereviz|kg|1;
Kırmızı pancar|kg|1; Turp|kg|0.5; Kültür mantarı|g|400; İstiridye mantarı|g|250; Taze bezelye|kg|0.5;
Taze fasulye|kg|1; Bamya|g|500; Enginar|adet|4; Taze bakla|kg|1; Mısır|adet|2; Tatlı patates|kg|1;
Zencefil|g|100; Bal kabağı|kg|1; Kuşkonmaz|demet|1; Brüksel lahanası|g|500; Şalgam|kg|0.5; Yer elması|kg|0.5""",
"yesillik": """Maydanoz|demet|1; Dereotu|demet|1; Taze soğan|demet|1; Taze nane|demet|1; Roka|demet|1;
Marul|adet|1; Kıvırcık|adet|1; Göbek marul|adet|1; Aysberg|adet|1; Tere|demet|1; Fesleğen|demet|1;
Semizotu|demet|1; Pazı|demet|1; Karalahana|demet|1; Kişniş|demet|1; Taze kekik|demet|1; Taze biberiye|demet|1;
Ebegümeci|demet|1; Taze sarımsak|demet|1""",
"beyaz-et": """Bütün tavuk|adet|1; Tavuk göğsü|kg|1; Tavuk bonfile|g|500; Tavuk but|kg|1; Tavuk baget|kg|1;
Tavuk kanat|kg|1; Tavuk pirzola|kg|1; Tavuk sote|kg|1; Tavuk şiş|g|500; Tavuk kıyma|g|500; Tavuk ciğer|g|500;
Tavuk taşlık|g|500; Tavuk kalçalı but|kg|1; Hindi göğsü|kg|1; Hindi but|kg|1; Hindi kıyma|g|500; Hindi kuşbaşı|g|500""",
"kirmizi-et": """Dana kıyma|g|500; Kuzu kıyma|g|500; Karışık kıyma|g|500; Dana kuşbaşı|g|500; Kuzu kuşbaşı|g|500;
Dana bonfile|g|500; Dana antrikot|g|500; Dana biftek|g|500; Dana kontrfile|g|500; Dana gulaş|g|500;
Dana haşlamalık|kg|1; Dana kaburga|kg|1; Dana incik|kg|1; Kuzu pirzola|g|500; Kuzu incik|kg|1; Kuzu kol|kg|1;
Kuzu but|kg|1; Kuzu kaburga|kg|1; Kasap köfte|g|500; Hamburger köftesi|g|500; Dana ciğer|g|500; Kuzu ciğer|g|500;
İşkembe|g|500; İlikli kemik|g|500; Dana dil|g|500""",
"balik": """Hamsi|kg|1; Levrek|kg|1; Çipura|kg|1; Somon|kg|1; Palamut|kg|1; Lüfer|kg|1; Sardalya|kg|1;
İstavrit|kg|1; Mezgit|kg|1; Barbunya balığı|kg|1; Alabalık|kg|1; Uskumru|kg|1; Kalkan|kg|1; Lüfer fileto|g|500;
Somon fileto|g|500; Karides|g|500; Kalamar|g|500; Midye|kg|1; Ahtapot|kg|1; Füme somon|g|100""",
"sarkuteri": """Sucuk|g|250; Kangal sucuk|g|500; Pastırma|g|100; Dana salam|g|200; Tavuk salam|g|200; Macar salam|g|150;
Sosis|g|400; Kavurma|g|250; Hindi füme|g|150; Dana füme|g|100; Hindi jambon|g|150; Kokteyl sosis|g|200""",
"sut": """Süt|l|1; Yarım yağlı süt|l|1; Laktozsuz süt|l|1; Ayran|l|1; Kefir|l|1; Yoğurt|g|1000;
Süzme yoğurt|g|750; Tereyağı|g|250; Krema|ml|200; Kaymak|g|200; Labne|g|200; Badem sütü|l|1; Yulaf sütü|l|1;
Soya sütü|l|1; Sütlaç|adet|2""",
"peynir": """Beyaz peynir|g|500; Kaşar peyniri|g|400; Eski kaşar|g|250; Tulum peyniri|g|250; Lor peyniri|g|500;
Çökelek|g|500; Örgü peyniri|g|250; Dil peyniri|g|250; Çeçil peyniri|g|250; Hellim|g|250; Ezine peyniri|g|500;
Mozzarella|g|200; Parmesan|g|100; Cheddar|g|200; Krem peynir|g|200; Keçi peyniri|g|250; Otlu peynir|g|250;
Mihaliç peyniri|g|250; Feta|g|200; Rokfor|g|100""",
"kahvaltilik": """Yumurta|adet|10; Köy yumurtası|adet|10; Siyah zeytin|g|500; Yeşil zeytin|g|500; Kırma zeytin|g|500;
Bal|g|450; Reçel|g|380; Tahin|g|300; Pekmez|g|700; Fındık kreması|g|350; Fıstık ezmesi|g|300; Tahin helvası|g|500;
Zeytin ezmesi|g|200; Acuka|g|200""",
"bakliyat": """Kırmızı mercimek|kg|1; Yeşil mercimek|kg|1; Sarı mercimek|kg|1; Nohut|kg|1; Kuru fasulye|kg|1;
Barbunya|kg|1; Börülce|g|500; Maş fasulyesi|g|500; Kuru bakla|g|500; Siyah fasulye|g|500""",
"tahil": """Pirinç|kg|1; Makarna|g|500; Bulgur|kg|1; Baldo pirinç|kg|1; Osmancık pirinç|kg|1; Basmati pirinç|kg|1; Pilavlık bulgur|kg|1; Köftelik bulgur|kg|1;
Spagetti|g|500; Penne makarna|g|500; Burgu makarna|g|500; Fiyonk makarna|g|500; Kelebek makarna|g|500;
Erişte|g|500; Arpa şehriye|g|500; Tel şehriye|g|500; Kuskus|g|500; Mantı|g|500; Lazanya yaprağı|g|500;
Kinoa|g|500; Yulaf ezmesi|g|500; Mısır gevreği|g|400; Granola|g|400; Karabuğday|g|500; Firik|g|500;
Noodle|paket|1; Tarhana|g|500""",
"un": """Un|kg|1; Tam buğday unu|kg|1; Mısır unu|g|500; İrmik|g|500; Nişasta|g|200; Toz şeker|kg|1;
Esmer şeker|g|500; Pudra şekeri|g|250; Kabartma tozu|paket|1; Karbonat|paket|1; Vanilin|paket|1;
Kuru maya|paket|1; Yaş maya|paket|1; Kakao|g|100; Galeta unu|g|250; Hindistan cevizi rendesi|g|100;
Puding|paket|1; Krem şanti|paket|1; Damla çikolata|g|100""",
"ekmek": """Ekmek|adet|1; Tam buğday ekmeği|adet|1; Çavdar ekmeği|adet|1; Kepekli ekmek|adet|1; Tost ekmeği|paket|1;
Lavaş|paket|1; Tortilla|paket|1; Pide|adet|1; Simit|adet|2; Bazlama|adet|2; Yufka|paket|1;
Baklava yufkası|paket|1; Hamburger ekmeği|paket|1; Sandviç ekmeği|paket|1; Galeta|paket|1; Poğaça|adet|4""",
"yag": """Zeytinyağı|l|1; Ayçiçek yağı|l|2; Mısırözü yağı|l|1; Fındık yağı|l|1; Margarin|g|250;
Hindistan cevizi yağı|ml|300; Susam yağı|ml|250""",
"baharat": """Tuz|g|750; Karabiber|g|50; Pul biber|g|100; Toz kırmızı biber|g|100; İsot|g|100; Kimyon|g|50;
Kuru kekik|g|50; Kuru nane|g|50; Sumak|g|100; Tarçın|g|50; Zerdeçal|g|50; Köri|g|50; Yenibahar|g|50;
Karanfil|g|25; Defne yaprağı|paket|1; Toz zencefil|g|50; Çörek otu|g|100; Susam|g|200; Sarımsak tozu|g|50;
Köfte baharatı|g|50; Muskat|g|25; Kırmızı toz biber (acı)|g|100""",
"sos": """Domates salçası|g|830; Biber salçası|g|650; Ketçap|g|600; Mayonez|g|500; Hardal|g|300; Nar ekşisi|ml|330;
Soya sosu|ml|250; Üzüm sirkesi|ml|1000; Elma sirkesi|ml|1000; Limon sosu|ml|500; Acı sos|ml|100; Pesto sos|g|190;
Barbekü sosu|ml|300; Doğranmış domates konservesi|kutu|1; Ton balığı|kutu|1; Mısır konservesi|kutu|1;
Haşlanmış nohut|kutu|1; Haşlanmış barbunya|kutu|1; Bezelye konservesi|kutu|1; Közlenmiş biber|g|500;
Karışık turşu|g|1000; Kornişon turşu|g|680; Hazır çorba|paket|1; Bulyon|paket|1; Közlenmiş patlıcan|g|500""",
"dondurulmus": """Dondurulmuş bezelye|g|450; Dondurulmuş karışık sebze|g|450; Dondurulmuş ıspanak|g|450;
Dondurulmuş patates|g|1000; Dondurulmuş mısır|g|450; Milföy hamuru|g|1000; Dondurulmuş mantı|g|500;
Dondurulmuş börek|g|1000; Sigara böreği|g|500; Dondurulmuş pizza|adet|1; Dondurulmuş köfte|g|500;
Tavuk nugget|g|500; Dondurma|l|1; Dondurulmuş karides|g|500""",
"kuruyemis": """Ceviz içi|g|250; Fındık içi|g|250; Badem|g|250; Antep fıstığı|g|250; Yer fıstığı|g|250; Kaju|g|250;
Leblebi|g|250; Ay çekirdeği|g|250; Kabak çekirdeği|g|250; Kuru üzüm|g|250; Kuru kayısı|g|250; Kuru incir|g|250;
Hurma|g|500; Kuru erik|g|250; Kuru dut|g|250; Çam fıstığı|g|50; Chia tohumu|g|200; Keten tohumu|g|200;
Kuş üzümü|g|50; Kuru domates|g|250""",
"atistirmalik": """Sütlü çikolata|g|80; Bitter çikolata|g|80; Bisküvi|paket|1; Kraker|paket|1; Cips|paket|1;
Gofret|paket|1; Kek|paket|1; Kurabiye|paket|1; Lokum|g|250; Şekerleme|g|200; Patlamış mısırlık mısır|g|250;
Pirinç patlağı|paket|1; Protein bar|adet|1""",
"icecek": """Su|l|5; Maden suyu|adet|6; Meyve suyu|l|1; Portakal suyu|l|1; Gazlı içecek|l|1; Limonata|l|1;
Şalgam suyu|l|1; Çay|g|500; Türk kahvesi|g|100; Filtre kahve|g|250; Hazır kahve|g|100; Bitki çayı|paket|1;
Yeşil çay|paket|1; Soğuk çay|l|1""",
}

items = []
for key, block in ITEMS.items():
    for part in block.replace("\n", " ").split(";"):
        part = part.strip()
        if not part: continue
        name, unit, q = [x.strip() for x in part.split("|")]
        items.append([name, key, unit, float(q) if "." in q else int(q)])

names = [i[0].lower() for i in items]
dups = {n for n in names if names.count(n) > 1}
assert not dups, dups
keys = {k for k, _, _ in CATS}
assert all(i[1] in keys for i in items)
import pathlib
here = pathlib.Path(__file__).resolve().parent
data = {"cats": [{"k": k, "n": n, "h": h} for k, n, h in CATS], "items": items}
# Tek kaynak burası; mobil uygulama ve sunucu kendi kopyalarını kullanır (Metro ve Worker proje dışını paketlemez).
for target in [here / "urunler.json", here.parent / "mobile/src/urunler.json"]:
    target.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
(here.parent / "server/src/categories.json").write_text(json.dumps([n for _, n, _ in CATS], ensure_ascii=False))
print(len(items), "ürün,", len(CATS), "kategori")
for k, n, _ in CATS: print(f"  {n}: {sum(1 for i in items if i[1]==k)}")
