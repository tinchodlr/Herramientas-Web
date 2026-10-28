import { DEFAULT_LANG, type Lang } from '../config';
import type { Tool } from '../data/tools';

export const UI = {
  es: {
    'meta.homeTitle': 'Herramientas online gratis, rápidas y privadas',
    'meta.homeDescription':
      'Calculadora de costos de Mercado Libre, generador de SKU, etiquetas de envío, códigos QR, conversor a WebP, herramientas PDF y más. Gratis, sin registro y todo en tu navegador.',
    'meta.toolSuffix': 'gratis online',
    'nav.tools': 'Herramientas',
    'nav.search': 'Buscar herramienta…',
    'nav.searchShort': 'Buscar',
    'nav.theme': 'Cambiar tema claro u oscuro',
    'nav.language': 'Idioma',
    'nav.home': 'Inicio',
    'home.eyebrow': 'Gratis · Sin registro · Sin subir archivos',
    'home.title': 'Las herramientas que usás todos los días, en un solo lugar',
    'home.subtitle':
      'Todo se procesa en tu navegador: tus archivos y datos no salen de tu computadora.',
    'home.searchPlaceholder': 'Buscá: QR, PDF, Mercado Libre, WebP…',
    'home.noResults': 'No encontramos herramientas con esa búsqueda.',
    'home.popular': 'Más usadas',
    'home.count': 'herramientas',
    'tool.private': 'Se procesa en tu navegador',
    'tool.free': 'Gratis y sin registro',
    'tool.howTo': 'Cómo se usa',
    'tool.related': 'Otras herramientas de',
    'tool.backHome': 'Ver todas las herramientas',
    'footer.tagline': 'Herramientas simples que respetan tu privacidad.',
    'footer.privacy': 'Ninguna herramienta envía tus archivos a un servidor.',
    'notFound.title': 'Página no encontrada',
    'notFound.text': 'La página que buscás no existe o se movió.',
  },
  en: {
    'meta.homeTitle': 'Free, fast and private online tools',
    'meta.homeDescription':
      'Mercado Libre fee calculator, SKU generator, shipping labels, QR codes, WebP converter, PDF tools and more. Free, no sign-up, everything runs in your browser.',
    'meta.toolSuffix': 'free online',
    'nav.tools': 'Tools',
    'nav.search': 'Search tools…',
    'nav.searchShort': 'Search',
    'nav.theme': 'Toggle light or dark theme',
    'nav.language': 'Language',
    'nav.home': 'Home',
    'home.eyebrow': 'Free · No sign-up · No uploads',
    'home.title': 'The tools you use every day, all in one place',
    'home.subtitle': 'Everything runs in your browser: your files and data never leave your computer.',
    'home.searchPlaceholder': 'Search: QR, PDF, Mercado Libre, WebP…',
    'home.noResults': 'No tools match your search.',
    'home.popular': 'Most used',
    'home.count': 'tools',
    'tool.private': 'Runs in your browser',
    'tool.free': 'Free, no sign-up',
    'tool.howTo': 'How to use it',
    'tool.related': 'More tools in',
    'tool.backHome': 'See all tools',
    'footer.tagline': 'Simple tools that respect your privacy.',
    'footer.privacy': 'No tool ever sends your files to a server.',
    'notFound.title': 'Page not found',
    'notFound.text': 'The page you are looking for does not exist or was moved.',
  },
} as const;

export type UIKey = keyof (typeof UI)['es'];

export const useT = (lang: Lang) => (key: UIKey) => UI[lang][key];

export const homePath = (lang: Lang) => (lang === DEFAULT_LANG ? '/' : `/${lang}/`);

export const toolPath = (tool: Tool, lang: Lang) =>
  lang === DEFAULT_LANG ? `/${tool.slug[lang]}/` : `/${lang}/${tool.slug[lang]}/`;
