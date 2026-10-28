import { useMemo, useState } from 'preact/hooks';
import { ArrowLeftRight, Download, TriangleAlert } from 'lucide-preact';
import { CopyButton, Dropzone, Field, Segmented, downloadText, type Lang } from './shared/ui';
import { DELIMITERS, csvToJson, detectDelimiter, jsonToCsv, type Delimiter } from '../lib/csv';

const T = {
  es: {
    csvToJson: 'CSV → JSON',
    jsonToCsv: 'JSON → CSV',
    input: 'Entrada',
    output: 'Resultado',
    pasteCsv: 'Pegá tu CSV o arrastrá el archivo',
    pasteJson: 'Pegá tu JSON o arrastrá el archivo',
    drop: 'Cargar un archivo',
    dropSub: '.csv, .txt o .json',
    delimiter: 'Separador',
    auto: 'Detectar solo',
    names: { ',': 'Coma ( , )', ';': 'Punto y coma ( ; )', '\t': 'Tabulación', '|': 'Barra vertical ( | )' } as Record<string, string>,
    header: 'La primera fila son los títulos de las columnas',
    trim: 'Sacar espacios al principio y al final',
    infer: 'Convertir números, true/false y null',
    inferHint: 'Los códigos con ceros adelante (como 00123) se dejan como texto.',
    decimalComma: 'Los decimales usan coma (1,5)',
    minify: 'Minificar (sin sangría)',
    quoteAll: 'Poner todas las celdas entre comillas',
    bom: 'Compatible con Excel (agrega BOM al descargar)',
    swap: 'Usar el resultado como entrada',
    download: 'Descargar',
    rows: (n: number) => (n === 1 ? '1 fila' : `${n} filas`),
    detected: (d: string) => `Separador detectado: ${d}`,
    errors: { UNCLOSED_QUOTE: 'Hay unas comillas que nunca se cierran.', json: 'El JSON no es válido' } as Record<string, string>,
    sample: 'Ejemplo',
  },
  en: {
    csvToJson: 'CSV → JSON',
    jsonToCsv: 'JSON → CSV',
    input: 'Input',
    output: 'Result',
    pasteCsv: 'Paste your CSV or drop the file',
    pasteJson: 'Paste your JSON or drop the file',
    drop: 'Load a file',
    dropSub: '.csv, .txt or .json',
    delimiter: 'Delimiter',
    auto: 'Auto-detect',
    names: { ',': 'Comma ( , )', ';': 'Semicolon ( ; )', '\t': 'Tab', '|': 'Pipe ( | )' } as Record<string, string>,
    header: 'The first row holds the column titles',
    trim: 'Trim spaces at the start and end',
    infer: 'Convert numbers, true/false and null',
    inferHint: 'Codes with leading zeros (like 00123) stay as text.',
    decimalComma: 'Decimals use a comma (1,5)',
    minify: 'Minify (no indentation)',
    quoteAll: 'Wrap every cell in quotes',
    bom: 'Excel-friendly (adds a BOM when downloading)',
    swap: 'Use the result as input',
    download: 'Download',
    rows: (n: number) => (n === 1 ? '1 row' : `${n} rows`),
    detected: (d: string) => `Detected delimiter: ${d}`,
    errors: { UNCLOSED_QUOTE: 'There is a quote that never closes.', json: 'The JSON is not valid' } as Record<string, string>,
    sample: 'Example',
  },
};

const SAMPLE_CSV = 'sku,producto,precio,stock\nREM-001,Remera negra,12500.5,10\nREM-002,"Remera, blanca",12500.5,0';
const SAMPLE_JSON = '[{"sku":"REM-001","producto":"Remera negra","precio":12500.5,"stock":10},{"sku":"REM-002","producto":"Remera, blanca","precio":12500.5,"stock":0}]';

