import { useMemo, useState } from 'preact/hooks';
import { CircleCheck, Download, TriangleAlert } from 'lucide-preact';
import { CopyButton, Segmented, downloadText, type Lang } from './shared/ui';

const SAMPLE = '{"tienda":"Mi Tienda","activo":true,"productos":[{"sku":"TDA-IND001-NEG-S","precio":25000,"stock":12},{"sku":"TDA-ACC002-AZM","precio":48000,"stock":3}],"envio":{"gratis_desde":33000,"zonas":["CABA","GBA"]}}';

const T = {
  es: {
    input: 'JSON de entrada',
    output: 'Resultado',
    format: 'Formatear',
    minify: 'Minificar',
    indent: 'Sangría',
    tab: 'Tab',
    sort: 'Ordenar claves alfabéticamente',
    valid: 'JSON válido',
    invalid: 'JSON inválido',
    at: (l: number, c: number) => `línea ${l}, columna ${c}`,
    download: 'Descargar .json',
    stats: (keys: number, depth: number, size: string) => `${keys} claves · ${depth} niveles · ${size}`,
    placeholder: 'Pegá tu JSON acá…',
  },
  en: {
    input: 'Input JSON',
    output: 'Result',
    format: 'Format',
    minify: 'Minify',
    indent: 'Indent',
    tab: 'Tab',
    sort: 'Sort keys alphabetically',
    valid: 'Valid JSON',
    invalid: 'Invalid JSON',
    at: (l: number, c: number) => `line ${l}, column ${c}`,
    download: 'Download .json',
    stats: (keys: number, depth: number, size: string) => `${keys} keys · ${depth} levels · ${size}`,
    placeholder: 'Paste your JSON here…',
  },
};

const sortKeys = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(sortKeys)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort((a, b) => a.localeCompare(b)).map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]))
      : v;

function measure(v: unknown, depth = 1): { keys: number; depth: number } {
  if (!v || typeof v !== 'object') return { keys: 0, depth: depth - 1 };
  const children = Array.isArray(v) ? v : Object.values(v);
  let keys = Array.isArray(v) ? 0 : children.length;
  let max = depth;
  for (const c of children) {
    const m = measure(c, depth + 1);
    keys += m.keys;
    max = Math.max(max, m.depth);
  }
  return { keys, depth: max };
}

/** Saca línea y columna del mensaje de error, que cambia según el navegador. */
function errorPosition(msg: string, text: string): { line: number; col: number } | null {
  const lc = msg.match(/line (\d+) column (\d+)/);
  if (lc) return { line: Number(lc[1]), col: Number(lc[2]) };
  const pos = msg.match(/position (\d+)/);
  if (!pos) return null;
  const before = text.slice(0, Number(pos[1]));
  const lines = before.split('\n');
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}

export default function JsonFormatter({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [input, setInput] = useState(SAMPLE);
  const [mode, setMode] = useState<'format' | 'minify'>('format');
  const [indent, setIndent] = useState('2');
  const [sort, setSort] = useState(false);

  const result = useMemo(() => {
    if (!input.trim()) return { ok: true as const, output: '', info: '' };
    try {
      let data = JSON.parse(input);
      if (sort) data = sortKeys(data);
      const output = mode === 'minify' ? JSON.stringify(data) : JSON.stringify(data, null, indent === 'tab' ? '\t' : Number(indent));
      const m = measure(data);
      const size = new Blob([output]).size;
      return { ok: true as const, output, info: t.stats(m.keys, m.depth, size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`) };
    } catch (e) {
      const msg = (e as Error).message;
      const pos = errorPosition(msg, input);
      return { ok: false as const, output: '', error: msg, pos };
    }
  }, [input, mode, indent, sort, lang]);

  return (
    <div class="stack">
      <div class="btn-row" style="justify-content:space-between">
        <div class="btn-row">
          <Segmented value={mode} onChange={setMode} options={[{ value: 'format', label: t.format }, { value: 'minify', label: t.minify }]} />
          {mode === 'format' && (
            <select class="select" style="width:auto" value={indent} onChange={(e) => setIndent(e.currentTarget.value)} aria-label={t.indent}>
              <option value="2">{t.indent}: 2</option>
              <option value="4">{t.indent}: 4</option>
              <option value="tab">{t.indent}: {t.tab}</option>
            </select>
          )}
          <label class="check">
            <input type="checkbox" checked={sort} onChange={(e) => setSort(e.currentTarget.checked)} />
            {t.sort}
          </label>
        </div>
        {input.trim() &&
          (result.ok ? (
            <span class="badge badge-success">
              <CircleCheck aria-hidden="true" />
              {t.valid}
            </span>
          ) : (
            <span class="badge badge-danger">
              <TriangleAlert aria-hidden="true" />
              {t.invalid}
              {result.pos && ` · ${t.at(result.pos.line, result.pos.col)}`}
            </span>
          ))}
      </div>

      <div class="tool-layout">
        <div class="field">
          <label class="label" htmlFor="json-in">
            {t.input}
          </label>
          <textarea
            id="json-in"
            class="textarea mono json-area"
            value={input}
            onInput={(e) => setInput(e.currentTarget.value)}
            spellcheck={false}
            placeholder={t.placeholder}
            aria-invalid={!result.ok}
          />
        </div>
        <div class="field">
          <span class="label">{t.output}</span>
          {result.ok ? (
            <textarea class="textarea mono json-area" readOnly value={result.output} aria-label={t.output} />
          ) : (
            <div class="alert alert-danger mono json-area" style="align-items:flex-start">
              <TriangleAlert aria-hidden="true" />
              <span>{result.error}</span>
            </div>
          )}
          <div class="btn-row" style="justify-content:space-between">
            <span class="hint">{result.ok ? result.info : ''}</span>
            <div class="btn-row">
              <CopyButton lang={lang} text={result.ok ? result.output : ''} />
              <button type="button" class="btn btn-sm" disabled={!result.ok || !result.output} onClick={() => downloadText(result.ok ? result.output : '', 'datos.json', 'application/json')}>
                <Download aria-hidden="true" />
                {t.download}
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`.json-area { min-height: 420px; font-size: 13px; tab-size: 2; white-space: pre; overflow: auto; }`}</style>
    </div>
  );
}
