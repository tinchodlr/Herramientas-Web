export type Delimiter = ',' | ';' | '\t' | '|';
export const DELIMITERS: Delimiter[] = [',', ';', '\t', '|'];

/** Elige el separador que más aparece en la primera línea (fuera de comillas). */
export function detectDelimiter(text: string): Delimiter {
  const counts = new Map<Delimiter, number>(DELIMITERS.map((d) => [d, 0]));
  let quoted = false;
  for (const ch of text.replace(/^﻿/, '')) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === '\n' || ch === '\r')) break;
    else if (!quoted && counts.has(ch as Delimiter)) counts.set(ch as Delimiter, counts.get(ch as Delimiter)! + 1);
  }
  let best: Delimiter = ',';
  for (const [d, n] of counts) if (n > counts.get(best)!) best = d;
  return best;
}

/** Lector CSV (RFC 4180): comillas, comillas dobles escapadas y saltos de línea dentro de un campo. */
export function parseCsv(input: string, delimiter: Delimiter): string[][] {
  const text = input.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;
  const endRow = () => {
    row.push(field);
    field = '';
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
  };
  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      endRow();
    } else field += ch;
    i++;
  }
  if (quoted) throw new Error('UNCLOSED_QUOTE');
  if (field !== '' || row.length) endRow();
  return rows;
}

export function inferValue(raw: string, decimalComma: boolean): string | number | boolean | null {
  if (/^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(raw)) return Number(raw);
  if (decimalComma && /^-?(0|[1-9]\d{0,14}),\d+$/.test(raw)) return Number(raw.replace(',', '.'));
  if (raw === 'true' || raw === 'false') return raw === 'true';
  if (raw === 'null') return null;
  return raw;
}

export interface CsvToJsonOptions {
  header: boolean;
  trim: boolean;
  infer: boolean;
  decimalComma: boolean;
  indent: number;
}

export function csvToJson(text: string, delimiter: Delimiter, o: CsvToJsonOptions) {
  const rows = parseCsv(text, delimiter).map((r) => (o.trim ? r.map((c) => c.trim()) : r));
  const val = (c: string) => (o.infer ? inferValue(c, o.decimalComma) : c);
  if (!rows.length) return { json: '[]', count: 0 };
  if (!o.header) return { json: JSON.stringify(rows.map((r) => r.map(val)), null, o.indent || undefined), count: rows.length };
  const used = new Map<string, number>();
  const keys = rows[0].map((h, i) => {
    const base = h || `col${i + 1}`;
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    return n > 1 ? `${base}_${n}` : base;
  });
  const objects = rows.slice(1).map((r) => Object.fromEntries(keys.map((k, i) => [k, i < r.length ? val(r[i]) : null])));
  return { json: JSON.stringify(objects, null, o.indent || undefined), count: objects.length };
}

type Flat = Record<string, string>;

function flatten(value: unknown, prefix: string, out: Flat) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length && prefix) out[prefix] = '';
    for (const [k, v] of entries) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else if (Array.isArray(value)) out[prefix] = JSON.stringify(value);
  else out[prefix] = value === null || value === undefined ? '' : String(value);
}

export interface JsonToCsvOptions {
  delimiter: Delimiter;
  quoteAll: boolean;
}

export function jsonToCsv(text: string, o: JsonToCsvOptions) {
  const data = JSON.parse(text);
  const list: unknown[] = Array.isArray(data) ? data : [data];
  const table: Flat[] = [];
  const columns: string[] = [];
  const arrayRows = list.every((x) => Array.isArray(x));
  if (arrayRows) {
    const lines = (list as unknown[][]).map((r) => r.map((c) => (c !== null && typeof c === 'object' ? JSON.stringify(c) : c === null || c === undefined ? '' : String(c))));
    return { csv: lines.map((r) => r.map((c) => quote(c, o)).join(o.delimiter)).join('\r\n'), count: lines.length };
  }
  for (const item of list) {
    const flat: Flat = {};
    if (item !== null && typeof item === 'object') flatten(item, '', flat);
    else flat.value = item === null || item === undefined ? '' : String(item);
    for (const k of Object.keys(flat)) if (!columns.includes(k)) columns.push(k);
    table.push(flat);
  }
  const lines = [columns.map((c) => quote(c, o)).join(o.delimiter), ...table.map((r) => columns.map((c) => quote(r[c] ?? '', o)).join(o.delimiter))];
  return { csv: lines.join('\r\n'), count: table.length };
}

function quote(cell: string, o: JsonToCsvOptions) {
  const needs = o.quoteAll || cell.includes(o.delimiter) || /["\r\n]/.test(cell) || /^\s|\s$/.test(cell);
  return needs ? `"${cell.replace(/"/g, '""')}"` : cell;
}
