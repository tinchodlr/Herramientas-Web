/** Minúsculas y sin acentos, para comparar textos al buscar. */
export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Quita acentos y diacríticos conservando mayúsculas. */
export const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
