# Uygulamaya gömülü tarifler (yapay zekâsız menü önerisi için): python3 catalog/tarifler.py -> mobile/src/tarifler.json
# Satır: Ad | öğünler (K=kahvaltı, O=öğle, A=akşam) | dakika | etiketler | malzemeler (4 kişilik) | adımlar
# (Eski satırların sonundaki elle yazılmış besin değerleri yok sayılır; değerler besin.json'dan hesaplanır.)
# Malzeme: "Ürün adı:miktar birim"; başında ? olan isteğe bağlıdır. Tuz, karabiber, su her evde var sayılır.
# Etiketler: v vejetaryen, vg vegan, hp yüksek protein, lc düşük karbonhidrat.
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
Pişi | K | 40 | v | Un:500 g, Kuru maya:1 paket, Süt:150 ml, ?Ayçiçek yağı:300 ml | Un, maya, ılık süt ve suyla yumuşak bir hamur yoğur, 30 dakika mayalandır. / Bezeler yapıp elle aç. / Kızgın yağda iki yüzünü kızart.
Simitli kahvaltı | K | 5 | v | Simit:4 adet, Beyaz peynir:150 g, Domates:200 g, Salatalık:200 g | Domates ve salatalığı dilimle. / Peynirle birlikte tabağa diz. / Simitle servis et.
Bal kaymak tabağı | K | 5 | v | Bal:80 g, Kaymak:150 g, Ekmek:1 adet | Bal ve kaymağı kâselere al. / Ekmeği dilimleyip kızart. / Birlikte servis et.
Tahin pekmez | K | 5 | vg | Tahin:80 g, Pekmez:120 g, Ekmek:1 adet | Tahin ve pekmezi bir kâsede karıştır. / Ekmeği dilimleyip kızart. / Bandırarak servis et.
Sebzeli omlet | K | 20 | v,lc | Yumurta:8 adet, Kapya biber:150 g, Kültür mantarı:150 g, Domates:150 g, ?Kaşar peyniri:60 g | Biber ve mantarı küçük doğrayıp sotele. / Domatesi ekleyip suyunu çektir. / Çırpılmış yumurtayı dök, kaşarı serpip pişir.
Pastırmalı yumurta | K | 15 | hp,lc | Yumurta:8 adet, Pastırma:100 g, ?Tereyağı:20 g | Pastırmayı tereyağında birkaç saniye çevir. / Yumurtaları üzerine kır. / Beyazı pişince ocaktan al.
Kavurmalı yumurta | K | 15 | hp,lc | Yumurta:8 adet, Kavurma:150 g | Kavurmayı tavada ısıt. / Yumurtaları üzerine kır. / Kapağı kapalı pişir.
Lorlu omlet | K | 15 | v,hp,lc | Yumurta:8 adet, Lor peyniri:200 g, ?Dereotu:1 demet, ?Tereyağı:20 g | Yumurtaları çırp, lor ve dereotunu ekle. / Tereyağlı tavaya dök. / İki yüzünü pişirip servis et.
Avokadolu yumurtalı tost | K | 15 | v | Avokado:2 adet, Yumurta:4 adet, Tam buğday ekmeği:0.5 adet, ?Limon:50 g | Ekmekleri kızart. / Avokadoyu limon ve tuzla ez, ekmeklere sür. / Haşlanmış ya da tavada pişmiş yumurtayı üzerine koy.
Granolalı yoğurt kasesi | K | 5 | v | Granola:200 g, Süzme yoğurt:500 g, Yaban mersini:125 g, ?Bal:30 g | Yoğurdu kâselere paylaştır. / Granola ve meyveyi ekle. / Balla tatlandır.
Yumurtalı kaşarlı pide | K | 20 | v | Pide:1 adet, Yumurta:4 adet, Kaşar peyniri:150 g | Pideyi ikiye bölüp kaşarı serp. / Ortasına yumurtaları kır. / 200 derece fırında 10 dakika pişir.
Peynirli gözleme | K,O | 30 | v | Yufka:1 paket, Beyaz peynir:250 g, ?Maydanoz:1 demet, ?Tereyağı:40 g | Yufkaları dörde katla, ortasına peynirli harcı koy. / Kenarlarını kapatıp yağsız tavada pişir. / Üzerine tereyağı sürüp servis et.
Acukalı kahvaltı tabağı | K | 5 | v | Acuka:150 g, Beyaz peynir:150 g, Siyah zeytin:100 g, Ekmek:1 adet | Acuka, peynir ve zeytini tabağa al. / Ekmeği dilimle. / Birlikte servis et.
Krep | K | 25 | v | Un:200 g, Süt:500 ml, Yumurta:2 adet, ?Bal:50 g | Un, süt ve yumurtayı pürüzsüz olana kadar çırp. / Az yağlı tavada ince ince pişir. / Bal ya da peynirle servis et.
Sahanda yumurta | K | 10 | v,lc | Yumurta:8 adet, Tereyağı:30 g | Tereyağını sahanda erit. / Yumurtaları kır. / Beyazı pişince ocaktan al.
Hellim ızgara | K | 10 | v,lc | Hellim:250 g, Domates:300 g, Salatalık:300 g | Hellimi dilimleyip yağsız tavada iki yüzünü kızart. / Domates ve salatalığı doğra. / Birlikte servis et.
Fıstık ezmeli muzlu tost | K | 10 | vg | Tam buğday ekmeği:0.5 adet, Fıstık ezmesi:80 g, Muz:300 g | Ekmekleri kızart. / Fıstık ezmesini sür. / Dilimlenmiş muzla servis et.
Muzlu yulaf smoothie | K | 5 | v | Yulaf ezmesi:80 g, Muz:300 g, Süt:600 ml, ?Bal:30 g | Tüm malzemeleri blendera al. / Pürüzsüz olana kadar çek. / Hemen servis et.
Mantar çorbası | O,A | 30 | v | Kültür mantarı:400 g, Un:40 g, Tereyağı:30 g, Süt:400 ml | Mantarı tereyağında sotele. / Unu ekleyip 2 dakika kavur. / Süt ve 600 ml suyu ekleyip 15 dakika pişir.
Brokoli çorbası | O,A | 30 | v | Brokoli:1 adet, Kuru soğan:100 g, Patates:200 g, ?Krema:100 ml | Soğanı kavur, brokoli ve patatesi ekle. / 1 litre suyla 20 dakika pişir. / Blenderdan geçirip kremayı ekle.
Sebze çorbası | O,A | 35 | vg | Havuç:150 g, Patates:200 g, Kabak:200 g, Kuru soğan:100 g, Domates salçası:20 g | Soğanı kavur, salçayı ekle. / Küp doğranmış sebzeleri ve 1,5 litre suyu ekle. / 25 dakika pişir, istersen blenderdan geçir.
Düğün çorbası | O,A | 90 | hp | Dana haşlamalık:400 g, Yoğurt:250 g, Un:40 g, Yumurta:1 adet, ?Limon:100 g | Eti 1,5 litre suda yumuşayana kadar haşla, didikle. / Yoğurt, un ve yumurtayı çırpıp ılıştırarak ekle. / Eti geri koy, limonla servis et.
İşkembe çorbası | A | 120 | hp | İşkembe:500 g, Un:40 g, Sarımsak:20 g, Tereyağı:30 g, ?Üzüm sirkesi:50 ml | İşkembeyi yumuşayana kadar haşla, doğra. / Unu tereyağında kavurup haşlama suyuyla aç. / İşkembeyi ekle, sarımsaklı sirkeyle servis et.
Bal kabağı çorbası | O,A | 35 | v | Bal kabağı:800 g, Kuru soğan:100 g, Havuç:100 g, ?Krema:100 ml | Soğanı kavur, kabak ve havucu ekle. / 1 litre suyla 25 dakika pişir. / Blenderdan geçirip kremayla servis et.
Şehriye çorbası | O,A | 20 | v | Arpa şehriye:120 g, Domates salçası:20 g, Tereyağı:20 g | Salçayı tereyağında kavur. / Şehriyeyi ekleyip 1 dakika çevir. / 1,2 litre suyla 10 dakika pişir.
Yeşil mercimek çorbası | O,A | 45 | vg | Yeşil mercimek:250 g, Kuru soğan:100 g, Havuç:100 g, Domates salçası:20 g | Soğan ve havucu kavur, salçayı ekle. / Mercimek ve 1,5 litre suyu ekle. / 35 dakika pişir.
Patates çorbası | O,A | 30 | v | Patates:600 g, Kuru soğan:100 g, Süt:300 ml, Tereyağı:20 g | Soğanı tereyağında kavur. / Patates ve 800 ml suyla 20 dakika pişir. / Sütü ekleyip blenderdan geçir.
Etli kuru fasulye | A | 100 | hp | Kuru fasulye:400 g, Dana kuşbaşı:250 g, Kuru soğan:150 g, Domates salçası:40 g | Fasulyeyi bir gece önceden ıslat. / Eti kavur, soğan ve salçayı ekle. / Fasulye ve sıcak suyla 70 dakika pişir.
Barbunya pilaki | O,A | 90 | vg | Barbunya:400 g, Havuç:150 g, Kuru soğan:150 g, Patates:200 g, Zeytinyağı:60 ml | Barbunyayı ıslatıp yarı yumuşayana kadar haşla. / Sebzeleri zeytinyağında çevir. / Barbunyayı ekleyip 30 dakika pişir; soğuk servis et.
Börülce salatası | O | 40 | vg | Börülce:300 g, Taze soğan:1 demet, Dereotu:1 demet, ?Limon:100 g, ?Zeytinyağı:40 ml | Börülceyi yumuşayana kadar haşla. / Doğranmış yeşilliklerle karıştır. / Limon ve zeytinyağıyla tatlandır.
Humus | O | 90 | vg | Nohut:300 g, Tahin:80 g, Sarımsak:10 g, Limon:100 g, ?Zeytinyağı:30 ml | Nohudu ıslatıp yumuşayana kadar haşla. / Tahin, sarımsak ve limonla blenderdan geçir. / Zeytinyağı gezdirip servis et.
Falafel | O,A | 40 | vg | Nohut:300 g, Kuru soğan:100 g, Maydanoz:1 demet, Sarımsak:10 g, ?Ayçiçek yağı:300 ml | Islatılmış çiğ nohudu soğan, maydanoz ve sarımsakla çek. / Küçük köfteler yap. / Kızgın yağda kızart.
Mercimek köftesi | O | 45 | vg | Kırmızı mercimek:250 g, Köftelik bulgur:200 g, Kuru soğan:150 g, Domates salçası:30 g, Taze soğan:1 demet, Maydanoz:1 demet | Mercimeği suyunu çekene kadar pişir, bulguru ekleyip demlendir. / Kavrulmuş soğan ve salçayı ekleyip yoğur. / Yeşillikleri katıp şekil ver.
Yeşil mercimek yemeği | A | 50 | vg | Yeşil mercimek:300 g, Kuru soğan:100 g, Domates salçası:30 g, ?Baldo pirinç:50 g | Soğanı kavur, salçayı ekle. / Mercimek ve sıcak suyu ekle. / 40 dakika pişir.
Bamya yemeği | O,A | 40 | vg | Bamya:500 g, Kuru soğan:100 g, Domates:300 g, ?Limon:100 g | Soğanı kavur, domatesi ekle. / Bamyayı ve limonu ekle. / Az suyla 25 dakika pişir.
Türlü | A | 60 | vg | Patlıcan:300 g, Kabak:300 g, Patates:300 g, Taze fasulye:200 g, Domates:300 g, Kuru soğan:150 g | Sebzeleri küp doğra. / Soğanı kavurup sebzeleri sırayla ekle. / Domates ve az suyla 40 dakika pişir.
Kabak yemeği | O,A | 35 | vg | Kabak:800 g, Kuru soğan:100 g, Domates:200 g, ?Baldo pirinç:50 g | Soğanı kavur, domatesi ekle. / Kabak ve pirinci ekle. / Az suyla 20 dakika pişir.
Yoğurtlu patlıcan kızartması | O | 35 | v | Patlıcan:800 g, Yoğurt:400 g, Sarımsak:10 g, ?Ayçiçek yağı:300 ml | Patlıcanları dilimleyip kızart. / Yoğurdu sarımsakla karıştır. / Patlıcanların üzerine dökerek servis et.
Şakşuka | O | 40 | vg | Patlıcan:600 g, Kabak:300 g, Domates:300 g, Sivri biber:150 g, Sarımsak:10 g | Patlıcan ve kabağı küp doğrayıp kızart. / Domates, biber ve sarımsakla sos yap. / Sosu sebzelere dök; soğuk servis et.
Zeytinyağlı enginar | O | 45 | vg | Enginar:6 adet, Havuç:150 g, Taze bezelye:200 g, Zeytinyağı:60 ml, Limon:100 g | Enginarları limonlu suda beklet. / Havuç ve bezelyeyle tencereye diz. / Zeytinyağı ve az suyla 30 dakika pişir.
Zeytinyağlı biber dolması | O,A | 60 | vg | Dolmalık biber:600 g, Baldo pirinç:250 g, Kuru soğan:200 g, Zeytinyağı:80 ml, ?Kuru nane:3 g | Soğanı zeytinyağında kavur, pirinci ekle. / Biberleri iç harçla doldur. / Az suyla 40 dakika pişir; soğuk servis et.
Etli biber dolması | A | 60 | hp | Dolmalık biber:600 g, Dana kıyma:300 g, Baldo pirinç:150 g, Kuru soğan:100 g, Domates salçası:30 g | Kıyma, pirinç, soğan ve salçayı yoğur. / Biberleri doldur. / Salçalı suyla 40 dakika pişir.
Kabak dolması | A | 60 | hp | Kabak:800 g, Dana kıyma:250 g, Baldo pirinç:150 g, Domates:200 g | Kabakların içini oy. / Kıyma, pirinç ve domatesle doldur. / Az suyla 40 dakika pişir.
Patates oturtma | A | 60 | hp | Patates:800 g, Dana kıyma:300 g, Kuru soğan:100 g, Domates:300 g | Patatesleri dilimleyip kızart ya da fırınla. / Kıymayı soğan ve domatesle kavur. / Patateslerin üzerine kıymayı koyup 20 dakika fırınla.
Tas kebabı | A | 80 | hp,lc | Dana kuşbaşı:600 g, Kuru soğan:200 g, Domates salçası:30 g, ?Patates:300 g | Eti suyunu çekene kadar kavur. / Soğan ve salçayı ekle. / Sıcak suyla 60 dakika pişir.
Orman kebabı | A | 80 | hp | Kuzu kuşbaşı:600 g, Patates:300 g, Havuç:150 g, Taze bezelye:150 g, Kuru soğan:150 g | Eti kavur, soğanı ekle. / Sıcak suyla 40 dakika pişir. / Sebzeleri ekleyip 25 dakika daha pişir.
Kuzu incik | A | 120 | hp,lc | Kuzu incik:1000 g, Kuru soğan:150 g, Domates:300 g, ?Patates:400 g | İncikleri her yüzü kızarana kadar mühürle. / Soğan, domates ve sıcak suyu ekle. / Kısık ateşte ya da fırında 90 dakika pişir.
Kuzu pirzola | A | 25 | hp,lc | Kuzu pirzola:800 g, ?Kuru kekik:3 g, ?Domates:200 g | Pirzolaları kekik ve tuzla tatlandır. / Izgarada ya da döküm tavada her yüzünü 4 dakika pişir. / Közlenmiş domatesle servis et.
Dana biftek | A | 25 | hp,lc | Dana biftek:600 g, ?Tereyağı:30 g, ?Patates:500 g | Eti oda sıcaklığına getir. / Kızgın tavada her yüzünü 3-4 dakika pişir, tereyağı ekle. / 5 dakika dinlendirip servis et.
Kasap köfte ızgara | A | 25 | hp,lc | Kasap köfte:600 g, Sivri biber:150 g, Domates:200 g | Köfteleri şekillendir. / Biber ve domatesle birlikte ızgarada pişir. / Sıcak servis et.
İzmir köfte | A | 60 | hp | Dana kıyma:500 g, Patates:500 g, Sivri biber:150 g, Domates:300 g, Domates salçası:20 g | Köfteleri yapıp hafifçe kızart. / Patates, biber ve domatesle tepsiye diz. / Salçalı suyla 200 derecede 35 dakika pişir.
Sulu köfte | A | 50 | hp | Dana kıyma:400 g, Baldo pirinç:60 g, Patates:300 g, Havuç:100 g, Domates salçası:30 g | Kıyma ve pirinçle küçük köfteler yap. / Salçalı suyu kaynat, sebzeleri ekle. / Köfteleri ekleyip 25 dakika pişir.
Kadınbudu köfte | A | 50 | hp | Dana kıyma:500 g, Baldo pirinç:100 g, Yumurta:2 adet, Un:50 g, ?Ayçiçek yağı:200 ml | Kıymanın yarısını kavur, haşlanmış pirinç ve çiğ kıymayla yoğur. / Köfteleri una ve yumurtaya bula. / Kızgın yağda kızart.
Ev yapımı hamburger | O,A | 25 | hp | Hamburger köftesi:500 g, Hamburger ekmeği:1 paket, Marul:1 adet, Domates:200 g, ?Cheddar:100 g | Köfteleri tavada her yüzü 4 dakika pişir, cheddarı üzerine koy. / Ekmekleri kızart. / Marul ve domatesle birleştir.
Kıymalı pide | O,A | 40 | hp | Pide:2 adet, Dana kıyma:300 g, Kuru soğan:100 g, Domates:200 g, Sivri biber:100 g | Kıymayı ince doğranmış sebzelerle karıştır. / Pidelerin üzerine yay. / 220 derece fırında 12 dakika pişir.
Tavuk şinitzel | A | 35 | hp | Tavuk göğsü:600 g, Galeta unu:150 g, Yumurta:2 adet, Un:60 g, ?Ayçiçek yağı:300 ml | Tavuğu inceltip una, yumurtaya ve galeta ununa bula. / Kızgın yağda iki yüzünü kızart. / Limonla servis et.
Tavuk dürüm | O,A | 30 | hp | Tavuk göğsü:500 g, Kapya biber:200 g, Kuru soğan:150 g, Lavaş:1 paket, ?Yoğurt:150 g | Tavuğu şerit doğrayıp sotele. / Biber ve soğanı ekle. / Lavaşlara yoğurtla sarıp servis et.
Tavuk güveç | A | 60 | hp | Tavuk but:800 g, Patates:300 g, Kapya biber:200 g, Domates:300 g, Kuru soğan:150 g | Tavuk ve sebzeleri doğrayıp güvece al. / Baharat ve az suyla harmanla. / 200 derece fırında 45 dakika pişir.
Fırında bütün tavuk | A | 90 | hp | Bütün tavuk:1 adet, Patates:600 g, ?Limon:100 g | Tavuğu yağ ve baharatla ov, içine limon koy. / Patateslerle tepsiye yerleştir. / 190 derece fırında 75 dakika pişir.
Tavuk ciğer sote | O,A | 20 | hp,lc | Tavuk ciğer:500 g, Kuru soğan:150 g, Sivri biber:100 g | Ciğerleri temizleyip doğra. / Soğan ve biberle yüksek ateşte sotele. / Sıcak servis et.
Arnavut ciğeri | O,A | 25 | hp | Dana ciğer:500 g, Un:50 g, Kırmızı soğan:200 g, ?Ayçiçek yağı:200 ml, ?Maydanoz:1 demet | Ciğeri küp doğrayıp una bula. / Kızgın yağda kızart. / Sumaklı soğan ve maydanozla servis et.
Izgara hindi göğsü | A | 30 | hp,lc | Hindi göğsü:600 g, ?Yoğurt:150 g, ?Kuru kekik:3 g | Hindiyi yoğurt ve baharatla marine et. / Izgarada her yüzünü 6-7 dakika pişir. / Dinlendirip dilimle.
Hindi köfte | A | 30 | hp,lc | Hindi kıyma:500 g, Kuru soğan:100 g, Yumurta:1 adet | Kıymayı soğan ve yumurtayla yoğur. / Köfte şekli ver. / Tavada ya da fırında pişir.
Tavuklu sebze sote | A | 25 | hp,lc | Tavuk göğsü:500 g, Brokoli:1 adet, Havuç:150 g, Kapya biber:150 g, Soya sosu:40 ml | Tavuğu yüksek ateşte sotele. / Sebzeleri ekleyip 5 dakika çevir. / Soya sosuyla tatlandır.
Kremalı tavuklu makarna | A | 30 | hp | Penne makarna:500 g, Tavuk göğsü:400 g, Krema:200 ml, Kültür mantarı:200 g | Makarnayı haşla. / Tavuk ve mantarı sotele, kremayı ekle. / Makarnayla karıştır.
Fırın makarna | A | 50 | v | Makarna:500 g, Süt:500 ml, Yumurta:2 adet, Kaşar peyniri:150 g, Tereyağı:30 g | Makarnayı haşla. / Süt, yumurta ve eritilmiş tereyağıyla karıştırıp tepsiye al. / Kaşarı serpip 180 derecede 30 dakika pişir.
Pesto soslu makarna | O,A | 20 | v | Spagetti:500 g, Pesto sos:190 g, ?Parmesan:50 g | Makarnayı haşla. / Pesto sosla karıştır. / Parmesanla servis et.
Ton balıklı makarna | O,A | 25 | hp | Makarna:500 g, Ton balığı:2 kutu, Domates:300 g, ?Mısır konservesi:1 kutu | Makarnayı haşla. / Domatesi sos haline getir, ton balığını ekle. / Makarnayla karıştır.
Sebzeli erişte | O,A | 25 | vg | Erişte:500 g, Kabak:200 g, Havuç:150 g, Kapya biber:150 g, Soya sosu:40 ml | Erişteyi haşla. / Sebzeleri yüksek ateşte sotele. / Erişte ve soya sosuyla karıştır.
Peynirli erişte | O,A | 20 | v | Erişte:500 g, Lor peyniri:200 g, Tereyağı:40 g | Erişteyi haşla. / Tereyağında çevir. / Lor peyniriyle servis et.
Kuskus salatası | O | 20 | vg | Kuskus:300 g, Domates:200 g, Salatalık:200 g, Maydanoz:1 demet, ?Limon:100 g | Kuskusu sıcak suyla 10 dakika demle. / Doğranmış sebze ve maydanozu ekle. / Limon ve zeytinyağıyla karıştır.
Kinoa salatası | O | 25 | vg | Kinoa:250 g, Cherry domates:250 g, Salatalık:200 g, Roka:1 demet, ?Limon:100 g | Kinoayı 15 dakika haşla, soğut. / Sebze ve rokayla karıştır. / Limon ve zeytinyağıyla tatlandır.
Domatesli pilav | O,A | 30 | v | Baldo pirinç:400 g, Domates:300 g, Tereyağı:30 g | Rendelenmiş domatesi tereyağında pişir. / Pirinci ekleyip kavur. / Sıcak suyla 15 dakika demle.
Nohutlu pilav | O,A | 30 | v | Baldo pirinç:400 g, Haşlanmış nohut:1 kutu, Tereyağı:40 g | Pirinci tereyağında kavur. / Nohudu ekle. / Sıcak suyla 15 dakika demle.
Sebzeli bulgur pilavı | O,A | 30 | vg | Pilavlık bulgur:400 g, Kapya biber:150 g, Havuç:100 g, Kuru soğan:100 g, Domates salçası:20 g | Sebzeleri kavur, salçayı ekle. / Bulguru ekleyip çevir. / Sıcak suyla 15 dakika demle.
Mantarlı risotto | A | 35 | v | Baldo pirinç:350 g, Kültür mantarı:300 g, Tereyağı:40 g, Parmesan:60 g | Mantarı tereyağında sotele. / Pirinci ekleyip sıcak suyu azar azar ekleyerek 20 dakika pişir. / Parmesanla bağla.
Fırında patates | O,A | 45 | vg | Patates:1000 g, Zeytinyağı:50 ml, ?Kuru kekik:3 g | Patatesleri elma dilim kes. / Zeytinyağı ve baharatla harmanla. / 200 derece fırında 35 dakika pişir.
Patates püresi | O,A | 30 | v | Patates:1000 g, Süt:200 ml, Tereyağı:50 g | Patatesleri haşla. / Ilık süt ve tereyağıyla ez. / Tuzla tatlandır.
Patates köftesi | O,A | 40 | v | Patates:800 g, Yumurta:2 adet, Kaşar peyniri:100 g, Galeta unu:100 g | Haşlanmış patatesi ezip yumurta ve kaşarla yoğur. / Köfte yapıp galeta ununa bula. / Fırında ya da tavada kızart.
Sigara böreği | O | 30 | v | Yufka:1 paket, Beyaz peynir:250 g, Maydanoz:1 demet, ?Ayçiçek yağı:300 ml | Yufkaları üçgen kes. / Peynirli harcı koyup sar. / Kızgın yağda kızart.
Ispanaklı börek | O,A | 50 | v | Yufka:1 paket, Ispanak:500 g, Beyaz peynir:200 g, Yumurta:2 adet, Süt:200 ml | Ispanağı soğanla kavurup peynirle karıştır. / Yufkaları sosla kat kat diz. / 180 derece fırında 35 dakika pişir.
Patatesli börek | O,A | 50 | v | Yufka:1 paket, Patates:500 g, Kuru soğan:100 g, Yumurta:2 adet, Süt:200 ml | Patatesi haşlayıp kavrulmuş soğanla ez. / Yufkalara sürüp rulo yap. / 180 derece fırında 35 dakika pişir.
Zeytinyağlı ıspanak | O,A | 30 | v | Ispanak:1000 g, Kuru soğan:150 g, Baldo pirinç:50 g, ?Yoğurt:300 g | Soğanı kavur. / Ispanak ve pirinci ekle. / 15 dakika pişir, yoğurtla servis et.
Fırında karnabahar | O,A | 40 | v | Karnabahar:1 adet, Zeytinyağı:40 ml, ?Yoğurt:300 g | Karnabaharı çiçeklerine ayır. / Zeytinyağı ve baharatla harmanla. / 200 derece fırında 30 dakika pişir, yoğurtla servis et.
Mevsim salata | O,A | 10 | vg,lc | Marul:1 adet, Roka:1 demet, Domates:200 g, Salatalık:200 g, Havuç:100 g, ?Limon:100 g | Yeşillikleri doğra. / Domates, salatalık ve rendelenmiş havucu ekle. / Limon ve zeytinyağıyla karıştır.
Gavurdağı salatası | O,A | 15 | vg | Domates:400 g, Kırmızı soğan:100 g, Ceviz içi:60 g, Maydanoz:1 demet, Nar ekşisi:30 ml | Domates ve soğanı küçük doğra. / Ceviz ve maydanozu ekle. / Nar ekşisi ve zeytinyağıyla karıştır.
Piyaz | O | 20 | v | Kuru fasulye:250 g, Kırmızı soğan:150 g, Maydanoz:1 demet, ?Limon:100 g, ?Yumurta:2 adet | Fasulyeyi ıslatıp haşla. / Sumaklı soğan ve maydanozla karıştır. / Limon, zeytinyağı ve haşlanmış yumurtayla servis et.
Cacık | O,A | 10 | v,lc | Yoğurt:500 g, Salatalık:300 g, Sarımsak:10 g, ?Kuru nane:3 g | Salatalığı rendele ya da doğra. / Sarımsaklı yoğurt ve suyla karıştır. / Nane serpip servis et.
Haydari | O | 10 | v,lc | Süzme yoğurt:500 g, Dereotu:1 demet, Sarımsak:10 g | Dereotunu ince doğra. / Yoğurt ve ezilmiş sarımsakla karıştır. / Zeytinyağı gezdirip servis et.
Tavuklu salata | O | 25 | hp,lc | Tavuk göğsü:400 g, Marul:1 adet, Mısır konservesi:1 kutu, Domates:200 g, ?Yoğurt:150 g | Tavuğu haşla ya da ızgara yap, doğra. / Marul, mısır ve domatesle karıştır. / Yoğurtlu sosla servis et.
Hellimli salata | O | 15 | v,lc | Hellim:250 g, Roka:1 demet, Cherry domates:250 g, ?Zeytinyağı:30 ml | Hellimi tavada kızart. / Roka ve domatesle karıştır. / Zeytinyağıyla servis et.
Çipura ızgara | A | 25 | hp,lc | Çipura:1000 g, Limon:100 g, ?Roka:1 demet | Balıkları temizleyip tuzla. / Izgarada her yüzünü 6-7 dakika pişir. / Roka ve limonla servis et.
Fırında palamut | A | 35 | hp,lc | Palamut:1000 g, Kuru soğan:150 g, Domates:200 g | Balıkları dilimle. / Soğan ve domatesle tepsiye diz. / 200 derece fırında 25 dakika pişir.
Uskumru ızgara | A | 25 | hp,lc | Uskumru:1000 g, Limon:100 g | Balıkları temizle. / Izgarada her yüzünü 5-6 dakika pişir. / Limonla servis et.
Karides güveç | A | 30 | hp,lc | Karides:500 g, Kapya biber:150 g, Domates:300 g, Kaşar peyniri:100 g, Sarımsak:10 g | Karidesleri sarımsakla çevir. / Biber ve domatesi ekleyip güvece al. / Kaşarı serpip 200 derecede 15 dakika pişir.
Kalamar tava | A | 25 | hp | Kalamar:500 g, Un:80 g, ?Ayçiçek yağı:300 ml | Kalamarı halka kes. / Una bula. / Kızgın yağda kısa sürede kızart.
Alabalık ızgara | A | 25 | hp,lc | Alabalık:1000 g, Limon:100 g | Balıkları temizleyip tuzla. / Izgarada ya da tavada her yüzünü 5 dakika pişir. / Limonla servis et.
Mantar sote | O,A | 20 | v,lc | Kültür mantarı:600 g, Tereyağı:30 g, Sivri biber:100 g | Mantarları dilimle. / Tereyağında yüksek ateşte sotele. / Biberi ekleyip 3 dakika daha pişir.
Etli nohut | A | 90 | hp | Nohut:350 g, Dana kuşbaşı:250 g, Kuru soğan:150 g, Domates salçası:40 g | Nohudu ıslat. / Eti kavur, soğan ve salçayı ekle. / Nohut ve sıcak suyla 60 dakika pişir.
Zeytinyağlı bezelye | O,A | 35 | vg | Dondurulmuş bezelye:450 g, Havuç:150 g, Patates:200 g, Kuru soğan:100 g, Zeytinyağı:50 ml | Soğanı zeytinyağında kavur. / Havuç, patates ve bezelyeyi ekle. / Az suyla 25 dakika pişir.
Kıymalı patates | A | 45 | hp | Patates:800 g, Dana kıyma:300 g, Kuru soğan:150 g, Sarımsak:10 g, Domates salçası:20 g, Biber salçası:20 g, Sivri biber:100 g, ?Pul biber:5 g, ?Kimyon:3 g, ?Maydanoz:1 demet | Patatesleri küp doğrayıp suda beklet, nişastasını al ve iyice kurula. / Patatesleri az yağda, kenarları kızarana kadar 8-10 dakika kavurup bir kenara al. / Aynı tencerede kıymayı yüksek ateşte suyunu çekip kızarana kadar kavur. / Soğan, sarımsak ve biberi ekleyip soğan yumuşayana kadar pişir. / Salçaları, pul biberi ve kimyonu ekleyip 2 dakika kavur; salça kokusu çıksın. / Patatesleri ve 1,5 su bardağı sıcak suyu ekle, kapağı kapalı kısık ateşte 20 dakika patatesler yumuşayana kadar pişir. / Doğranmış maydanozla servis et.
Mercimekli bulgur pilavı | O,A | 40 | v | Pilavlık bulgur:300 g, Yeşil mercimek:150 g, Kuru soğan:150 g, Tereyağı:30 g | Mercimeği yarı yumuşayana kadar haşla. / Soğanı kavurup bulgur ve mercimeği ekle. / Sıcak suyla 15 dakika demle.
"""

# Zorluk: 1 basit (varsayılan), 2 orta, 3 kompleks. Kompleks tarifler aşağıdaki K bloğunda, adımları ve püf noktasıyla.
ORTA = """Mıhlama; Peynirli börek; Ezogelin çorbası; Yayla çorbası; Fırında tavuk baget ve patates; Tavuklu pilav; Fırında köfte patates;
Karnıyarık; Patlıcan musakka; İmam bayıldı; Etli bezelye; Kuru fasulye; Nohut yemeği; Zeytinyağlı taze fasulye; Zeytinyağlı pırasa;
Kabak mücveri; Kısır; Kıymalı börek; Pişi; Peynirli gözleme; Krep; Düğün çorbası; İşkembe çorbası; Etli kuru fasulye; Barbunya pilaki;
Humus; Falafel; Mercimek köftesi; Türlü; Şakşuka; Zeytinyağlı enginar; Zeytinyağlı biber dolması; Etli biber dolması; Kabak dolması;
Patates oturtma; Tas kebabı; Orman kebabı; Kuzu incik; İzmir köfte; Sulu köfte; Kadınbudu köfte; Kıymalı pide; Tavuk şinitzel;
Tavuk güveç; Fırında bütün tavuk; Arnavut ciğeri; Kremalı tavuklu makarna; Fırın makarna; Mantarlı risotto; Patates köftesi;
Sigara böreği; Ispanaklı börek; Patatesli börek; Piyaz; Karides güveç; Kalamar tava; Etli nohut; Hamsi tava; Kıymalı patates"""
KOMPLEKS: set[str] = set()  # kompleks tarifler kompleks.txt dosyasında
root = pathlib.Path(__file__).resolve().parent
K = (pathlib.Path(__file__).resolve().parent / "kompleks.txt").read_text()
catalog = json.loads((root / "urunler.json").read_text())
names = {i[0] for i in catalog["items"]}
recipes = []
orta = {x.strip() for x in ORTA.replace("\n", " ").split(";")}
lines = [(l, None) for l in R.strip().splitlines()] + [(l, 3) for l in K.strip().splitlines()]
for line, level in lines:
    cols = [x.strip() for x in line.split("|")]
    title, meals, minutes, tags, ings, steps = cols[:6]
    tip = cols[6] if level == 3 and len(cols) > 6 else None
    z = level or (3 if title in KOMPLEKS else 2 if title in orta else 1)
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
        "s": [x.strip() for x in steps.split(" / ")], "z": z, **({"p": tip} if tip else {}),
    })
assert len({r["t"] for r in recipes}) == len(recipes)
assert orta <= {r["t"] for r in recipes}, orta - {r["t"] for r in recipes}

# Besin değerleri: besin.json (USDA SR28) üzerinden malzeme gramajlarından hesaplanır, kişi başı (4 kişilik tarif).
besin = json.loads((root / "besin.json").read_text())
FRY_ABSORB = 0.15  # derin yağda kızartmada (150 ml ve üstü yağ) yemeğe geçen yağ payı
def grams(name, qty, unit):
    b = besin[name]
    if unit == "g": return qty * b.get("edible", 1.0)
    if unit == "ml":
        g = qty * b.get("density", 1.0)
        return g * FRY_ABSORB if name in ("Ayçiçek yağı", "Zeytinyağı") and qty >= 150 else g
    assert "unitGrams" in b, f"{name}: {unit} için gram karşılığı yok"
    return qty * b["unitGrams"]
for r in recipes:
    tot = {"kcal": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}
    for name, qty, unit, _ in r["i"]:
        assert name in besin, f"{r['t']}: '{name}' için besin değeri yok (catalog/besin.py)"
        g = grams(name, qty, unit)
        for k in tot: tot[k] += besin[name][k] * g / 100
    r["n"] = [round(tot["kcal"] / 4), round(tot["protein"] / 4), round(tot["carbs"] / 4), round(tot["fat"] / 4)]
    r["na"] = any(besin[name]["approx"] for name, *_ in r["i"])  # en az bir malzeme yaklaşık değerli
(root.parent / "mobile/src/tarifler.json").write_text(json.dumps(recipes, ensure_ascii=False, separators=(",", ":")))
print(len(recipes), "tarif (basit/orta/kompleks:", *[sum(r["z"] == z for r in recipes) for z in (1, 2, 3)], "):", sum("K" in r["m"] for r in recipes), "kahvaltı,", sum("O" in r["m"] for r in recipes), "öğle,", sum("A" in r["m"] for r in recipes), "akşam")
