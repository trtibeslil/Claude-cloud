# Uygulamaya gömülü tarifler (yapay zekâsız menü önerisi için): python3 catalog/tarifler.py -> mobile/src/tarifler.json
# Satır: Ad | öğünler (K=kahvaltı, O=öğle, A=akşam) | dakika | etiketler | malzemeler (4 kişilik) | adımlar | kişi başı kcal,protein,karb,yağ
# Malzeme: "Ürün adı:miktar birim"; başında ? olan isteğe bağlıdır. Tuz, karabiber, su her evde var sayılır.
# Etiketler: v vejetaryen, vg vegan, hp yüksek protein, lc düşük karbonhidrat. Besin değerleri yaklaşıktır.
import json, pathlib

R = """
Menemen | K | 20 | v,lc | Yumurta:6 adet, Domates:400 g, Sivri biber:200 g, ?Kuru soğan:100 g, ?Tereyağı:20 g | Biberleri doğrayıp tereyağında 3-4 dakika kavur. / Rendelenmiş domatesi ekle, suyunu çekene kadar pişir. / Yumurtaları kır, hafifçe karıştırıp kıvamına gelince ocaktan al. | 230,14,9,15
Peynirli kahvaltı tabağı | K | 15 | v,lc | Yumurta:8 adet, Beyaz peynir:200 g, Domates:300 g, Salatalık:300 g, ?Siyah zeytin:100 g | Yumurtaları kaynar suda 8 dakika haşla. / Domates ve salatalığı dilimle. / Peynir ve zeytinle birlikte tabağa diz. | 330,22,8,23
Sucuklu yumurta | K | 15 | hp,lc | Yumurta:8 adet, Sucuk:200 g | Sucuğu dilimleyip tavada yağını salana kadar çevir. / Yumurtaları üzerine kır. / Beyazı pişince ocaktan al. | 420,27,2,33
Kaşarlı omlet | K | 15 | v,lc | Yumurta:8 adet, Kaşar peyniri:120 g, ?Süt:100 ml, ?Tereyağı:20 g, ?Maydanoz:1 demet | Yumurta ve sütü çırp. / Tereyağını eritip karışımı tavaya dök. / Rendelenmiş kaşarı serp, katlayıp servis et. | 330,24,3,25
Muzlu yulaf lapası | K | 10 | v | Yulaf ezmesi:200 g, Süt:800 ml, Muz:300 g, ?Bal:40 g, ?Ceviz içi:40 g | Yulafı sütle kısık ateşte 5 dakika pişir. / Dilimlenmiş muzu ekle. / Bal ve cevizle servis et. | 360,13,52,11
Mıhlama | K | 20 | v | Mısır unu:120 g, Tereyağı:80 g, Kaşar peyniri:200 g | Tereyağını erit, mısır ununu 3 dakika kavur. / 2 su bardağı su ekleyip koyulaşana kadar karıştır. / Peyniri ekle, uzayana kadar pişir. | 520,18,26,38
Yumurtalı ekmek | K | 15 | v | Ekmek:1 adet, Yumurta:4 adet, Süt:150 ml, ?Ayçiçek yağı:100 ml | Yumurta ve sütü çırp. / Dilimlenmiş ekmekleri karışıma bulayıp kızart. / Kâğıt havluda yağını alıp servis et. | 330,13,38,14
Patatesli yumurta | K,O | 25 | v | Patates:500 g, Yumurta:6 adet, ?Kuru soğan:100 g, ?Ayçiçek yağı:50 ml | Patatesi küp doğrayıp yağda yumuşayana kadar kavur. / Doğranmış soğanı ekleyip 2 dakika çevir. / Yumurtaları kır, pişince servis et. | 300,12,30,15
Meyveli yoğurt kasesi | K | 5 | v | Yoğurt:600 g, Muz:300 g, Çilek:250 g, ?Bal:40 g, ?Ceviz içi:40 g | Meyveleri doğra. / Yoğurdun üzerine ekle. / Bal ve cevizle servis et. | 240,10,33,8
Çılbır | K | 20 | v,lc | Yumurta:8 adet, Süzme yoğurt:400 g, Sarımsak:10 g, Tereyağı:40 g, ?Pul biber:5 g | Yoğurdu ezilmiş sarımsakla karıştır. / Yumurtaları sirkeli kaynar suda 3 dakika poşe et. / Yoğurdun üzerine al, pul biberli eritilmiş tereyağı gezdir. | 330,22,7,24
Kaşarlı tost | K | 10 | v | Tost ekmeği:0.5 paket, Kaşar peyniri:200 g, ?Domates:200 g | Ekmeklerin arasına kaşar ve domates koy. / Tost makinesinde ya da tavada iki yüzünü kızart. | 380,17,40,16
Ispanaklı yumurta | K,O | 20 | v,lc | Ispanak:500 g, Yumurta:6 adet, ?Kuru soğan:100 g, ?Tereyağı:20 g | Soğanı tereyağında kavur. / Doğranmış ıspanağı ekleyip sönene kadar pişir. / Yumurtaları kır, kapağı kapalı pişir. | 200,15,8,12
Peynirli börek | K,O | 45 | v | Yufka:1 paket, Beyaz peynir:300 g, Yumurta:2 adet, Süt:200 ml, ?Maydanoz:1 demet | Yumurta ve sütü çırp, ufalanmış peynir ve maydanozu karıştır. / Yufkaları sosla yağlayıp iç harçla kat kat diz. / 180 derece fırında 35 dakika pişir. | 430,18,45,19
Mercimek çorbası | O,A | 35 | v | Kırmızı mercimek:300 g, Kuru soğan:150 g, Havuç:150 g, ?Patates:150 g, ?Tereyağı:30 g, ?Limon:100 g | Soğan ve havucu tereyağında kavur. / Mercimeği ve 1,5 litre sıcak suyu ekleyip 25 dakika pişir. / Blenderdan geçir, limonla servis et. | 270,15,40,6
Ezogelin çorbası | O,A | 40 | v | Kırmızı mercimek:200 g, Pilavlık bulgur:50 g, Kuru soğan:100 g, Domates salçası:30 g, ?Kuru nane:3 g, ?Tereyağı:30 g | Soğanı kavur, salçayı ekle. / Mercimek, bulgur ve 1,5 litre suyu ekleyip 30 dakika pişir. / Naneli tereyağı gezdirip servis et. | 240,12,40,4
Yayla çorbası | O,A | 30 | v | Yoğurt:500 g, Baldo pirinç:80 g, Yumurta:1 adet, Un:30 g, ?Kuru nane:3 g, ?Tereyağı:20 g | Pirinci 1,2 litre suda yumuşayana kadar haşla. / Yoğurt, yumurta ve unu çırpıp ılık suyla ılıştırarak tencereye ekle. / Kaynayınca naneli tereyağı gezdir. | 200,9,25,7
Domates çorbası | O,A | 30 | v | Domates:1000 g, Un:30 g, Tereyağı:30 g, ?Süt:200 ml, ?Kaşar peyniri:80 g | Unu tereyağında kavur. / Rendelenmiş domatesi ve 1 litre suyu ekleyip 20 dakika pişir. / Sütü ekle, kaşarla servis et. | 180,6,18,10
Tavuk suyu çorbası | O,A | 45 | hp | Tavuk göğsü:300 g, Havuç:100 g, Tel şehriye:80 g, ?Limon:100 g | Tavuğu 1,5 litre suda 25 dakika haşla, didikle. / Rendelenmiş havuç ve şehriyeyi suya ekleyip 10 dakika pişir. / Tavuğu geri ekle, limonla servis et. | 220,20,20,6
Tarhana çorbası | O,A | 25 | v | Tarhana:120 g, Domates salçası:20 g, Tereyağı:30 g | Salçayı tereyağında kavur. / Tarhanayı 1,2 litre suyla açıp ekle. / Sürekli karıştırarak 15 dakika pişir. | 160,5,22,6
Domatesli makarna | O,A | 25 | v | Spagetti:500 g, Domates:500 g, Sarımsak:15 g, ?Zeytinyağı:40 ml, ?Fesleğen:1 demet | Makarnayı tuzlu suda haşla. / Sarımsağı yağda çevir, rendelenmiş domatesi ekleyip 10 dakika pişir. / Sosu makarnayla karıştır, fesleğenle servis et. | 520,17,95,8
Kıymalı makarna | A | 30 | hp | Makarna:500 g, Dana kıyma:300 g, Kuru soğan:100 g, Domates salçası:30 g | Makarnayı haşla. / Kıymayı soğanla kavur, salça ve 1 su bardağı su ekleyip 10 dakika pişir. / Sosu makarnayla karıştır. | 640,30,85,19
Kremalı mantarlı makarna | A | 25 | v | Makarna:500 g, Kültür mantarı:300 g, Krema:200 ml, ?Sarımsak:10 g | Makarnayı haşla. / Mantarı sarımsakla suyunu çekene kadar sotele. / Kremayı ekle, makarnayla karıştır. | 600,18,85,20
Yoğurtlu mantı | O,A | 20 | v | Mantı:500 g, Yoğurt:400 g, Sarımsak:10 g, Tereyağı:40 g, ?Pul biber:5 g | Mantıyı tuzlu suda haşla. / Sarımsaklı yoğurdu üzerine dök. / Pul biberli eritilmiş tereyağı gezdir. | 560,22,70,20
Tavuk sote | O,A | 30 | hp,lc | Tavuk göğsü:600 g, Kapya biber:200 g, Sivri biber:100 g, Domates:300 g, Kuru soğan:150 g, ?Domates salçası:20 g | Tavuğu kuşbaşı doğrayıp suyunu çekene kadar sotele. / Soğan ve biberleri ekle. / Domates ve salçayı ekleyip 10 dakika pişir. | 300,38,10,11
Mantarlı tavuk | A | 30 | hp,lc | Tavuk göğsü:600 g, Kültür mantarı:400 g, ?Krema:200 ml, ?Sarımsak:10 g | Tavuğu şeritler halinde doğrayıp sotele. / Mantar ve sarımsağı ekle. / Kremayı ekleyip 5 dakika pişir. | 380,40,6,21
Fırında tavuk baget ve patates | A | 60 | hp | Tavuk baget:1000 g, Patates:800 g, ?Domates salçası:30 g, ?Kuru kekik:3 g | Salça, yağ ve baharatla sos hazırla. / Tavuk ve elma dilim patatesi sosla harmanla. / 200 derece fırında 45 dakika pişir. | 560,38,35,28
Fırında tavuk kanat | A | 40 | hp,lc | Tavuk kanat:1000 g, ?Domates salçası:20 g, ?Yoğurt:100 g | Kanatları yoğurt, salça ve baharatla 15 dakika marine et. / Tepsiye diz. / 200 derece fırında 30 dakika pişir. | 430,35,3,30
Tavuk şiş | A | 30 | hp,lc | Tavuk şiş:600 g, Kapya biber:200 g, ?Yoğurt:150 g | Tavuğu yoğurt ve baharatla marine et. / Biberle şişlere diz. / Izgarada ya da tavada her yüzünü 5 dakika pişir. | 300,38,6,13
Tavuklu pilav | A | 40 | hp | Tavuk göğsü:500 g, Baldo pirinç:400 g, Tereyağı:30 g | Tavuğu haşlayıp didikle, suyunu sakla. / Pirinci tereyağında kavur, 3 su bardağı tavuk suyuyla demle. / Tavukla servis et. | 560,36,75,12
Izgara köfte | O,A | 30 | hp,lc | Dana kıyma:500 g, Kuru soğan:100 g, ?Galeta unu:30 g, ?Kimyon:3 g | Kıymayı rendelenmiş soğan ve baharatlarla yoğur. / Köfte şekli ver. / Tavada ya da ızgarada her yüzünü 4-5 dakika pişir. | 360,27,6,25
Fırında köfte patates | A | 60 | hp | Dana kıyma:500 g, Patates:600 g, Domates:300 g, Kuru soğan:100 g | Kıymayı soğanla yoğurup köfte yap. / Köfte, patates ve domatesi tepsiye diz, 1 su bardağı su ekle. / 200 derece fırında 40 dakika pişir. | 560,30,35,32
Karnıyarık | A | 60 | hp | Patlıcan:1000 g, Dana kıyma:250 g, Kuru soğan:150 g, Domates:300 g, Sivri biber:100 g | Patlıcanları alacalı soyup kızart ya da fırınla. / Kıymayı soğan ve domatesle kavur. / Patlıcanları yarıp harcı doldur, 180 derecede 20 dakika pişir. | 420,18,22,29
Patlıcan musakka | A | 60 | hp | Patlıcan:1000 g, Dana kıyma:300 g, Kuru soğan:100 g, Domates:300 g, Sivri biber:100 g | Patlıcanları küp doğrayıp kızart. / Kıymayı soğan, biber ve domatesle pişir. / Patlıcanı ekleyip kısık ateşte 15 dakika pişir. | 400,20,18,28
İmam bayıldı | O,A | 50 | vg | Patlıcan:1000 g, Kuru soğan:250 g, Domates:400 g, Sarımsak:20 g, Zeytinyağı:80 ml | Patlıcanları alacalı soyup yağda çevir. / Soğan, sarımsak ve domatesi zeytinyağında pişir. / Patlıcanları doldurup az suyla 30 dakika pişir; soğuk servis et. | 300,5,25,21
Dana kuşbaşı sote | A | 50 | hp,lc | Dana kuşbaşı:600 g, Kuru soğan:150 g, Kapya biber:200 g, Domates:300 g | Eti suyunu salıp çekene kadar kavur. / Soğan ve biberi ekle. / Domatesi ekleyip kısık ateşte 25 dakika pişir. | 380,36,10,22
Etli bezelye | A | 45 | hp | Dondurulmuş bezelye:450 g, Dana kuşbaşı:300 g, Havuç:100 g, Patates:200 g, Domates salçası:20 g | Eti kavur, salçayı ekle. / Havuç, patates, bezelye ve 2 su bardağı su ekle. / Kısık ateşte 30 dakika pişir. | 330,24,28,13
Kıymalı ıspanak | A | 30 | hp,lc | Ispanak:800 g, Dana kıyma:250 g, Kuru soğan:100 g, ?Yoğurt:300 g | Kıymayı soğanla kavur. / Doğranmış ıspanağı ekleyip 10 dakika pişir. / Yoğurtla servis et. | 260,18,10,16
Kuru fasulye | A | 90 | vg | Kuru fasulye:400 g, Kuru soğan:150 g, Domates salçası:40 g | Fasulyeyi bir gece önceden ıslat. / Soğanı kavur, salçayı ekle. / Fasulye ve sıcak suyu ekleyip 60-70 dakika pişir. | 330,19,50,6
Nohut yemeği | A | 80 | vg | Nohut:400 g, Kuru soğan:150 g, Domates salçası:40 g | Nohudu bir gece önceden ıslat. / Soğanı kavur, salçayı ekle. / Nohut ve sıcak suyu ekleyip yumuşayana kadar pişir. | 350,17,52,8
Tereyağlı pirinç pilavı | O,A | 30 | v | Pirinç:400 g, Tereyağı:40 g, ?Arpa şehriye:50 g | Şehriyeyi tereyağında kızart. / Yıkanmış pirinci ekleyip 2 dakika kavur. / 3 su bardağı sıcak su ekle, kısık ateşte 15 dakika demle. | 420,7,80,9
Bulgur pilavı | O,A | 30 | vg | Bulgur:400 g, Kuru soğan:100 g, Domates salçası:30 g, ?Sivri biber:100 g | Soğan ve biberi kavur, salçayı ekle. / Bulguru ekleyip 2 dakika çevir. / 3 su bardağı sıcak suyla 15 dakika demle. | 380,12,72,5
Zeytinyağlı taze fasulye | O,A | 45 | vg | Taze fasulye:800 g, Domates:300 g, Kuru soğan:150 g, Zeytinyağı:60 ml | Soğanı zeytinyağında kavur. / Fasulye ve rendelenmiş domatesi ekle. / Az suyla kısık ateşte 35 dakika pişir; ılık servis et. | 200,5,20,12
Zeytinyağlı pırasa | O,A | 45 | vg | Pırasa:1000 g, Havuç:150 g, Baldo pirinç:50 g, Zeytinyağı:60 ml, ?Limon:100 g | Pırasa ve havucu zeytinyağında çevir. / Pirinç ve 1 su bardağı su ekle. / Kısık ateşte 30 dakika pişir, limonla servis et. | 200,4,25,10
Fırında sebze | O,A | 45 | vg | Patates:500 g, Kabak:400 g, Havuç:200 g, Kapya biber:200 g, Zeytinyağı:50 ml | Sebzeleri iri doğra. / Zeytinyağı ve baharatla harmanla. / 200 derece fırında 35 dakika pişir. | 230,4,30,11
Kabak mücveri | O,A | 35 | v | Kabak:800 g, Yumurta:3 adet, Un:80 g, Beyaz peynir:150 g, ?Dereotu:1 demet | Kabağı rendeleyip suyunu sık. / Yumurta, un, peynir ve dereotuyla karıştır. / Kaşıkla tavaya döküp iki yüzünü kızart. | 280,13,22,15
Kısır | O | 25 | vg | Köftelik bulgur:300 g, Domates salçası:40 g, Biber salçası:30 g, Taze soğan:1 demet, Maydanoz:1 demet, ?Nar ekşisi:30 ml, ?Limon:100 g | Bulguru 1,5 su bardağı sıcak suyla ıslatıp 15 dakika beklet. / Salçaları ekleyip yoğur. / Doğranmış yeşillikler, nar ekşisi ve limonla karıştır. | 300,8,52,8
Çoban salata | O,A | 10 | vg,lc | Domates:400 g, Salatalık:300 g, Sivri biber:100 g, Kuru soğan:100 g, ?Maydanoz:1 demet, ?Zeytinyağı:30 ml | Sebzeleri küçük küp doğra. / Zeytinyağı, tuz ve limonla karıştır. | 90,2,10,5
Ton balıklı salata | O | 10 | hp,lc | Ton balığı:2 kutu, Marul:1 adet, Mısır konservesi:1 kutu, ?Domates:200 g | Marulu doğra. / Ton balığı, mısır ve domatesi ekle. / Zeytinyağı ve limonla karıştır. | 260,22,14,13
Yeşil mercimek salatası | O | 35 | vg,hp | Yeşil mercimek:250 g, Domates:200 g, Taze soğan:1 demet, Maydanoz:1 demet, ?Limon:100 g | Mercimeği 20 dakika haşla, süz. / Doğranmış domates ve yeşilliklerle karıştır. / Limon ve zeytinyağıyla tatlandır. | 250,14,36,6
Patates salatası | O | 30 | vg | Patates:800 g, Taze soğan:1 demet, Maydanoz:1 demet, ?Limon:100 g | Patatesleri haşlayıp küp doğra. / Yeşillikleri ekle. / Limon ve zeytinyağıyla karıştır. | 220,4,36,7
Fırında somon | A | 25 | hp,lc | Somon fileto:600 g, Limon:100 g, ?Brokoli:1 adet | Somonu limon ve baharatla tatlandır. / Brokoliyle birlikte tepsiye koy. / 200 derece fırında 18 dakika pişir. | 420,34,6,28
Fırında levrek | A | 35 | hp,lc | Levrek:1000 g, Domates:200 g, Limon:100 g, ?Kuru soğan:100 g | Balıkları temizle, tepsiye koy. / Domates, soğan ve limon dilimleriyle kapla. / 200 derece fırında 25 dakika pişir. | 300,35,5,15
Hamsi tava | O,A | 25 | hp | Hamsi:1000 g, Mısır unu:100 g, ?Ayçiçek yağı:200 ml | Hamsileri temizle, mısır ununa bula. / Kızgın yağda iki yüzünü kızart. / Limon ve soğanla servis et. | 430,32,18,25
Kıymalı börek | O,A | 50 | hp | Yufka:1 paket, Dana kıyma:300 g, Kuru soğan:100 g, Yoğurt:150 g, Yumurta:1 adet | Kıymayı soğanla kavur. / Yufkaları yoğurtlu sosla yağlayıp kıymalı harçla diz. / 180 derece fırında 35 dakika pişir. | 480,22,45,23
"""

