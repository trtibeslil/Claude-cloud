// Node testleri için: uygulama kodundaki uzantısız içe aktarmaları (./units) .ts dosyasına çözer (Metro bunu kendisi yapar).
import { register } from 'node:module';

register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); }
  catch (e) {
    if (spec.startsWith('.') && !/\\.(m?[jt]sx?|json)$/.test(spec)) return next(spec + '.ts', ctx);
    throw e;
  }
}`));
