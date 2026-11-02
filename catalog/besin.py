# Tarif malzemelerinin besin değerleri: USDA National Nutrient Database for Standard Reference, Release 28 (SR28, kamu malı).
# Kaynak dosya: npm "fda-nutrient-database@1.0.2" paketindeki data/ABBREV.txt.
# Kullanım: python3 catalog/besin.py <ABBREV.txt yolu>  ->  catalog/besin.json (100 g başına kcal, protein, karbonhidrat, yağ)
#
# Her malzeme SR28'deki bir ya da birkaç kayda bağlanır: [(NDB numarası, oran)]. None, besin değeri olmayan su payıdır.
# APPROX: SR28'de birebir karşılığı olmayan Türk ürünleri; en yakın gıda ya da bileşenlerden yaklaşık hesaplanır.
import json, pathlib, sys

MAP = {
  "Acuka": [("11546", .45), ("12155", .25), ("18079", .15), ("04053", .15)],
  "Alabalık": [("15240", 1)], "Arpa şehriye": [("20120", 1)], "Avokado": [("09037", 1)], "Ayçiçek yağı": [("04506", 1)],
  "Bal": [("19296", 1)], "Bal kabağı": [("11485", 1)], "Baldo pirinç": [("20050", 1)], "Bamya": [("11278", 1)],
  "Barbunya": [("16019", 1)], "Beyaz peynir": [("01019", 1)], "Biber salçası": [("11546", 1)], "Brokoli": [("11090", 1)],
  "Bulgur": [("20012", 1)], "Börülce": [("16062", 1)], "Bütün tavuk": [("05006", 1)], "Ceviz içi": [("12155", 1)],
  "Cheddar": [("01009", 1)], "Cherry domates": [("11529", 1)], "Dana biftek": [("23244", 1)], "Dana ciğer": [("13325", 1)],
  "Dana haşlamalık": [("13786", 1)], "Dana kuşbaşı": [("13786", 1)], "Dana kıyma": [("23572", 1)], "Dereotu": [("02045", 1)],
  "Dolmalık biber": [("11333", 1)], "Domates": [("11529", 1)], "Domates salçası": [("11546", 1)],
  "Dondurulmuş bezelye": [("11312", 1)], "Ekmek": [("18069", 1)], "Enginar": [("11007", 1)], "Erişte": [("20109", 1)],
  "Fesleğen": [("02044", 1)], "Fıstık ezmesi": [("16098", 1)], "Galeta unu": [("18079", 1)], "Granola": [("08037", 1)],
  "Hamburger ekmeği": [("18350", 1)], "Hamburger köftesi": [("23572", 1)], "Hamsi": [("15001", 1)], "Havuç": [("11124", 1)],
  "Haşlanmış nohut": [("16358", 1)], "Hellim": [("01035", 1)], "Hindi göğsü": [("05710", 1)], "Hindi kıyma": [("05305", 1)],
  "Ispanak": [("11457", 1)], "Kabak": [("11477", 1)], "Kalamar": [("15175", 1)], "Kapya biber": [("11821", 1)],
  "Karides": [("15270", 1)], "Karnabahar": [("11135", 1)], "Kasap köfte": [("23572", 1)], "Kavurma": [("23574", 1)],
  "Kaymak": [("01053", 1)], "Kaşar peyniri": [("01035", 1)], "Kimyon": [("02014", 1)], "Kinoa": [("20035", 1)],
  "Krema": [("01053", 1)], "Kuru fasulye": [("16049", 1)], "Kuru kekik": [("02042", 1)], "Kuru maya": [("18375", 1)],
  "Kuru nane": [("02066", 1)], "Kuru soğan": [("11282", 1)], "Kuskus": [("20028", 1)], "Kuzu incik": [("17232", 1)],
  "Kuzu kuşbaşı": [("17230", 1)], "Kuzu pirzola": [("17236", 1)], "Köftelik bulgur": [("20012", 1)],
  "Kültür mantarı": [("11260", 1)], "Kırmızı mercimek": [("16144", 1)], "Kırmızı soğan": [("11282", 1)],
  "Lahana": [("11109", 1)], "Lavaş": [("18364", 1)], "Lazanya yaprağı": [("20120", 1)], "Levrek": [("15091", 1)],
  "Limon": [("09150", 1)], "Lor peyniri": [("01037", 1)], "Makarna": [("20120", 1)],
  "Mantı": [("20120", .5), (None, .2), ("23572", .25), ("11282", .05)],
  "Marul": [("11251", 1)], "Maydanoz": [("11297", 1)], "Muz": [("09040", 1)], "Mısır konservesi": [("11172", 1)],
  "Mısır unu": [("20022", 1)], "Nar ekşisi": [("19304", 1)], "Nohut": [("16056", 1)], "Palamut": [("15220", 1)],
  "Parmesan": [("01033", 1)], "Pastırma": [("13350", 1)], "Patates": [("11352", 1)], "Patlıcan": [("11209", 1)],
  "Pekmez": [("19304", 1)], "Penne makarna": [("20120", 1)], "Pesto sos": [("06626", 1)], "Pide": [("18041", 1)],
  "Pilavlık bulgur": [("20012", 1)], "Pirinç": [("20050", 1)], "Pul biber": [("02031", 1)], "Pırasa": [("11246", 1)],
  "Roka": [("11959", 1)], "Salatalık": [("11205", 1)], "Sarımsak": [("11215", 1)], "Simit": [("18406", 1)],
  "Sivri biber": [("11333", 1)], "Siyah zeytin": [("09193", 1)], "Somon fileto": [("15236", 1)], "Soya sosu": [("16123", 1)],
  "Spagetti": [("20120", 1)], "Sucuk": [("07956", 1)], "Süt": [("01077", 1)], "Süzme yoğurt": [("01293", 1)],
  "Tahin": [("12166", 1)], "Tam buğday ekmeği": [("18075", 1)],
  "Tarhana": [("20081", .7), ("01116", .2), ("11546", .1)],
  "Tavuk baget": [("05066", 1)], "Tavuk but": [("05091", 1)], "Tavuk ciğer": [("05027", 1)], "Tavuk göğsü": [("05062", 1)],
  "Tavuk kanat": [("05100", 1)], "Tavuk şiş": [("05062", 1)], "Taze bezelye": [("11304", 1)], "Taze fasulye": [("11052", 1)],
  "Taze soğan": [("11291", 1)], "Tel şehriye": [("20120", 1)], "Tereyağı": [("01145", 1)], "Ton balığı": [("15119", 1)],
  "Tost ekmeği": [("18069", 1)], "Un": [("20081", 1)], "Uskumru": [("15046", 1)], "Yaban mersini": [("09050", 1)],
  "Yeşil mercimek": [("16069", 1)], "Yoğurt": [("01116", 1)], "Yufka": [("18338", 1)], "Yulaf ezmesi": [("08120", 1)],
  "Yumurta": [("01123", 1)], "Zeytinyağı": [("04053", 1)], "Çilek": [("09316", 1)], "Çipura": [("15091", 1)],
  "Üzüm sirkesi": [("02068", 1)], "İşkembe": [("13341", 1)],
  # Kompleks tariflerle gelenler
  "Kuzu kıyma": [("17224", 1)], "Kuzu kol": [("17035", 1)], "Dana antrikot": [("13095", 1)], "Defne yaprağı": [("02004", 1)],
  "Tarçın": [("02010", 1)], "Yenibahar": [("02001", 1)], "Zencefil": [("11216", 1)], "Susam": [("12023", 1)],
  "Köri": [("02015", 1)], "Toz kırmızı biber": [("02028", 1)], "Muskat": [("02025", 1)], "Hardal": [("02046", 1)],
  "İrmik": [("20066", 1)], "Badem": [("12061", 1)], "Kuş üzümü": [("09085", 1)], "Çam fıstığı": [("12147", 1)],
  "Ahtapot": [("15166", 1)], "Kereviz": [("11141", 1)], "Taze nane": [("02065", 1)], "Zerdeçal": [("02043", 1)],
  "Toz şeker": [("19335", 1)], "İsot": [("02031", 1)],
}
APPROX = {"Acuka", "Beyaz peynir", "Biber salçası", "Hellim", "Kavurma", "Kaymak", "Kaşar peyniri", "Lor peyniri", "Mantı",
          "Nar ekşisi", "Palamut", "İsot", "Simit", "Sucuk", "Tarhana", "Çipura", "Lavaş"}
