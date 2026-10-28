import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { amountInWords } from '../../lib/numwords';
import { fmtNum, parseNum, type Lang } from '../../lib/format';

export type DocKind = 'quote' | 'delivery' | 'receipt';

export interface Issuer {
  name: string;
  taxId: string;
  taxCondition: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
}

export interface DocItem {
  id: number;
  desc: string;
  qty: string;
  price: string;
}

export interface DocData {
  kind: DocKind;
  number: string;
  date: string; // AAAA-MM-DD
  clientName: string;
  clientTaxId: string;
  clientAddress: string;
  items: DocItem[];
  discount: string;
  vat: string; // '0' | '10.5' | '21' | '27'
  vatIncluded: boolean;
  currency: string;
  validity: string; // días
  notes: string;
  showPrices: boolean; // remito
  amount: string; // recibo
  concept: string;
  method: string;
  reference: string;
}

export interface PdfWords {
  title: Record<DocKind, string>;
  number: string;
  date: string;
  validUntil: (days: number, date: string) => string;
  nonFiscalBox: string;
  nonFiscalFoot: string;
  client: string;
  taxId: string;
  address: string;
  desc: string;
  qty: string;
  unit: string;
  amount: string;
  subtotal: string;
  discount: (pct: string) => string;
  net: string;
  vat: (rate: string) => string;
  vatIncluded: (rate: string) => string;
  total: string;
  notes: string;
  page: (i: number, n: number) => string;
  signature: string;
  signName: string;
  signId: string;
  receivedFrom: string;
  receiptText: (client: string, amount: string, words: string, concept: string) => string;
  amountReceived: string;
  method: string;
  reference: string;
  signReceiver: string;
  currencyName: Record<Lang, string[]>;
}

export interface Totals {
  subtotal: number;
  discount: number;
  net: number;
  vat: number;
  total: number;
}

export const lineTotal = (it: DocItem, lang: Lang) => {
  const q = parseNum(it.qty, lang);
  const p = parseNum(it.price, lang);
  return (Number.isFinite(q) ? q : 0) * (Number.isFinite(p) ? p : 0);
};

/** Descuento general y IVA: los precios pueden venir con el IVA incluido o sin él. */
export function computeTotals(items: DocItem[], discountText: string, vatRate: number, included: boolean, lang: Lang): Totals {
  const subtotal = items.reduce((s, it) => s + lineTotal(it, lang), 0);
  const d = parseNum(discountText, lang);
  const discount = Number.isFinite(d) ? (subtotal * Math.min(Math.max(d, 0), 100)) / 100 : 0;
  const after = subtotal - discount;
  if (!vatRate) return { subtotal, discount, net: after, vat: 0, total: after };
  if (included) {
    const net = after / (1 + vatRate / 100);
    return { subtotal, discount, net, vat: after - net, total: after };
  }
  const vat = (after * vatRate) / 100;
  return { subtotal, discount, net: after, vat, total: after + vat };
}

const A4: [number, number] = [595.28, 841.89];
const M = 40;
const BOTTOM = 62;
const INK = rgb(0.09, 0.1, 0.13);
const GRAY = rgb(0.4, 0.43, 0.48);
const RULE = rgb(0.82, 0.84, 0.88);
const BAND = rgb(0.955, 0.962, 0.972);
const HEAD = rgb(0.16, 0.18, 0.22);

// Las fuentes estándar de PDF solo codifican WinAnsi: lo que no entra se reemplaza por "?" en vez de romper el archivo.
const EXTRA = new Set([...'€–—‘’“”•…™']);
function sanitize(s: string) {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c === 9) out += ' ';
    else if (c === 10) out += '\n';
    else if (c < 32 || (c >= 127 && c <= 159)) continue;
    else out += c <= 255 || EXTRA.has(ch) ? ch : '?';
  }
  return out;
}

