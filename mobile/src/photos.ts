// Yemek fotoğrafları: Türkçe Vikipedi'deki yemek maddesinin ana görseli, yalnızca Wikimedia Commons'ta
// özgür lisanslı olanlar (fotoğrafçı ve lisans gösterilir). Telefonda internetten çekilir ve saklanır.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { fold } from './ocr/match';
import { isFoodPage, isPhotoFile } from './photoMatch';

export type Photo = { url: string; width: number; height: number; artist: string; license: string; page: string };

const CACHE_KEY = 'dolap-foto-v1';
const MISS_TTL = 7 * 24 * 3600 * 1000; // bulunamayanları bir hafta sonra yeniden dene
const HEADERS = { 'Api-User-Agent': 'DolapDefteri/1.0 (kisisel mutfak uygulamasi)' };
const WIKI = 'https://tr.wikipedia.org/w/api.php';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';

const strip = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();

async function getJson(base: string, params: Record<string, string>) {
  const q = new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params });
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const res = await fetch(`${base}?${q}`, { headers: HEADERS, signal: ctl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally { clearTimeout(timer); }
}

type WikiPage = { title: string; index?: number; missing?: boolean; pageimage?: string; categories?: { title: string }[] };

/** Aday sayfalar: önce "X (yemek)" ve "X", sonra arama sonuçları. */
async function candidates(title: string): Promise<WikiPage[]> {
  const props = { prop: 'pageimages|categories', piprop: 'name', cllimit: 'max', clshow: '!hidden', redirects: '1' };
  const exact = await getJson(WIKI, { action: 'query', titles: `${title} (yemek)|${title}`, ...props });
  const pages: WikiPage[] = (exact?.query?.pages ?? []).filter((p: WikiPage) => !p.missing);
  const order = [`${title} (yemek)`, title].map(fold);
  pages.sort((a, b) => order.indexOf(fold(a.title)) - order.indexOf(fold(b.title)));
  const found = await getJson(WIKI, { action: 'query', generator: 'search', gsrsearch: `${title} yemek`, gsrlimit: '5', ...props });
  const searched: WikiPage[] = (found?.query?.pages ?? []).sort((a: WikiPage, b: WikiPage) => (a.index ?? 0) - (b.index ?? 0));
  // Arama sonucunun başlığı tarif adının kelimelerini içermeli (alakasız yemek gelmesin)
  const words = fold(title).split(' ').filter(w => w.length > 2);
  return [...pages, ...searched.filter(p => words.some(w => fold(p.title).includes(w.slice(0, Math.max(4, w.length - 2)))))];
}

async function commonsInfo(file: string): Promise<Photo | null> {
  const data = await getJson(COMMONS, { action: 'query', titles: 'File:' + file, prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '900' });
  const page = data?.query?.pages?.[0];
  const info = page?.imageinfo?.[0];
  if (!info || page.missing) return null; // Commons'ta değilse (yerel, adil kullanım görseli) kullanma
  const meta = info.extmetadata ?? {};
  const license = strip(meta.LicenseShortName?.value ?? '');
  if (!license || /fair use|non-free/i.test(license)) return null;
  return {
    url: info.thumburl || info.url, width: info.thumbwidth || info.width, height: info.thumbheight || info.height,
    artist: strip(meta.Artist?.value ?? '') || 'Wikimedia Commons', license, page: info.descriptionurl,
  };
}

async function lookup(title: string): Promise<Photo | null> {
  for (const p of await candidates(title)) {
    if (!p.pageimage || !isPhotoFile(p.pageimage) || !isFoodPage((p.categories ?? []).map(c => c.title))) continue;
    const photo = await commonsInfo(p.pageimage);
    if (photo) return photo;
  }
  return null;
}

/* ---------- önbellek ve sıra ---------- */
type Entry = { p: Photo | null; at: number };
let cache: Record<string, Entry> | null = null;
let loading: Promise<Record<string, Entry>> | null = null;
const inflight = new Map<string, Promise<Photo | null>>();
const listeners = new Map<string, Set<(p: Photo | null) => void>>();

async function loadCache() {
  if (cache) return cache;
  loading ??= AsyncStorage.getItem(CACHE_KEY).then(raw => (cache = raw ? JSON.parse(raw) : {})).catch(() => (cache = {}));
  return loading;
}
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const saveCache = () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache ?? {})).catch(() => {}); }, 500);
};

// Aynı anda en fazla 2 arama: menüde çok kart açılınca Vikipedi'ye yüklenmeyelim
let running = 0;
const queue: (() => void)[] = [];
async function limited<T>(fn: () => Promise<T>) {
  if (running >= 2) await new Promise<void>(r => queue.push(r));
  running++;
  try { return await fn(); } finally { running--; queue.shift()?.(); }
}

export function cachedPhoto(title: string): Photo | null | undefined {
  const e = cache?.[fold(title)];
  return e && (e.p || Date.now() - e.at < MISS_TTL) ? e.p : undefined;
}

export async function findPhoto(title: string): Promise<Photo | null> {
  const key = fold(title);
  const c = await loadCache();
  const e = c[key];
  if (e && (e.p || Date.now() - e.at < MISS_TTL)) return e.p;
  let job = inflight.get(key);
  if (!job) {
    job = limited(() => lookup(title))
      .then(p => { c[key] = { p, at: Date.now() }; saveCache(); return p; })
      .catch(() => null) // ağ hatası: önbelleğe yazma, sonra yeniden dene
      .finally(() => inflight.delete(key));
    inflight.set(key, job);
  }
  return job;
}

/** Fotoğraf yanlışsa kullanıcı gizleyebilir; bir daha aranmaz. */
export async function hidePhoto(title: string) {
  const c = await loadCache();
  c[fold(title)] = { p: null, at: Date.now() + 100 * 365 * 24 * 3600 * 1000 };
  saveCache();
  listeners.get(fold(title))?.forEach(f => f(null));
}

/** undefined: aranıyor, null: yok. */
export function usePhoto(title: string, enabled: boolean): Photo | null | undefined {
  const [photo, setPhoto] = useState<Photo | null | undefined>(() => (enabled ? cachedPhoto(title) : null));
  useEffect(() => {
    if (!enabled) { setPhoto(null); return; }
    let alive = true;
    const key = fold(title);
    const set = (p: Photo | null) => { if (alive) setPhoto(p); };
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(set);
    setPhoto(cachedPhoto(title));
    findPhoto(title).then(set);
    return () => { alive = false; listeners.get(key)?.delete(set); };
  }, [title, enabled]);
  return photo;
}
