// Dolap Defteri API: mobil uygulamanın Claude çağrılarını yapan Cloudflare Worker.
// Anthropic API anahtarı yalnızca burada (Worker secret olarak) durur; uygulamaya hiç girmez.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

interface Env {
  ANTHROPIC_API_KEY: string;
  APP_KEY: string;
}

const MODEL = "claude-opus-5-5";

const CATS = [
  "Sebze & Meyve", "Et, Tavuk & Balık", "Süt & Kahvaltılık", "Kuru Gıda & Bakliyat",
  "Baharat, Sos & Yağ", "Donuk", "İçecek", "Diğer",
] as const;

/* ---------- çıktı şemaları ---------- */
const Item = z.object({
  name: z.string(),
  qty: z.number(),
  // enum yerine string: uygulama birimi ve kategoriyi kendisi normalleştirir
  unit: z.string(),
  category: z.string(),
  food: z.boolean(),
});
const ItemList = z.object({ items: z.array(Item) });

const Use = z.object({ itemId: z.string(), name: z.string(), qty: z.number(), unit: z.string() });
const Option = z.object({
  title: z.string(),
  summary: z.string(),
  minutes: z.number(),
  servings: z.number(),
  uses: z.array(Use),
  extra: z.array(z.object({ name: z.string(), amount: z.string() })),
});
const Plan = z.object({
  days: z.array(z.object({
    meals: z.array(z.object({ meal: z.string(), options: z.array(Option) })),
  })),
});
const Steps = z.object({ steps: z.array(z.string()), tip: z.string() });
const Adhoc = z.object({ title: z.string(), servings: z.number(), uses: z.array(Use) });

/* ---------- istek şemaları ---------- */
const InvItem = z.object({ id: z.string(), name: z.string(), qty: z.number(), unit: z.string() });
const ReqText = z.object({ text: z.string().min(1).max(8000) });
const ReqImages = z.object({
  images: z.array(z.object({ mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]), data: z.string().min(1) })).min(1).max(6),
});
const ReqPlan = z.object({
  inventory: z.array(InvItem).max(400),
  people: z.number().int().min(1).max(30),
  days: z.number().int().min(1).max(7),
  meals: z.array(z.string()).min(1).max(3),
  options: z.number().int().min(1).max(5),
  recent: z.array(z.string()).max(20),
});
const ReqSteps = z.object({
  title: z.string().max(200),
  servings: z.number().min(1).max(30),
  ingredients: z.array(z.string().max(200)).max(40),
});
const ReqAdhoc = z.object({
  text: z.string().min(1).max(500),
  defaultPeople: z.number().int().min(1).max(30),
  inventory: z.array(InvItem).max(400),
});

const ITEM_RULES = `Her malzeme için:
- name: Türkçe, sade ürün adı, ilk harf büyük, marka yok (ör. "Spagetti makarna", "Domates", "Tam yağlı süt").
- qty ve unit: unit yalnızca g, ml, adet, paket, demet, kutu, şişe. kg ise 1000 ile çarpıp g yaz; litre ise 1000 ile çarpıp ml yaz.
  Paketli üründe gramaj/hacim biliniyorsa onu kullan (ör. 2 × "Spagetti 500 g" → 1000 g). Yumurta, limon gibi sayılanlar adet.
- category: ${CATS.join(", ")}.
- food: yiyecek, içecek ya da mutfak malzemesiyse true; temizlik, kişisel bakım, kâğıt ürünü vb. ise false.`;

const inventoryText = (inv: z.infer<typeof InvItem>[]) =>
  inv.map(i => `${i.id} | ${i.name} | ${i.qty} ${i.unit}`).join("\n");

