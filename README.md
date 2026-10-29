# Dolap Defteri

Evdeki yiyecekleri takip eden ve onlarla yemek öneren, yapay zekâ destekli mobil web uygulaması.

## Ne yapar?

- **Dolap:** Evdeki malzemeleri kategorilere göre listeler, elle düzenleme ve silme yapılabilir.
- **Ekle:** Malzemeleri serbest metinle yazabilirsin ("makarna 500 gr, domates 1 kg…") ya da market fişinin fotoğrafını veya online siparişin ekran görüntüsünü yükleyebilirsin. Claude bunları okuyup listeye çevirir, sen onaylarsın.
- **Menü:** Kişi sayısı, gün sayısı (1–7) ve öğünlere (kahvaltı, öğle, akşam) göre her öğün için 2 seçenek önerir. Dolapta olmayan malzemeler "Eksik" olarak işaretlenir.
- **Bunu yapıyorum:** Kaç kişilik yaptığını sorar, kullanılan miktarları hesaplar (istersen düzeltirsin) ve dolaptan düşer. Biten malzemeler dolaptan çıkar ve sonraki menülerde kullanılmaz.
- **Geçmiş:** Yapılan yemekler listelenir; "Geri al" malzemeleri dolaba geri koyar.

## Nasıl çalışır?

Uygulama tek bir dosyadır: `dolap-defteri/index.html`. claude.ai üzerinde bir Artifact olarak yayınlanır:

- Claude çağrıları (metin/fiş okuma, menü, tarif) `sample` yeteneğiyle, kullanıcının kendi Claude hesabı üzerinden yapılır. API anahtarı gerekmez.
- Veriler kullanıcıya özel olarak `db` yeteneğinde (`data/users/<id>/kitchen`) saklanır. Telefon ve bilgisayar aynı veriyi görür.
- Claude dışında açılırsa veriler tarayıcıda (localStorage) tutulur ve yapay zekâ özellikleri kapanır.
