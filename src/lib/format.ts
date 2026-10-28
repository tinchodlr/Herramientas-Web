export type Lang = 'es' | 'en';

// ───────── Números ─────────

/**
 * Interpreta lo que escribe la persona. En español acepta "15.000", "1.234,5" y "12,5";
 * en inglés "15,000" y "12.5". Devuelve NaN si no es un número.
 */
export function parseNum(raw: string, lang: Lang): number {
  let s = raw.replace(/[\s$%]/g, '');
  if (!s) return NaN;
  if (lang === 'es') {
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  } else {
    s = s.replace(/,/g, '');
  }
  return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? Number(s) : NaN;
}

const LOCALES: Record<Lang, string> = { es: 'es-AR', en: 'en-US' };

export const fmtNum = (n: number, lang: Lang, maxDecimals = 2, minDecimals = 0) =>
  Number.isFinite(n)
    ? n.toLocaleString(LOCALES[lang], { minimumFractionDigits: minDecimals, maximumFractionDigits: maxDecimals })
    : '—';

export const fmtMoney = (n: number, lang: Lang) =>
  Number.isFinite(n) ? `${n < 0 ? '−' : ''}$ ${fmtNum(Math.abs(n), lang, 2, 0)}` : '—';

export const fmtPct = (n: number, lang: Lang, decimals = 1) =>
  Number.isFinite(n) ? `${fmtNum(n, lang, decimals)} %` : '—';

export function formatBytes(bytes: number, lang: Lang) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${fmtNum(v, lang, v < 10 ? 1 : 0)} ${units[i]}`;
}
