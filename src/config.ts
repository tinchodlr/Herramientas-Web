export const LANGS = ['es', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'es';

/** Nombre provisorio: cambiarlo acá cuando esté definida la marca y el dominio. */
export const SITE_NAME: Record<Lang, string> = {
  es: 'Herramientas Web',
  en: 'Web Tools',
};

export const LOCALE: Record<Lang, string> = {
  es: 'es-AR',
  en: 'en-US',
};