root = pathlib.Path(__file__).resolve().parent
catalog = json.loads((root / "urunler.json").read_text())
names = {i[0] for i in catalog["items"]}
recipes = []
for line in R.strip().splitlines():
    title, meals, minutes, tags, ings, steps, nut = [x.strip() for x in line.split("|")]
    ing = []
    for part in ings.split(","):
        part = part.strip()
        opt = part.startswith("?")
        name, amount = part.lstrip("?").split(":")
        qty, unit = amount.split(" ")
        assert name in names, f"{title}: '{name}' ürün listesinde yok"
        ing.append([name, float(qty) if "." in qty else int(qty), unit, 1 if opt else 0])
    recipes.append({
        "t": title, "m": meals.replace(" ", "").split(","), "d": int(minutes),
        "tags": [t for t in tags.split(",") if t], "i": ing,
        "s": [x.strip() for x in steps.split(" / ")], "n": [int(x) for x in nut.split(",")],
    })
assert len({r["t"] for r in recipes}) == len(recipes)
(root.parent / "mobile/src/tarifler.json").write_text(json.dumps(recipes, ensure_ascii=False, separators=(",", ":")))
print(len(recipes), "tarif:", sum("K" in r["m"] for r in recipes), "kahvaltı,", sum("O" in r["m"] for r in recipes), "öğle,", sum("A" in r["m"] for r in recipes), "akşam")
