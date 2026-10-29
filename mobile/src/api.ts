// Dolap Defteri sunucusuna (server/) istekler. Claude anahtarı uygulamada değil, sunucuda durur.
import type { Item, Use } from './logic';

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const APP_KEY = process.env.EXPO_PUBLIC_APP_KEY ?? '';

export const apiConfigured = () => !!API_URL;

async function post<T>(path: string, body: unknown): Promise<T> {
  if (!API_URL) throw new Error('Sunucu adresi ayarlanmamış (EXPO_PUBLIC_API_URL).');
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-app-key': APP_KEY },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `Sunucu hatası (${res.status}).`);
  return data as T;
}

export type ParsedItem = { name: string; qty: number; unit: string; category: string; food: boolean };
const inv = (items: Item[]) => items.map(i => ({ id: i.id, name: i.name, qty: i.qty, unit: i.unit }));

export const parseText = (text: string) => post<{ items: ParsedItem[] }>('/parse-text', { text });

export const parseImages = (images: { mediaType: 'image/jpeg'; data: string }[]) =>
  post<{ items: ParsedItem[] }>('/parse-images', { images });

export type PlanResponse = {
  days: { meals: { meal: string; options: { title: string; summary: string; minutes: number; servings: number; uses: Use[]; extra: { name: string; amount: string }[] }[] }[] }[];
};
export const makePlan = (p: { items: Item[]; people: number; days: number; meals: string[]; options: number; recent: string[] }) =>
  post<PlanResponse>('/plan', { inventory: inv(p.items), people: p.people, days: p.days, meals: p.meals, options: p.options, recent: p.recent });

export const getSteps = (p: { title: string; servings: number; ingredients: string[] }) =>
  post<{ steps: string[]; tip: string }>('/steps', p);

export const adhoc = (p: { text: string; defaultPeople: number; items: Item[] }) =>
  post<{ title: string; servings: number; uses: Use[] }>('/adhoc', { text: p.text, defaultPeople: p.defaultPeople, inventory: inv(p.items) });