# Adet, demet, paket ve kutunun yenilebilir gram karşılığı; ml için yoğunluk (g/ml).
UNIT_GRAMS = {
  "Yumurta": 50, "Avokado": 150, "Ekmek": 250, "Tam buğday ekmeği": 350, "Simit": 110, "Pide": 250, "Enginar": 120,
  "Brokoli": 500, "Karnabahar": 800, "Lahana": 1500, "Marul": 400, "Bütün tavuk": 1200,
  "Maydanoz": 50, "Dereotu": 50, "Taze soğan": 100, "Roka": 80, "Fesleğen": 30,
  "Kuru maya": 10, "Yufka": 500, "Tost ekmeği": 500, "Hamburger ekmeği": 280, "Lavaş": 300,
  "Ton balığı": 120, "Defne yaprağı": 5, "Taze nane": 30, "Mısır konservesi": 220, "Haşlanmış nohut": 240,
}
# Kılçıklı/kemikli ürünlerde tarif ağırlığının yenilebilir payı (SR28 değerleri yenilebilir kısım içindir).
EDIBLE = {"Hamsi": .6, "Levrek": .5, "Çipura": .5, "Uskumru": .6, "Alabalık": .6, "Palamut": .65,
          "Kuzu incik": .6, "Kuzu pirzola": .7, "Tavuk baget": .7, "Tavuk kanat": .6, "Tavuk but": .75, "Kuzu kol": .7}
