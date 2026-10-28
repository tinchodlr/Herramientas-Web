import { useMemo, useState } from 'preact/hooks';
import { ClipboardPaste, Download, Plus, Trash2, TriangleAlert } from 'lucide-preact';
import { CopyButton, Field, downloadText, useStoredState, type Lang } from './shared/ui';
import { stripAccents } from '../lib/text';

interface Product {
  name: string;
  category: string;
  var1: string;
  var2: string;
}

const TOKENS = ['{MARCA}', '{CAT}', '{PROD}', '{NUM}', '{VAR1}', '{VAR2}'] as const;

const DEFAULTS = {
  template: '{MARCA}-{CAT}{NUM}-{VAR1}-{VAR2}',
  brand: 'TDA',
  catLen: 3,
  prodLen: 3,
  varLen: 3,
  digits: 3,
  start: 1,
  numMode: 'global' as 'global' | 'category',
};

const EXAMPLE: Record<Lang, Product[]> = {
  es: [
    { name: 'Remera básica', category: 'Indumentaria', var1: 'Negro, Blanco', var2: 'S, M, L' },
    { name: 'Mochila urbana', category: 'Accesorios', var1: 'Azul marino, Gris', var2: '' },
    { name: 'Taza cerámica', category: 'Bazar', var1: '', var2: '' },
  ],
  en: [
    { name: 'Basic t-shirt', category: 'Apparel', var1: 'Black, White', var2: 'S, M, L' },
    { name: 'City backpack', category: 'Accessories', var1: 'Navy blue, Grey', var2: '' },
    { name: 'Ceramic mug', category: 'Kitchen', var1: '', var2: '' },
  ],
};

const T = {
  es: {
    format: 'Formato del SKU',
    template: 'Plantilla',
    templateHint: 'Combiná los marcadores con los separadores que quieras (-, _, /, o ninguno).',
    tokens: {
      '{MARCA}': 'Marca o prefijo',
      '{CAT}': 'Categoría abreviada',
      '{PROD}': 'Producto abreviado',
      '{NUM}': 'Número correlativo',
      '{VAR1}': 'Variante 1 (color)',
      '{VAR2}': 'Variante 2 (talle)',
    } as Record<string, string>,
    brand: 'Marca o prefijo',
    catLen: 'Letras de categoría',
    prodLen: 'Letras de producto',
    varLen: 'Letras de variante',
    digits: 'Dígitos del número',
    start: 'Empezar en',
    numMode: 'Numeración',
    numGlobal: 'Una sola para todo',
    numCategory: 'Por categoría',
    products: 'Productos',
    name: 'Producto',
    category: 'Categoría',
    var1: 'Variante 1 (ej.: colores)',
    var2: 'Variante 2 (ej.: talles)',
    varsHint: 'Separá las variantes con comas: se genera un SKU por cada combinación.',
    addRow: 'Agregar producto',
    paste: 'Pegar lista',
    pasteHint: 'Una fila por producto: Producto; Categoría; Colores; Talles. También podés pegar columnas copiadas de Excel.',
    pasteAdd: 'Agregar a la lista',
    cancel: 'Cancelar',
    clearAll: 'Vaciar lista',
    result: 'SKU generados',
    variant: 'Variante',
    copyAll: 'Copiar SKU',
    csv: 'Descargar CSV',
    duplicates: (n: number) => `Hay ${n} SKU repetidos (marcados en rojo). Cambiá el formato o los nombres para que sean únicos.`,
    empty: 'Agregá al menos un producto con nombre.',
    count: (n: number) => `${n} SKU`,
  },
  en: {
    format: 'SKU format',
    template: 'Template',
    templateHint: 'Combine the tokens with any separators you like (-, _, /, or none).',
    tokens: {
      '{MARCA}': 'Brand or prefix',
      '{CAT}': 'Category abbreviation',
      '{PROD}': 'Product abbreviation',
      '{NUM}': 'Sequential number',
      '{VAR1}': 'Variant 1 (color)',
      '{VAR2}': 'Variant 2 (size)',
    } as Record<string, string>,
    brand: 'Brand or prefix',
    catLen: 'Category letters',
    prodLen: 'Product letters',
    varLen: 'Variant letters',
    digits: 'Number digits',
    start: 'Start at',
    numMode: 'Numbering',
    numGlobal: 'Single sequence',
    numCategory: 'Per category',
    products: 'Products',
    name: 'Product',
    category: 'Category',
    var1: 'Variant 1 (e.g. colors)',
    var2: 'Variant 2 (e.g. sizes)',
    varsHint: 'Separate variants with commas: one SKU is generated for each combination.',
    addRow: 'Add product',
    paste: 'Paste list',
    pasteHint: 'One row per product: Product; Category; Colors; Sizes. You can also paste columns copied from Excel.',
    pasteAdd: 'Add to list',
    cancel: 'Cancel',
    clearAll: 'Clear list',
    result: 'Generated SKUs',
    variant: 'Variant',
    copyAll: 'Copy SKUs',
    csv: 'Download CSV',
    duplicates: (n: number) => `${n} SKUs are repeated (marked in red). Change the format or names so they are unique.`,
    empty: 'Add at least one product with a name.',
    count: (n: number) => `${n} SKUs`,
  },
};

