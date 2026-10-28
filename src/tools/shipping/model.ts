import type { Lang } from '../shared/ui';

export interface Sender {
  business: string;
  owner: string;
  street: string;
  barrio: string;
  city: string;
  cp: string;
  logo: string;
}

export interface Recipient {
  order: string;
  name: string;
  street: string;
  floor: string;
  barrio: string;
  city: string;
  cp: string;
  phone: string;
  notes: string;
  packages: string;
}

export type LabelSize = '8x14' | '10x15';
export type Format = 'a4-8x14' | 'a4-10x15' | 'term-10x15' | 'term-8x14' | 'zpl';

/** Medidas en mm (ancho × alto). */
export const SIZE_MM: Record<LabelSize, [number, number]> = { '8x14': [80, 140], '10x15': [100, 150] };

/** Una etiqueta a imprimir: un bulto de un envío. */
export interface LabelItem {
  r: Recipient;
  n: number;
  total: number;
}

export const QR_WORDS: Record<Lang, { order: string; to: string; addr: string; barrio: string; phone: string }> = {
  es: { order: 'Pedido', to: 'Dest', addr: 'Dir', barrio: 'Barrio', phone: 'Tel' },
  en: { order: 'Order', to: 'To', addr: 'Addr', barrio: 'Area', phone: 'Tel' },
};

const join = (parts: (string | false | undefined)[], sep: string) => parts.filter(Boolean).join(sep);

/** Texto del QR de dirección: todo lo que necesita el repartidor, una línea por dato. */
export function addressText(s: Sender, r: Recipient, lang: Lang, sep = '\n') {
  const w = QR_WORDS[lang];
  return join(
    [
      s.business.trim().toUpperCase(),
      r.order && `${w.order}: ${r.order}`,
      r.name && `${w.to}: ${r.name}`,
      (r.street || r.floor) && `${w.addr}: ${join([r.street, r.floor], ' ')}`,
      r.barrio && `${w.barrio}: ${r.barrio}`,
      (r.city || r.cp) && join([r.city, r.cp && `CP ${r.cp}`], ' '),
      r.phone && `${w.phone}: ${r.phone}`,
    ],
    sep,
  );
}

/**
 * Link de WhatsApp. Sin "+" se asume un número de Argentina: se quita el 0 inicial
 * y se antepone 549 (celular). Con "+" se usa el código de país tal como vino.
 */
export function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return '';
  if (phone.trim().startsWith('+')) return `https://wa.me/${digits}`;
  if (digits.startsWith('549')) return `https://wa.me/${digits}`;
  if (digits.startsWith('54')) return `https://wa.me/549${digits.slice(2)}`;
  return `https://wa.me/549${digits.replace(/^0+/, '')}`;
}

export const senderLine = (s: Sender) => join([s.business, s.owner, s.street, s.city, s.barrio, s.cp], ' · ');

export const expandPackages = (list: Recipient[]): LabelItem[] =>
  list.flatMap((r) => {
    const total = Math.min(Math.max(parseInt(r.packages, 10) || 1, 1), 50);
    return Array.from({ length: total }, (_, i) => ({ r, n: i + 1, total }));
  });
