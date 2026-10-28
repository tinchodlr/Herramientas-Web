export const ML_TITLE_MAX = 60;

/** Palabras promocionales o de logística que no describen el producto: Mercado Libre suele pedir que no vayan en el título. */
const PROMO_WORDS = [
  'envio gratis', 'envío gratis', 'envios gratis', 'envíos gratis', 'mejor precio', 'ultimas unidades', 'últimas unidades',
  'sin interes', 'sin interés', 'oferta', 'ofertas', 'promo', 'promos', 'promocion', 'promoción', 'descuento', 'barato', 'baratos',
  'barata', 'baratas', 'liquidacion', 'liquidación', 'imperdible', 'gratis', 'cuotas', 'outlet', 'rebajado', 'rebajada', 'chollo',
];

const SMALL_WORDS = new Set(['de', 'del', 'con', 'sin', 'para', 'y', 'e', 'o', 'x', 'en', 'el', 'la', 'los', 'las', 'un', 'una', 'por', 'a', 'al', 'the', 'and', 'for', 'with', 'of']);
const ALLOWED = /[^\p{L}\p{N}\s\-./+x%&'°,]/gu;

export type CaseStyle = 'title' | 'sentence' | 'asis';

export const stripEmojiAndSymbols = (s: string) => s.replace(ALLOWED, ' ');
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const promoRegex = new RegExp(`(^|[^\\p{L}\\p{N}])(${PROMO_WORDS.map((w) => w.replace(/\s+/g, '\\s+')).join('|')})(?=$|[^\\p{L}\\p{N}])`, 'giu');

/** Frases promocionales encontradas en un texto. */
export const findPromo = (s: string) => [...s.matchAll(promoRegex)].map((m) => m[2].toLowerCase());
export const removePromo = (s: string) => s.replace(promoRegex, '$1').replace(/\s{2,}/g, ' ').trim();

export function applyCase(s: string, style: CaseStyle) {
  if (style === 'asis') return s;
  const words = s.split(/\s+/).filter(Boolean);
  return words
    .map((w, i) => {
      // Siglas y medidas se dejan como están (USB, LED, 10W, 256GB, iPhone).
      const hasDigit = /\d/.test(w);
      const isAcronym = w.length > 1 && w === w.toUpperCase() && /\p{L}/u.test(w) && w.length <= 4;
      const mixed = /\p{Ll}/u.test(w) && /\p{Lu}/u.test(w.slice(1));
      if (hasDigit || isAcronym || mixed) return w;
      const lower = w.toLowerCase();
      if (style === 'sentence') return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/** Corta en el último espacio que entre en el límite, sin partir palabras. */
export function fitToLimit(s: string, max = ML_TITLE_MAX) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1);
  const space = cut.lastIndexOf(' ');
  return (space > 0 ? cut.slice(0, space) : s.slice(0, max)).replace(/[\s\-.,/+]+$/, '');
}

export function dedupeWords(s: string) {
  const seen = new Set<string>();
  return s
    .split(/\s+/)
    .filter((w) => {
      const k = norm(w).replace(/[^\p{L}\p{N}]/gu, '');
      if (!k || SMALL_WORDS.has(k) || k.length < 3) return true;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .join(' ');
}

export const cleanTitle = (s: string) => stripEmojiAndSymbols(s).replace(/\s{2,}/g, ' ').trim();

export interface TitleInput {
  product: string;
  brand: string;
  model: string;
  attributes: string[];
  style: CaseStyle;
}

const joinParts = (parts: string[]) => parts.filter(Boolean).join(' ');

/**
 * Arma variantes del título con el orden de importancia distinto. Lo secundario (las características del final)
 * se va quitando de a una hasta que entre en 60 caracteres.
 */
export function buildTitles(input: TitleInput) {
  const c = (s: string) => removePromo(cleanTitle(s));
  const product = c(input.product);
  const brand = c(input.brand);
  const model = c(input.model);
  const attrs = input.attributes.map(c).filter(Boolean);
  if (!product) return [];

  const orders: { id: string; head: string[] }[] = [
    { id: 'product', head: [product, brand, model] },
    { id: 'brand', head: [brand, product, model] },
    { id: 'attrs-first', head: [product, attrs[0] ?? '', brand, model] },
  ];

  const out: { id: string; title: string; dropped: number }[] = [];
  const seen = new Set<string>();
  for (const { id, head } of orders) {
    const tail = id === 'attrs-first' ? attrs.slice(1) : attrs;
    let keep = tail.length;
    let title = '';
    for (; keep >= 0; keep--) {
      title = applyCase(dedupeWords(joinParts([...head, ...tail.slice(0, keep)])), input.style);
      if (title.length <= ML_TITLE_MAX) break;
    }
    if (title.length > ML_TITLE_MAX) title = fitToLimit(title);
    if (!title || seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    out.push({ id, title, dropped: tail.length - Math.max(keep, 0) });
  }
  return out;
}

export interface TitleReview {
  title: string;
  length: number;
  problems: ('long' | 'caps' | 'promo' | 'symbols' | 'repeated' | 'spaces')[];
  promo: string[];
  repeated: string[];
  fixed: string;
}

export function reviewTitle(raw: string): TitleReview {
  const title = raw.trim();
  const problems: TitleReview['problems'] = [];
  const letters = title.replace(/[^\p{L}]/gu, '');
  const words = title.split(/\s+/).filter(Boolean);
  const longWords = words.filter((w) => w.replace(/[^\p{L}]/gu, '').length >= 3);
  const capsWords = longWords.filter((w) => w === w.toUpperCase());
  const promo = findPromo(title);
  const counts = new Map<string, number>();
  for (const w of words) {
    const k = norm(w).replace(/[^\p{L}\p{N}]/gu, '');
    if (k.length >= 3 && !SMALL_WORDS.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const repeated = [...counts].filter(([, n]) => n > 1).map(([w]) => w);

  if (title.length > ML_TITLE_MAX) problems.push('long');
  const shouting = letters.length > 6 && capsWords.length >= Math.max(2, longWords.length / 2);
  if (shouting) problems.push('caps');
  if (promo.length) problems.push('promo');
  if (/[^\p{L}\p{N}\s\-./+x%&'°,]/u.test(title)) problems.push('symbols');
  if (repeated.length) problems.push('repeated');
  if (/\s{2,}/.test(title)) problems.push('spaces');

  // En un título gritado también se bajan las marcas cortas (NIKE → Nike); si no, se respetan las siglas (USB, LED).
  const base = shouting
    ? title.replace(/(?<![\p{L}\p{N}])\p{Lu}+(?![\p{L}\p{N}])/gu, (w) => (w.length >= 4 || SMALL_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : w))
    : title;
  const fixed = fitToLimit(applyCase(dedupeWords(removePromo(cleanTitle(base))), 'title'));
  return { title, length: title.length, problems, promo, repeated, fixed };
}