const clean = (s: string) =>
  stripAccents(s)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

/** Abreviatura legible: una palabra → primeras letras; varias → iniciales completadas con la primera palabra. */
export function abbreviate(value: string, len: number) {
  const s = clean(value);
  if (!s) return '';
  if (/^\d/.test(s)) return s.replace(/ /g, '');
  const words = s.split(' ');
  if (words.length === 1) return words[0].slice(0, len);
  const rest = words.slice(1).map((w) => w[0]).join('');
  if (rest.length + 1 >= len) return (words[0][0] + rest).slice(0, len);
  return (words[0].slice(0, len - rest.length) + rest).slice(0, len);
}

const splitList = (s: string) =>
  s
    .split(/[,|]/)
    .map((x) => x.trim())
    .filter(Boolean);

const tidy = (sku: string) =>
  sku
    .replace(/([-_./ ])[-_./ ]+/g, '$1')
    .replace(/^[-_./ ]+|[-_./ ]+$/g, '')
    .replace(/ /g, '');

export default function SkuGenerator({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [cfg, setCfg] = useStoredState('sku-config', DEFAULTS);
  const [rows, setRows] = useStoredState<{ items: Product[] }>('sku-products', { items: EXAMPLE[lang] });
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const set = <K extends keyof typeof DEFAULTS>(k: K, v: (typeof DEFAULTS)[K]) => setCfg((p) => ({ ...p, [k]: v }));
  const items = rows.items;
  const setItems = (next: Product[]) => setRows({ items: next });

  const insertToken = (tok: string) => set('template', cfg.template + tok);

  const generated = useMemo(() => {
    const out: { product: Product; variant: string; sku: string }[] = [];
    const counters = new Map<string, number>();
    let global = cfg.start;
    for (const p of items) {
      if (!p.name.trim()) continue;
      let num: number;
      if (cfg.numMode === 'category') {
        const key = clean(p.category);
        num = counters.get(key) ?? cfg.start;
        counters.set(key, num + 1);
      } else {
        num = global++;
      }
      const v1 = splitList(p.var1);
      const v2 = splitList(p.var2);
      const combos: [string, string][] = [];
      for (const a of v1.length ? v1 : ['']) for (const b of v2.length ? v2 : ['']) combos.push([a, b]);
      for (const [a, b] of combos) {
        const values: Record<string, string> = {
          '{MARCA}': clean(cfg.brand).replace(/ /g, ''),
          '{CAT}': abbreviate(p.category, cfg.catLen),
          '{PROD}': abbreviate(p.name, cfg.prodLen),
          '{NUM}': String(num).padStart(cfg.digits, '0'),
          '{VAR1}': abbreviate(a, cfg.varLen),
          '{VAR2}': abbreviate(b, cfg.varLen),
        };
        const sku = tidy(TOKENS.reduce((acc, tok) => acc.split(tok).join(values[tok]), cfg.template.toUpperCase()));
        out.push({ product: p, variant: [a, b].filter(Boolean).join(' / '), sku });
      }
    }
    return out;
  }, [items, cfg]);

  const dupes = useMemo(() => {
    const seen = new Map<string, number>();
    generated.forEach((g) => seen.set(g.sku, (seen.get(g.sku) ?? 0) + 1));
    return new Set([...seen].filter(([, c]) => c > 1).map(([k]) => k));
  }, [generated]);
  const dupeCount = generated.filter((g) => dupes.has(g.sku)).length;

  const update = (i: number, key: keyof Product, v: string) => setItems(items.map((p, j) => (j === i ? { ...p, [key]: v } : p)));

  const importPaste = () => {
    const parsed = pasteText
      .split(/\r?\n/)
      .map((line) => line.split(line.includes('\t') ? '\t' : ';').map((c) => c.trim()))
      .filter((c) => c[0])
      .map(([name, category = '', var1 = '', var2 = '']) => ({ name, category, var1, var2 }));
    if (parsed.length) setItems([...items.filter((p) => p.name.trim()), ...parsed]);
    setPasteText('');
    setPasteOpen(false);
  };

  const downloadCsv = () => {
    const sep = lang === 'es' ? ';' : ',';
    const esc = (v: string) => (/[";,\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const header = [t.name, t.category, t.variant, 'SKU'];
    const lines = [header, ...generated.map((g) => [g.product.name, g.product.category, g.variant, g.sku])].map((r) => r.map(esc).join(sep));
    downloadText('﻿' + lines.join('\r\n'), 'sku.csv', 'text/csv;charset=utf-8');
  };

  return (
    <div class="stack-lg">
      <section class="panel">
        <h2 class="panel-title">{t.format}</h2>
        <div class="stack">
          <Field label={t.template} htmlFor="sku-template" hint={t.templateHint}>
            <input id="sku-template" class="input mono" value={cfg.template} onInput={(e) => set('template', e.currentTarget.value)} spellcheck={false} />
          </Field>
          <div class="btn-row">
            {TOKENS.map((tok) => (
              <button type="button" key={tok} class="btn btn-sm" onClick={() => insertToken(tok)} title={t.tokens[tok]}>
                <span class="mono">{tok}</span>
              </button>
            ))}
          </div>
          <div class="form-grid sku-cfg">
            <Field label={t.brand} htmlFor="sku-brand">
              <input id="sku-brand" class="input" value={cfg.brand} onInput={(e) => set('brand', e.currentTarget.value)} />
            </Field>
            <NumberField id="sku-cat" label={t.catLen} value={cfg.catLen} min={1} max={6} onChange={(v) => set('catLen', v)} />
            <NumberField id="sku-prod" label={t.prodLen} value={cfg.prodLen} min={1} max={6} onChange={(v) => set('prodLen', v)} />
            <NumberField id="sku-var" label={t.varLen} value={cfg.varLen} min={1} max={6} onChange={(v) => set('varLen', v)} />
            <NumberField id="sku-digits" label={t.digits} value={cfg.digits} min={1} max={8} onChange={(v) => set('digits', v)} />
            <NumberField id="sku-start" label={t.start} value={cfg.start} min={0} max={999999} onChange={(v) => set('start', v)} />
            <Field label={t.numMode} htmlFor="sku-mode">
              <select id="sku-mode" class="select" value={cfg.numMode} onChange={(e) => set('numMode', e.currentTarget.value as 'global' | 'category')}>
                <option value="global">{t.numGlobal}</option>
                <option value="category">{t.numCategory}</option>
              </select>
            </Field>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title" style="margin:0">{t.products}</h2>
          <div class="btn-row">
            <button type="button" class="btn btn-sm" onClick={() => setPasteOpen((o) => !o)}>
              <ClipboardPaste aria-hidden="true" />
              {t.paste}
            </button>
            <button type="button" class="btn btn-sm btn-ghost btn-danger" onClick={() => setItems([{ name: '', category: '', var1: '', var2: '' }])}>
              <Trash2 aria-hidden="true" />
              {t.clearAll}
            </button>
          </div>
        </div>

        {pasteOpen && (
          <div class="subpanel stack" style="margin-bottom:16px">
            <span class="hint">{t.pasteHint}</span>
            <textarea class="textarea mono" rows={5} value={pasteText} onInput={(e) => setPasteText(e.currentTarget.value)} placeholder={lang === 'es' ? 'Buzo canguro; Indumentaria; Negro, Gris; S, M, L, XL' : 'Hoodie; Apparel; Black, Grey; S, M, L, XL'} />
            <div class="btn-row">
              <button type="button" class="btn btn-primary btn-sm" onClick={importPaste} disabled={!pasteText.trim()}>
                {t.pasteAdd}
              </button>
              <button type="button" class="btn btn-sm btn-ghost" onClick={() => setPasteOpen(false)}>
                {t.cancel}
              </button>
            </div>
          </div>
        )}

        <div class="sku-rows">
          <div class="sku-row sku-head hint">
            <span>{t.name}</span>
            <span>{t.category}</span>
            <span>{t.var1}</span>
            <span>{t.var2}</span>
            <span />
          </div>
          {items.map((p, i) => (
            <div class="sku-row" key={i}>
              <input class="input" value={p.name} onInput={(e) => update(i, 'name', e.currentTarget.value)} placeholder={t.name} aria-label={t.name} />
              <input class="input" value={p.category} onInput={(e) => update(i, 'category', e.currentTarget.value)} placeholder={t.category} aria-label={t.category} />
              <input class="input" value={p.var1} onInput={(e) => update(i, 'var1', e.currentTarget.value)} placeholder={t.var1} aria-label={t.var1} />
              <input class="input" value={p.var2} onInput={(e) => update(i, 'var2', e.currentTarget.value)} placeholder={t.var2} aria-label={t.var2} />
              <button type="button" class="btn btn-ghost btn-sm btn-icon btn-danger" aria-label={`${t.name} ${i + 1}: ×`} onClick={() => setItems(items.filter((_, j) => j !== i))}>
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <div class="btn-row" style="margin-top:12px; justify-content:space-between">
          <button type="button" class="btn btn-sm" onClick={() => setItems([...items, { name: '', category: '', var1: '', var2: '' }])}>
            <Plus aria-hidden="true" />
            {t.addRow}
          </button>
          <span class="hint">{t.varsHint}</span>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title" style="margin:0">
            {t.result} <span class="badge">{t.count(generated.length)}</span>
          </h2>
          <div class="btn-row">
            <CopyButton lang={lang} text={generated.map((g) => g.sku).join('\n')} label={t.copyAll} />
            <button type="button" class="btn btn-sm btn-primary" onClick={downloadCsv} disabled={!generated.length}>
              <Download aria-hidden="true" />
              {t.csv}
            </button>
          </div>
        </div>
        {dupeCount > 0 && (
          <div class="alert alert-danger" style="margin-bottom:14px">
            <TriangleAlert aria-hidden="true" />
            <span>{t.duplicates(dupeCount)}</span>
          </div>
        )}
        {generated.length === 0 ? (
          <p class="muted">{t.empty}</p>
        ) : (
          <div class="table-wrap" style="max-height:480px; overflow:auto">
            <table class="table">
              <thead>
                <tr>
                  <th>{t.name}</th>
                  <th>{t.variant}</th>
                  <th>SKU</th>
                </tr>
              </thead>
              <tbody>
                {generated.map((g, i) => (
                  <tr key={i}>
                    <td>{g.product.name}</td>
                    <td class="muted">{g.variant || '—'}</td>
                    <td class={`mono ${dupes.has(g.sku) ? 'negative' : ''}`} style="font-weight:600">
                      {g.sku}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style>{`
        .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
        .sku-cfg { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
        .sku-rows { display: flex; flex-direction: column; gap: 8px; }
        .sku-row { display: grid; grid-template-columns: 1.3fr 1fr 1.2fr 1fr 32px; gap: 8px; align-items: center; }
        @media (max-width: 760px) {
          .sku-row { grid-template-columns: 1fr 1fr 32px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
          .sku-row > :nth-child(1) { grid-column: 1 / 3; }
          .sku-row > :nth-child(5) { grid-column: 3; grid-row: 1; }
          .sku-head { display: none; }
        }
      `}</style>
    </div>
  );
}

function NumberField(props: { id: string; label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <Field label={props.label} htmlFor={props.id}>
      <input
        id={props.id}
        class="input"
        type="number"
        min={props.min}
        max={props.max}
        value={props.value}
        onInput={(e) => {
          const v = Math.round(Number(e.currentTarget.value));
          if (Number.isFinite(v)) props.onChange(Math.min(props.max, Math.max(props.min, v)));
        }}
      />
    </Field>
  );
}
