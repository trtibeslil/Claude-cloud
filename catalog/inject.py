# Kataloğu web sürümüne gömer: python3 catalog/inject.py
# (Mobil uygulama urunler.json dosyasını doğrudan içe aktarır.)
import json, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((root / "catalog/urunler.json").read_text())
page = root / "dolap-defteri/index.html"
s = page.read_text()
new = "/*CATALOG*/const CATALOG = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";/*/CATALOG*/"
s, n = re.subn(r"/\*CATALOG\*/.*?/\*/CATALOG\*/", lambda m: new, s, flags=re.S)
assert n == 1, "işaretler bulunamadı"
page.write_text(s)
print("katalog gömüldü:", len(data["items"]), "ürün")