DENSITY = {"Ayçiçek yağı": .92, "Zeytinyağı": .92, "Süt": 1.03, "Soya sosu": 1.1, "Nar ekşisi": 1.3, "Krema": 1.0, "Üzüm sirkesi": 1.0}

def load(path):
    rows = {}
    for line in open(path, encoding="latin-1"):
        f = [x.strip("~") for x in line.rstrip("\r\n").split("^")]
        n = lambda v: float(v) if v else 0.0
        rows[f[0]] = {"desc": f[1], "kcal": n(f[3]), "protein": n(f[4]), "fat": n(f[5]), "carbs": n(f[7])}
    return rows

if __name__ == "__main__":
    sr = load(sys.argv[1])
    out = {}
    for name, parts in sorted(MAP.items()):
        assert abs(sum(p for _, p in parts) - 1) < 1e-6, name
        v = {"kcal": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}
        for ndb, frac in parts:
            if ndb is None: continue
            assert ndb in sr, f"{name}: {ndb} yok"
            for k in v: v[k] += sr[ndb][k] * frac
        out[name] = {**{k: round(x, 2) for k, x in v.items()}, "sr28": [p for p, _ in parts if p], "approx": name in APPROX,
                     **({"unitGrams": UNIT_GRAMS[name]} if name in UNIT_GRAMS else {}),
                     **({"density": DENSITY[name]} if name in DENSITY else {}),
                     **({"edible": EDIBLE[name]} if name in EDIBLE else {})}
    here = pathlib.Path(__file__).resolve().parent
    (here / "besin.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    for name in ["Domates", "Yumurta", "Tavuk göğsü", "Mantı"]:
        print(name, out[name])
    print(len(out), "malzeme,", sum(v["approx"] for v in out.values()), "yaklaşık")
