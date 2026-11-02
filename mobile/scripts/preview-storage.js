// Tarayıcı önizlemesi için depolama: uygulama verisini claude.ai hesabındaki gizli kayda (data/users/<id>/mobil) yazar.
// Önizleme her güncellendiğinde tarayıcı hafızası sıfırlanabilir; hesap kaydı kalır. Hesaba ulaşılamazsa tarayıcı hafızası kullanılır.
window.__dolapStorage = (function () {
  var ls = null;
  try { ls = window.localStorage; } catch (e) {}
  var refPromise = null, timer = null, pending = null, writing = Promise.resolve();
  function ref() {
    if (!refPromise) {
      refPromise = (async function () {
        if (!window.claude || !window.claude.use) return null;
        var both = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        var id = both[1] ? await both[1].id() : null;
        return both[0] && id ? both[0].doc('data/users/' + id + '/mobil') : null;
      })().catch(function () { return null; });
    }
    return refPromise;
  }
  function withTimeout(p, ms) { return Promise.race([p, new Promise(function (r) { setTimeout(function () { r(null); }, ms); })]); }
  return {
    getItem: async function (k) {
      var local = null;
      try { local = ls && ls.getItem(k); } catch (e) {}
      var r = await withTimeout(ref(), 8000);
      if (!r) return local;
      try {
        var snap = await r.get();
        var d = snap.exists ? snap.data() : null;
        if (d && typeof d.json === 'string') return d.json; // hesap kaydı esas
        if (local) await r.set({ json: local, at: Date.now() }); // ilk açılış: tarayıcıdakini hesaba taşı
        return local;
      } catch (e) { return local; }
    },
    setItem: async function (k, v) {
      try { if (ls) ls.setItem(k, v); } catch (e) {}
      pending = v;
      clearTimeout(timer);
      // Art arda değişiklikler tek yazmada birleşir; aynı kayda aynı anda tek yazma yapılır.
      timer = setTimeout(function () {
        var value = pending;
        writing = writing.then(async function () {
          var r = await ref();
          if (r) await r.set({ json: value, at: Date.now() });
        }).catch(function () {});
      }, 500);
    },
  };
})();
