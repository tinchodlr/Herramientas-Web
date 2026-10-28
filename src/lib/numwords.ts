import type { Lang } from '../config';

const UNITS_ES = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const TENS_ES = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const HUNDREDS_ES = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

/** 0..999 en castellano ("uno" se ajusta después según el contexto). */
function below1000Es(n: number): string {
  if (n === 100) return 'cien';
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(HUNDREDS_ES[h]);
  if (r) {
    if (r < 30) parts.push(UNITS_ES[r]);
    else {
      const t = Math.floor(r / 10);
      const u = r % 10;
      parts.push(u ? `${TENS_ES[t]} y ${UNITS_ES[u]}` : TENS_ES[t]);
    }
  }
  return parts.join(' ');
}

const apocope = (s: string) => s.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');

function intEs(n: number): string {
  if (n === 0) return 'cero';
  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (millions) {
    // "un millón", "dos millones"; los millones de millones se dicen "mil millones" y similares.
    parts.push(millions === 1 ? 'un millón' : `${apocope(intEs(millions))} millones`);
  }
  if (thousands) parts.push(thousands === 1 ? 'mil' : `${apocope(below1000Es(thousands))} mil`);
  if (rest) parts.push(below1000Es(rest));
  let s = parts.join(' ');
  // "millones de pesos" lleva "de" cuando no hay nada después de los millones.
  if (!thousands && !rest && millions) s += ' de';
  return s;
}

const UNITS_EN = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS_EN = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function below1000En(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h) parts.push(`${UNITS_EN[h]} hundred`);
  if (r) {
    if (r < 20) parts.push(UNITS_EN[r]);
    else parts.push(r % 10 ? `${TENS_EN[Math.floor(r / 10)]}-${UNITS_EN[r % 10]}` : TENS_EN[Math.floor(r / 10)]);
  }
  return parts.join(' ');
}

function intEn(n: number): string {
  if (n === 0) return 'zero';
  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (millions) parts.push(`${intEn(millions)} million`);
  if (thousands) parts.push(`${below1000En(thousands)} thousand`);
  if (rest) parts.push(below1000En(rest));
  return parts.join(' ');
}

/** Importe en letras: "mil doscientos cincuenta pesos con 50/100" (o su versión en inglés). */
export function amountInWords(amount: number, lang: Lang, currency: Record<Lang, string[]>) {
  if (!Number.isFinite(amount) || amount < 0 || amount >= 1_000_000_000_000) return '';
  const cents = Math.round(amount * 100);
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  const [one, many] = currency[lang];
  if (lang === 'es') {
    const words = intEs(whole);
    const unit = whole === 1 ? one : many;
    const text = `${apocope(words)} ${unit}`;
    return frac ? `${text} con ${String(frac).padStart(2, '0')}/100` : text;
  }
  const unit = whole === 1 ? one : many;
  const text = `${intEn(whole)} ${unit}`;
  return frac ? `${text} and ${String(frac).padStart(2, '0')}/100` : text;
}