export default function CsvJson({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [mode, setMode] = useState<'csv' | 'json'>('csv');
  const [text, setText] = useState('');
  const [delim, setDelim] = useState<'auto' | Delimiter>('auto');
  const [opts, setOpts] = useState({ header: true, trim: true, infer: true, decimalComma: lang === 'es', minify: false, quoteAll: false, bom: true });
  const [outDelim, setOutDelim] = useState<Delimiter>(lang === 'es' ? ';' : ',');
  const flag = (k: keyof typeof opts) => (e: Event) => setOpts((o) => ({ ...o, [k]: (e.currentTarget as HTMLInputElement).checked }));

  const result = useMemo(() => {
    if (!text.trim()) return { out: '', count: 0, error: '', used: '' as string };
    try {
      if (mode === 'csv') {
        const d = delim === 'auto' ? detectDelimiter(text) : delim;
        const r = csvToJson(text, d, { header: opts.header, trim: opts.trim, infer: opts.infer, decimalComma: opts.decimalComma, indent: opts.minify ? 0 : 2 });
        return { out: r.json, count: r.count, error: '', used: d };
      }
      const r = jsonToCsv(text, { delimiter: outDelim, quoteAll: opts.quoteAll });
      return { out: r.csv, count: r.count, error: '', used: '' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      return { out: '', count: 0, error: t.errors[msg] ?? `${t.errors.json}${msg ? `: ${msg}` : ''}`, used: '' };
    }
  }, [text, mode, delim, opts, outDelim]);

  const download = () => {
    if (mode === 'csv') downloadText(result.out, 'datos.json', 'application/json;charset=utf-8');
    else downloadText((opts.bom ? '﻿' : '') + result.out, 'datos.csv', 'text/csv;charset=utf-8');
  };

  const readFile = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (f.name.toLowerCase().endsWith('.json')) setMode('json');
    else setMode('csv');
    setText(await f.text());
  };

  return (
    <div class="stack-lg">
      <Segmented
        value={mode}
        onChange={(m) => {
          setMode(m);
          setText('');
        }}
        options={[
          { value: 'csv', label: t.csvToJson },
          { value: 'json', label: t.jsonToCsv },
        ]}
      />

      <div class="tool-layout">
        <section class="panel stack">
          <Field label={t.input} htmlFor="cj-in">
            <textarea
              id="cj-in"
              class="textarea mono"
              rows={12}
              placeholder={mode === 'csv' ? t.pasteCsv : t.pasteJson}
              value={text}
              spellcheck={false}
              onInput={(e) => setText(e.currentTarget.value)}
            />
          </Field>
          <div class="btn-row">
            <button type="button" class="btn btn-sm" onClick={() => setText(mode === 'csv' ? SAMPLE_CSV : SAMPLE_JSON)}>
              {t.sample}
            </button>
          </div>
          <Dropzone lang={lang} accept=".csv,.txt,.json,text/csv,application/json,text/plain" onFiles={readFile} title={t.drop} subtitle={t.dropSub} compact />

          {mode === 'csv' ? (
            <>
              <Field label={t.delimiter} htmlFor="cj-delim" hint={delim === 'auto' && result.used ? t.detected(t.names[result.used]) : undefined}>
                <select id="cj-delim" class="select" value={delim} onChange={(e) => setDelim(e.currentTarget.value as 'auto' | Delimiter)}>
                  <option value="auto">{t.auto}</option>
                  {DELIMITERS.map((d) => (
                    <option key={d} value={d}>
                      {t.names[d]}
                    </option>
                  ))}
                </select>
              </Field>
              <label class="check">
                <input type="checkbox" checked={opts.header} onChange={flag('header')} />
                {t.header}
              </label>
              <label class="check">
                <input type="checkbox" checked={opts.trim} onChange={flag('trim')} />
                {t.trim}
              </label>
              <label class="check">
                <input type="checkbox" checked={opts.infer} onChange={flag('infer')} />
                {t.infer}
              </label>
              {opts.infer && <span class="hint">{t.inferHint}</span>}
              {opts.infer && (
                <label class="check">
                  <input type="checkbox" checked={opts.decimalComma} onChange={flag('decimalComma')} />
                  {t.decimalComma}
                </label>
              )}
              <label class="check">
                <input type="checkbox" checked={opts.minify} onChange={flag('minify')} />
                {t.minify}
              </label>
            </>
          ) : (
            <>
              <Field label={t.delimiter} htmlFor="cj-out-delim">
                <select id="cj-out-delim" class="select" value={outDelim} onChange={(e) => setOutDelim(e.currentTarget.value as Delimiter)}>
                  {DELIMITERS.map((d) => (
                    <option key={d} value={d}>
                      {t.names[d]}
                    </option>
                  ))}
                </select>
              </Field>
              <label class="check">
                <input type="checkbox" checked={opts.quoteAll} onChange={flag('quoteAll')} />
                {t.quoteAll}
              </label>
              <label class="check">
                <input type="checkbox" checked={opts.bom} onChange={flag('bom')} />
                {t.bom}
              </label>
            </>
          )}
        </section>

        <section class="panel stack">
          <div class="cj-head">
            <span class="label">{t.output}</span>
            {result.out && <span class="badge">{t.rows(result.count)}</span>}
          </div>
          {result.error ? (
            <div class="alert alert-danger">
              <TriangleAlert aria-hidden="true" />
              <div>{result.error}</div>
            </div>
          ) : (
            <pre class="output cj-out" tabIndex={0}>{result.out}</pre>
          )}
          <div class="btn-row">
            <CopyButton lang={lang} class="btn btn-primary" text={result.out} />
            <button type="button" class="btn" disabled={!result.out} onClick={download}>
              <Download aria-hidden="true" />
              {t.download}
            </button>
            <button
              type="button"
              class="btn btn-ghost"
              disabled={!result.out}
              onClick={() => {
                setText(result.out);
                setMode(mode === 'csv' ? 'json' : 'csv');
              }}
            >
              <ArrowLeftRight aria-hidden="true" />
              {t.swap}
            </button>
          </div>
        </section>
      </div>

      <style>{`
        .cj-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .cj-out { margin: 0; min-height: 260px; max-height: 520px; overflow: auto; white-space: pre; }
      `}</style>
    </div>
  );
}