/* ---------- Claude çağrısı ---------- */
async function ask<T extends z.ZodType>(
  env: Env,
  schema: T,
  content: Anthropic.Beta.Messages.BetaContentBlockParam[] | string,
  effort: "low" | "medium",
  maxTokens = 16000,
): Promise<z.infer<T>> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const msg = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort, format: betaZodOutputFormat(schema) },
    messages: [{ role: "user", content }],
  });
  if (msg.stop_reason === "refusal") throw new HttpError(422, "Claude bu isteği yanıtlamadı. Farklı bir görsel ya da metin dene.");
  if (msg.stop_reason === "max_tokens") throw new HttpError(422, "Yanıt çok uzun oldu. Daha az gün ya da seçenek iste.");
  if (msg.parsed_output == null) throw new HttpError(502, "Claude'un yanıtı okunamadı. Tekrar dene.");
  return msg.parsed_output as z.infer<T>;
}

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/* ---------- uç noktalar ---------- */
const routes: Record<string, (body: unknown, env: Env) => Promise<unknown>> = {
  async "/parse-text"(body, env) {
    const { text } = ReqText.parse(body);
    return ask(env, ItemList, `Kullanıcı evindeki yiyecek ve mutfak malzemelerini yazdı. Metindeki her malzemeyi çıkar.
${ITEM_RULES}

Metin:
${text}`, "low");
  },

  async "/parse-images"(body, env) {
    const { images } = ReqImages.parse(body);
    const blocks: Anthropic.Beta.Messages.BetaContentBlockParam[] = images.map(img => ({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.data },
    }));
    blocks.push({ type: "text", text: `Görsel(ler) bir market alışveriş fişi ya da online market/yemek sitesindeki "Siparişlerim" sayfasının ekran görüntüsü. Satın alınan ürünleri çıkar.
- Birden fazla görsel aynı siparişin devamı olabilir; aynı satırı iki kez sayma.
- İndirim, toplam, KDV, poşet, teslimat ücreti, kampanya satırlarını alma.
- Fiş kısaltmalarını yorumla (ör. "DOMATES KG 1,245" → 1245 g domates; "SUT 1L x2" → 2000 ml süt).
- Sipariş ekranında adet ("2 adet", "x3") ve ürün adındaki gramajı birlikte kullan.
${ITEM_RULES}` });
    return ask(env, ItemList, blocks, "medium");
  },

  async "/plan"(body, env) {
    const r = ReqPlan.parse(body);
    if (!r.inventory.length) throw new HttpError(400, "Dolap boş.");
    return ask(env, Plan, `Sen Türk ev mutfağını iyi bilen bir aşçısın. Kullanıcının dolabındaki malzemelerle yemek planı hazırla.

Dolaptaki malzemeler (id | ad | miktar birim):
${inventoryText(r.inventory)}

Plan: ${r.days} gün; her gün sırasıyla şu öğünler: ${r.meals.join(", ")}. Kişi sayısı: ${r.people}.
Son yapılan yemekler (tekrarlama): ${r.recent.join(", ") || "yok"}

Kurallar:
- Her öğün için birbirinden belirgin şekilde farklı ${r.options} seçenek öner (farklı ana malzeme ya da pişirme yöntemi).
- Seçenekler öncelikle dolaptaki malzemeleri kullansın. Her günün ilk seçenekleri birlikte yapılırsa toplam kullanım dolaptaki miktarı aşmasın; günler ilerledikçe bitecek malzemeyi tekrar kullanma.
- uses: dolaptan kullanılan malzemeler, ${r.people} kişilik gerçekçi miktarlarla. itemId dolaptaki id ile birebir aynı, unit o malzemenin dolaptaki birimi olsun.
- extra: dolapta olmayan ama gereken malzemeler (tuz, karabiber, su hariç). Mümkünse boş, en fazla 3.
- Kahvaltı önerileri kahvaltılık olsun (menemen, omlet, peynir tabağı gibi).
- servings = ${r.people}. title kısa yemek adı, summary tek cümle, minutes toplam süre.
- days dizisinde tam ${r.days} gün olsun.`, "medium", 32000);
  },

  async "/steps"(body, env) {
    const r = ReqSteps.parse(body);
    return ask(env, Steps, `"${r.title}" için ${r.servings} kişilik ev tarifi yaz.
Malzemeler: ${r.ingredients.join(", ")}; tuz, karabiber, su serbest.
Türkçe, kısa ve net adımlar (en fazla 8). tip: tek cümlelik püf noktası.`, "low");
  },

  async "/adhoc"(body, env) {
    const r = ReqAdhoc.parse(body);
    return ask(env, Adhoc, `Kullanıcı şunu söyledi: "${r.text}". Yaptığı yemeği ve kaç kişilik yaptığını anla (belirtmediyse ${r.defaultPeople} kişi say).
Dolaptaki malzemeler (id | ad | miktar birim):
${inventoryText(r.inventory)}
Bu yemek için dolaptan kullanılmış olası miktarları tahmin et. Sadece dolapta olan malzemeleri yaz; itemId ve unit dolaptakiyle aynı olsun.`, "low");
  },
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/health") return json({ ok: true });
    if (req.method !== "POST") return json({ error: "Bulunamadı" }, 404);
    const handler = routes[url.pathname];
    if (!handler) return json({ error: "Bulunamadı" }, 404);
    if (!env.APP_KEY || req.headers.get("x-app-key") !== env.APP_KEY) return json({ error: "Yetkisiz istek" }, 401);

    try {
      return json(await handler(await req.json(), env));
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      if (e instanceof z.ZodError) return json({ error: "Geçersiz istek" }, 400);
      if (e instanceof Anthropic.RateLimitError) return json({ error: "Şu an çok yoğun. Biraz sonra tekrar dene." }, 429);
      if (e instanceof Anthropic.BadRequestError) return json({ error: "Görsel ya da metin işlenemedi." }, 400);
      if (e instanceof Anthropic.AuthenticationError) return json({ error: "Sunucunun Claude anahtarı geçersiz." }, 500);
      if (e instanceof Anthropic.APIError) return json({ error: "Claude'a ulaşılamadı. Tekrar dene." }, 502);
      if (e instanceof SyntaxError) return json({ error: "Geçersiz istek" }, 400);
      console.error(e);
      return json({ error: "Beklenmeyen bir hata oldu." }, 500);
    }
  },
};
