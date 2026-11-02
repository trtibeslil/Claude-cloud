# Mobil uygulamanın claude.ai önizlemesini tek HTML dosyası olarak üretir.
# Kullanım (mobile/ içinde): npx expo export --platform web --output-dir <dışa_aktarım>
#                            python3 scripts/build-preview.py <dışa_aktarım> <çıktı.html>
# Simge yazı tipi sayfaya gömülür; scripts/preview-storage.js veriyi kullanıcının hesabına yazar
# (yayınlarken capabilities: {"db": {}, "user": {}}).
import base64, glob, pathlib, sys

export, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
js = open(glob.glob(str(export / "_expo/static/js/web/*.js"))[0]).read()
for font in glob.glob(str(export / "assets/**/*.ttf"), recursive=True):
    url = font.split(str(export))[1]
    js = js.replace('"' + url + '"', '"data:font/ttf;base64,' + base64.b64encode(open(font, "rb").read()).decode() + '"')
js = js.replace("</script", "<\\/script")
storage = (pathlib.Path(__file__).parent / "preview-storage.js").read_text()
out.write_text(f"""<title>Dolap Defteri Mobil</title>
<style>
/* Mobil uygulamanın (Expo / React Native) tarayıcı önizlemesi; görünüm ve renkler uygulamanın kendisinden gelir. */
:root {{ --bg: #FFF6F0; }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg: #15100D; color-scheme: dark; }} }}
:root[data-theme="dark"] {{ --bg: #15100D; color-scheme: dark; }}
html, body {{ height: 100%; }}
body {{ overflow: hidden; background: var(--bg); }}
#root {{ display: flex; height: 100%; flex: 1; max-width: 520px; margin: 0 auto; }}
</style>
<div id="root"></div>
<script>
{storage}
</script>
<script>
{js}
</script>
""")
print(out, round(out.stat().st_size / 1e6, 2), "MB")
