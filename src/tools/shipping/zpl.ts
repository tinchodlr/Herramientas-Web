import type { Lang } from '../shared/ui';
import { qrMatrix } from '../shared/qr';
import { SIZE_MM, addressText, senderLine, whatsappLink, type LabelItem, type LabelSize, type Sender } from './model';

export interface ZplWords {
  order: string;
  shipping: string;
  pkg: string;
  sender: string;
  recipient: string;
  floor: string;
  barrio: string;
  city: string;
  notes: string;
  waClient: string;
}

/**
 * Genera ZPL II para impresoras Zebra (y compatibles), una etiqueta por bulto.
 * Usa ^CI28 (UTF-8) para acentos y eñes, y no fija el tipo de medio (^MT):
 * así funciona igual en impresoras térmicas directas y de transferencia.
 */
export function buildZpl(items: LabelItem[], s: Sender, date: string, size: LabelSize, dpi: number, lang: Lang, w: ZplWords) {
  return items.map((item) => oneLabel(item, s, date, size, dpi, lang, w)).join('\n');
}

function oneLabel({ r, n, total }: LabelItem, s: Sender, date: string, size: LabelSize, dpi: number, lang: Lang, w: ZplWords) {
  const k = dpi / 25.4;
  const dot = (mm: number) => Math.round(mm * k);
  const [wmm, hmm] = SIZE_MM[size];
  const f = size === '10x15' ? 1 : 0.85;
  const W = dot(wmm);
  const H = dot(hmm);
  const m = dot(size === '10x15' ? 4 : 3.5);
  const inner = W - 2 * m;
  const z = ['^XA', '^CI28', `^PW${W}`, `^LL${H}`, '^LH0,0'];

  const clean = (x: string) => x.replace(/[\^~]/g, ' ').replace(/\s+/g, ' ').trim();
  /** Escribe texto y devuelve la altura que ocupó (estimando cuántas líneas usa). */
  const text = (x: number, y: number, sizeMm: number, value: string, opts: { w?: number; lines?: number; align?: 'L' | 'C' | 'R' } = {}) => {
    const h = dot(sizeMm * f);
    const width = opts.w ?? inner;
    const maxLines = opts.lines ?? 1;
    const v = clean(value);
    z.push(`^FO${x},${y}^A0N,${h},${h}^FB${width},${maxLines},0,${opts.align ?? 'L'}^FD${v}^FS`);
    const used = Math.min(maxLines, Math.max(1, Math.ceil((v.length * h * 0.55) / width)));
    return used * h;
  };
  const hline = (y: number, t = 2) => z.push(`^FO${m},${y}^GB${inner},${t},${t}^FS`);
  // La impresora puede elegir una versión de QR más grande que la calculada acá (otro modo
  // de codificación): se reservan 4 módulos de más para que nunca pise el texto ni el borde.
  const modulesOf = (data: string) => qrMatrix(data).size + 4;
  const qr = (x: number, y: number, data: string, maxMm: number) => {
    const modules = modulesOf(data);
    const mag = Math.max(1, Math.min(10, Math.floor(dot(maxMm) / modules)));
    z.push(`^FO${x},${y}^BQN,2,${mag}^FDMA,${clean(data)}^FS`);
    return modules * mag;
  };

  let y = m;

  // Encabezado: negocio a la izquierda, pedido a la derecha.
  text(m, y, 5, s.business, { w: Math.round(inner * 0.62) });
  if (r.order) {
    text(m, y, 2.6, w.order, { align: 'R' });
    text(m, y + dot(3 * f), 4.6, r.order, { align: 'R' });
  }
  y += dot(9 * f);

  // Recuadro ENVÍO | fecha (o BULTO n/N si hay varios).
  const tagH = dot(7 * f);
  const half = Math.round(inner / 2);
  z.push(`^FO${m},${y}^GB${inner},${tagH},2^FS`, `^FO${m + half},${y}^GB2,${tagH},2^FS`);
  const ty = y + Math.round((tagH - dot(4.2 * f)) / 2);
  text(m, ty, 4.2, total > 1 ? `${w.pkg} ${n}/${total}` : w.shipping, { w: half, align: 'C' });
  text(m + half, ty, 4.2, date, { w: half, align: 'C' });
  y += tagH + dot(2);

  const sl = senderLine(s);
  if (sl) y += text(m, y, 2.6, `${w.sender.toUpperCase()}: ${sl}`, { lines: 2 }) + dot(1.5);
  hline(y, 1);
  y += dot(2.5);

  // QR de dirección + CP, barrio y localidad al costado.
  const qrSize = qr(m, y, addressText(s, r, lang, ' / '), size === '10x15' ? 32 : 26);
  const tx = m + qrSize + dot(3);
  const tw = W - m - tx;
  let ry = y + dot(1);
  if (r.cp) ry += text(tx, ry, 8, `CP ${r.cp}`, { w: tw }) + dot(1.5);
  if (r.barrio) ry += text(tx, ry, 5, r.barrio, { w: tw, lines: 2 }) + dot(1);
  if (r.city) ry += text(tx, ry, 4.5, r.city, { w: tw, lines: 2 });
  y = Math.max(y + qrSize, ry) + dot(3);
  hline(y, 1);
  y += dot(2.5);

  // Destinatario.
  y += text(m, y, 2.6, w.recipient.toUpperCase()) + dot(1);
  y += text(m, y, 5, r.name, { lines: 2 }) + dot(1.5);
  const street = [r.street, r.floor && `${w.floor}: ${r.floor}`].filter(Boolean).join(' · ');
  if (street) y += text(m, y, 3.6, street, { lines: 2 }) + dot(1);
  const area = [r.barrio && `${w.barrio}: ${r.barrio}`, r.city && `${w.city}: ${r.city}`].filter(Boolean).join(' · ');
  if (area) y += text(m, y, 3.4, area, { lines: 2 }) + dot(1);
  if (r.notes) y += text(m, y, 3.2, `${w.notes}: ${r.notes}`, { lines: 3 });

  // WhatsApp del cliente, abajo de todo.
  const wa = whatsappLink(r.phone);
  if (wa) {
    const modules = modulesOf(wa);
    const mag = Math.max(1, Math.min(10, Math.floor(dot(size === '10x15' ? 18 : 15) / modules)));
    const waSize = modules * mag;
    const wy = H - m - waSize;
    hline(wy - dot(2), 1);
    z.push(`^FO${m},${wy}^BQN,2,${mag}^FDMA,${wa}^FS`);
    text(m + waSize + dot(3), wy + dot(2), 3, w.waClient, { w: inner - waSize - dot(3) });
    text(m + waSize + dot(3), wy + dot(7 * f), 3.8, r.phone, { w: inner - waSize - dot(3) });
  }

  z.push('^XZ');
  return z.join('\n');
}