function wrap(text: string, font: PDFFont, size: number, max: number) {
  const out: string[] = [];
  for (const para of sanitize(text).split('\n')) {
    let line = '';
    for (const word of para.split(/ +/)) {
      if (!word) continue;
      let w = word;
      while (font.widthOfTextAtSize(w, size) > max && w.length > 1) {
        let i = w.length - 1;
        while (i > 1 && font.widthOfTextAtSize(w.slice(0, i), size) > max) i--;
        if (line) {
          out.push(line);
          line = '';
        }
        out.push(w.slice(0, i));
        w = w.slice(i);
      }
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) <= max) line = test;
      else {
        if (line) out.push(line);
        line = w;
      }
    }
    out.push(line);
  }
  return out;
}

export function fmtDate(iso: string, lang: Lang) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toLocaleDateString(lang === 'es' ? 'es-AR' : 'en-US', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function addDays(iso: string, days: number) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + days));
  return d.toISOString().slice(0, 10);
}

export const money = (n: number, cur: string, lang: Lang) => `${n < 0 ? '-' : ''}${cur} ${fmtNum(Math.abs(n), lang, 2, 2)}`;

export async function buildDocumentPdf(doc: DocData, issuer: Issuer, lang: Lang, w: PdfWords) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${w.title[doc.kind]} ${doc.number}`.trim());
  pdf.setCreator('Herramientas Web');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const [W, H] = A4;
  const CW = W - 2 * M;

  let logo: Awaited<ReturnType<typeof pdf.embedPng>> | undefined;
  if (issuer.logo) {
    try {
      logo = await pdf.embedPng(issuer.logo);
    } catch {}
  }

  let page: PDFPage = pdf.addPage(A4);
  let y = M; // medido desde arriba

  const py = (top: number) => H - top;
  const text = (s: string, x: number, top: number, size: number, o: { bold?: boolean; color?: ReturnType<typeof rgb>; align?: 'l' | 'r' | 'c'; width?: number } = {}) => {
    const f = o.bold ? bold : font;
    const t = sanitize(s).replace(/\n/g, ' ');
    const tw = f.widthOfTextAtSize(t, size);
    let px = x;
    if (o.align === 'r') px = x - tw;
    else if (o.align === 'c') px = x + ((o.width ?? 0) - tw) / 2;
    page.drawText(t, { x: px, y: py(top + size * 0.82), size, font: f, color: o.color ?? INK });
  };
  const hline = (top: number, x1 = M, x2 = W - M, color = RULE, thickness = 0.8) =>
    page.drawLine({ start: { x: x1, y: py(top) }, end: { x: x2, y: py(top) }, thickness, color });
  const lines = (s: string, x: number, top: number, size: number, max: number, o: { bold?: boolean; color?: ReturnType<typeof rgb>; gap?: number } = {}) => {
    const f = o.bold ? bold : font;
    const step = size + (o.gap ?? 3);
    const ls = wrap(s, f, size, max);
    ls.forEach((l, i) => text(l, x, top + i * step, size, o));
    return ls.length * step;
  };
  const ensure = (needed: number, onNewPage?: () => void) => {
    if (y + needed <= H - BOTTOM) return;
    page = pdf.addPage(A4);
    y = M;
    text(`${w.title[doc.kind]}  ${doc.number}`, M, y, 9, { color: GRAY });
    hline(y + 16);
    y += 28;
    onNewPage?.();
  };

  // ── Encabezado: emisor · recuadro X · título y número ──
  let leftH = 0;
  const leftW = 205;
  if (logo) {
    const s = Math.min(150 / logo.width, 54 / logo.height, 1);
    page.drawImage(logo, { x: M, y: py(y + logo.height * s), width: logo.width * s, height: logo.height * s });
    leftH += logo.height * s + 8;
  }
  if (issuer.name) leftH += lines(issuer.name, M, y + leftH, 12, leftW, { bold: true, gap: 2 }) + 2;
  const issuerLines = [
    issuer.taxId && `CUIT: ${issuer.taxId}`,
    issuer.taxCondition,
    issuer.address,
    [issuer.phone, issuer.email].filter(Boolean).join('  ·  '),
  ].filter(Boolean) as string[];
  for (const l of issuerLines) leftH += lines(l, M, y + leftH, 8.5, leftW, { color: GRAY, gap: 2 });

  const bx = W / 2 - 20;
  page.drawRectangle({ x: bx, y: py(y + 40), width: 40, height: 40, borderColor: INK, borderWidth: 1.2 });
  text('X', bx, y + 6, 26, { bold: true, align: 'c', width: 40 });
  const nf = wrap(w.nonFiscalBox, bold, 5.5, 96);
  nf.forEach((l, i) => text(l, W / 2 - 48, y + 45 + i * 7, 5.5, { bold: true, align: 'c', width: 96, color: GRAY }));

  const rx = W - M;
  text(w.title[doc.kind].toUpperCase(), rx, y, 19, { bold: true, align: 'r' });
  text(`${w.number} ${doc.number || '-'}`, rx, y + 28, 10.5, { align: 'r' });
  text(`${w.date}: ${fmtDate(doc.date, lang)}`, rx, y + 44, 10, { align: 'r', color: GRAY });
  let rightH = 58;
  const days = parseInt(doc.validity, 10);
  if (doc.kind === 'quote' && days > 0) {
    text(w.validUntil(days, fmtDate(addDays(doc.date, days), lang)), rx, y + 59, 9, { align: 'r', color: GRAY });
    rightH = 72;
  }

  y += Math.max(leftH, rightH, 62) + 12;
  hline(y);
  y += 14;

  // ── Cliente ──
  const clientLines: [string, string][] = [
    [w.client, doc.clientName],
    [w.taxId, doc.clientTaxId],
    [w.address, doc.clientAddress],
  ];
  const filled = clientLines.filter(([, v]) => v.trim());
  if (filled.length) {
    const labelW = 62;
    const rowsH = filled.map(([, v]) => wrap(v, font, 10, CW - 2 * 12 - labelW).length * 13);
    const boxH = rowsH.reduce((a, b) => a + b, 0) + 16;
    page.drawRectangle({ x: M, y: py(y + boxH), width: CW, height: boxH, color: BAND });
    let cy = y + 9;
    filled.forEach(([label, value], i) => {
      text(label, M + 12, cy + 1, 8.5, { bold: true, color: GRAY });
      lines(value, M + 12 + labelW, cy, 10, CW - 24 - labelW, { gap: 3, bold: i === 0 });
      cy += rowsH[i];
    });
    y += boxH + 18;
  }

  const cur = doc.currency;
  const rate = parseNum(doc.vat, lang);
  const vatRate = Number.isFinite(rate) ? rate : 0;
  const rateText = fmtNum(vatRate, lang, 2);

  if (doc.kind === 'receipt') {
    const amount = parseNum(doc.amount, lang);
    const amt = Number.isFinite(amount) ? amount : 0;
    const words = amountInWords(amt, lang, w.currencyName);
    const body = w.receiptText(doc.clientName || '________________', money(amt, cur, lang), words, doc.concept);
    y += lines(body, M, y, 11, CW, { gap: 5 }) + 14;

    page.drawRectangle({ x: M, y: py(y + 46), width: CW, height: 46, borderColor: INK, borderWidth: 1.2 });
    text(w.amountReceived, M + 14, y + 17, 11, { bold: true });
    text(money(amt, cur, lang), W - M - 14, y + 13, 18, { bold: true, align: 'r' });
    y += 46 + 16;

    for (const [label, value] of [[w.method, doc.method], [w.reference, doc.reference]] as const) {
      if (!value.trim()) continue;
      text(label, M, y, 9, { bold: true, color: GRAY });
      y += lines(value, M + 90, y - 1, 10, CW - 90, { gap: 3 }) + 4;
    }
  } else {
    const showPrices = doc.kind === 'quote' || doc.showPrices;
    const rows = doc.items.filter((it) => it.desc.trim() || it.price.trim() || it.qty.trim());
    const qtyW = 52;
    const unitW = 84;
    const amtW = 88;
    const descW = CW - qtyW - (showPrices ? unitW + amtW : 0);

    const header = () => {
      page.drawRectangle({ x: M, y: py(y + 20), width: CW, height: 20, color: HEAD });
      const c = rgb(1, 1, 1);
      text(w.desc, M + 8, y + 6, 8.5, { bold: true, color: c });
      text(w.qty, M + descW + qtyW - 8, y + 6, 8.5, { bold: true, color: c, align: 'r' });
      if (showPrices) {
        text(w.unit, M + descW + qtyW + unitW - 8, y + 6, 8.5, { bold: true, color: c, align: 'r' });
        text(w.amount, W - M - 8, y + 6, 8.5, { bold: true, color: c, align: 'r' });
      }
      y += 20;
    };
    ensure(60);
    header();
    rows.forEach((it, i) => {
      const dl = wrap(it.desc || '-', font, 9.5, descW - 16);
      const rowH = Math.max(dl.length * 12.5 + 10, 24);
      ensure(rowH, header);
      if (i % 2 === 1) page.drawRectangle({ x: M, y: py(y + rowH), width: CW, height: rowH, color: BAND });
      dl.forEach((l, k) => text(l, M + 8, y + 6 + k * 12.5, 9.5));
      const q = parseNum(it.qty, lang);
      text(Number.isFinite(q) ? fmtNum(q, lang, 3) : '-', M + descW + qtyW - 8, y + 6, 9.5, { align: 'r' });
      if (showPrices) {
        const p = parseNum(it.price, lang);
        text(Number.isFinite(p) ? money(p, cur, lang) : '-', M + descW + qtyW + unitW - 8, y + 6, 9.5, { align: 'r' });
        text(money(lineTotal(it, lang), cur, lang), W - M - 8, y + 6, 9.5, { bold: true, align: 'r' });
      }
      y += rowH;
    });
    hline(y, M, W - M, INK, 0.8);
    y += 14;

    if (showPrices) {
      const t = computeTotals(rows, doc.discount, vatRate, doc.vatIncluded, lang);
      const dPct = parseNum(doc.discount, lang);
      const parts: [string, string, boolean?][] = [[w.subtotal, money(t.subtotal, cur, lang)]];
      if (t.discount > 0) parts.push([w.discount(fmtNum(dPct, lang, 2)), money(-t.discount, cur, lang)]);
      if (vatRate > 0) {
        parts.push([w.net, money(t.net, cur, lang)], [doc.vatIncluded ? w.vatIncluded(rateText) : w.vat(rateText), money(t.vat, cur, lang)]);
      }
      parts.push([w.total, money(t.total, cur, lang), true]);
      ensure(parts.length * 18 + 20);
      const bw = 230;
      const bx2 = W - M - bw;
      parts.forEach(([label, value, strong]) => {
        if (strong) {
          page.drawRectangle({ x: bx2, y: py(y + 24), width: bw, height: 24, color: HEAD });
          text(label, bx2 + 10, y + 6, 11, { bold: true, color: rgb(1, 1, 1) });
          text(value, W - M - 10, y + 5, 13, { bold: true, align: 'r', color: rgb(1, 1, 1) });
          y += 24;
        } else {
          text(label, bx2 + 10, y + 2, 9.5, { color: GRAY });
          text(value, W - M - 10, y + 2, 9.5, { align: 'r' });
          y += 18;
        }
      });
      y += 16;
    }
  }

  if (doc.notes.trim()) {
    const nl = wrap(doc.notes, font, 9, CW);
    ensure(20 + nl.length * 12);
    text(w.notes, M, y, 9, { bold: true, color: GRAY });
    y += 14;
    y += lines(doc.notes, M, y, 9, CW, { gap: 3 }) + 10;
  }

  // ── Firmas ──
  if (doc.kind === 'delivery' || doc.kind === 'receipt') {
    ensure(110);
    y += 40;
    const colW = (CW - 40) / 2;
    const labels = doc.kind === 'delivery' ? [w.signature, `${w.signName} / ${w.signId}`] : [w.signature, w.signName];
    labels.forEach((l, i) => {
      const x = M + i * (colW + 40);
      hline(y, x, x + colW, INK, 0.7);
      text(l, x, y + 5, 8.5, { color: GRAY });
    });
    if (doc.kind === 'receipt') text(w.signReceiver, M, y + 20, 8, { color: GRAY });
  }

  // ── Pie de cada página ──
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    page = p;
    hline(H - 44, M, W - M);
    text(w.nonFiscalFoot, M, H - 38, 7.5, { color: GRAY });
    text(w.page(i + 1, pages.length), W - M, H - 38, 7.5, { color: GRAY, align: 'r' });
  });

  return pdf.save();
}
