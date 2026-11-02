// Uygulamaya gömülü tarifler (catalog/tarifler.py üretir) ve kategori eşleştirmesi.
import { findProduct } from './logic';
import type { Recipe } from './planner';
import data from './tarifler.json';

export const RECIPES = data as unknown as Recipe[];
export const catOf = (name: string) => findProduct(name)?.cat;
