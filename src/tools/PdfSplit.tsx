import { useState } from 'preact/hooks';
import { FileText, Scissors, Trash2, TriangleAlert } from 'lucide-preact';
import { COMMON, Dropzone, Field, Segmented, downloadBlob, formatBytes, zipBlobs, type Lang } from './shared/ui';

const T = {
  es: {
    drop: 'Arrastrá un PDF acá',
    pages: (n: number) => (n === 1 ? '1 página' : `${n} páginas`),
    mode: '¿Qué querés hacer?',
    range: 'Extraer páginas',
    each: 'Un archivo por página',
    chunks: 'Cortar cada N páginas',
    rangeLabel: 'Páginas',
    rangeHint: 'Ej.: 1-3, 5, 8-10. Usá "8-" para ir hasta el final.',
    every: 'Páginas por archivo',
    run: 'Dividir y descargar',
    selected: (n: number) => `${n} páginas seleccionadas`,
    files: (n: number) => `Se generan ${n} archivos (en un .zip)`,
    badRange: 'Revisá las páginas: hay números fuera de rango o mal escritos.',
    encrypted: 'Este PDF está protegido con contraseña y no se puede dividir.',
    invalid: 'No pudimos leer el archivo. ¿Es un PDF válido?',
  },
  en: {
    drop: 'Drop a PDF here',
    pages: (n: number) => (n === 1 ? '1 page' : `${n} pages`),
    mode: 'What do you want to do?',
    range: 'Extract pages',
    each: 'One file per page',
    chunks: 'Split every N pages',
    rangeLabel: 'Pages',
    rangeHint: 'E.g. 1-3, 5, 8-10. Use "8-" to go to the end.',
    every: 'Pages per file',
    run: 'Split and download',
    selected: (n: number) => `${n} pages selected`,
    files: (n: number) => `${n} files will be created (in a .zip)`,
    badRange: 'Check the pages: some numbers are out of range or invalid.',
    encrypted: 'This PDF is password protected and cannot be split.',
    invalid: 'We could not read the file. Is it a valid PDF?',
  },
};

/** "1-3, 5, 8-" → [0,1,2,4,7,…] (índices base 0). Devuelve null si algo no es válido. */
export function parseRanges(input: string, total: number): number[] | null {
  const out: number[] = [];
  for (const part of input.split(/[,;]/).map((p) => p.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)\s*(?:-\s*(\d*))?$/);
    if (!m) return null;
    const a = Number(m[1]);
    const b = m[2] === undefined ? a : m[2] === '' ? total : Number(m[2]);
    if (a < 1 || b > total || a > b) return null;
    for (let p = a; p <= b; p++) out.push(p - 1);
  }
  return out.length ? out : null;
}

export default function PdfSplit({ lang }: { lang: Lang }) {
  const t = T[lang];
  const c = COMMON[lang];
  const [file, setFile] = useState<File | null>(null);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState<'range' | 'each' | 'chunks'>('range');
  const [range, setRange] = useState('1');
  const [every, setEvery] = useState(2);
  const [busy, setBusy] = useState(false);

  const load = async ([f]: File[]) => {
    setFile(f);
    setTotal(0);
    setLoadError('');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.load(await f.arrayBuffer());
      const n = doc.getPageCount();
      setTotal(n);
      setRange(n > 1 ? `1-${Math.min(n, 3)}` : '1');
    } catch (e) {
      setLoadError(String(e).toLowerCase().includes('encrypt') ? t.encrypted : t.invalid);
    }
  };

  const selection = mode === 'range' ? parseRanges(range, total) : null;
  const groups: number[][] =
    mode === 'range'
      ? selection
        ? [selection]
        : []
      : Array.from({ length: Math.ceil(total / (mode === 'each' ? 1 : every)) }, (_, g) => {
          const size = mode === 'each' ? 1 : every;
          return Array.from({ length: Math.min(size, total - g * size) }, (_, k) => g * size + k);
        });

  const base = file?.name.replace(/\.pdf$/i, '') ?? 'documento';

  const run = async () => {
    if (!file || !groups.length) return;
    setBusy(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const src = await PDFDocument.load(await file.arrayBuffer());
      const outputs: { name: string; blob: Blob }[] = [];
      for (const g of groups) {
        const doc = await PDFDocument.create();
        (await doc.copyPages(src, g)).forEach((p) => doc.addPage(p));
        const label = g.length === 1 ? `${g[0] + 1}` : `${g[0] + 1}-${g[g.length - 1] + 1}`;
        outputs.push({ name: `${base}_${mode === 'range' ? (lang === 'es' ? 'extracto' : 'extract') : label}.pdf`, blob: new Blob([(await doc.save()) as BlobPart], { type: 'application/pdf' }) });
      }
      if (outputs.length === 1) downloadBlob(outputs[0].blob, outputs[0].name);
      else downloadBlob(await zipBlobs(outputs), `${base}_${lang === 'es' ? 'dividido' : 'split'}.zip`);
    } finally {
      setBusy(false);
    }
  };

  if (!file) return <Dropzone lang={lang} accept="application/pdf,.pdf" onFiles={load} title={t.drop} />;

  return (
    <div class="stack" style="max-width:820px">
      <div class="file-item">
        <span class="icon-tile" data-cat="pdf">
          <FileText aria-hidden="true" />
        </span>
        <div class="meta">
          <div class="name">{file.name}</div>
          <div class="sub">
            {formatBytes(file.size, lang)}
            {total > 0 && ` · ${t.pages(total)}`}
            {!total && !loadError && ` · ${c.processing}`}
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-ghost btn-icon btn-danger" onClick={() => setFile(null)} aria-label={c.remove}>
          <Trash2 aria-hidden="true" />
        </button>
      </div>

      {loadError && (
        <div class="alert alert-danger">
          <TriangleAlert aria-hidden="true" />
          <span>{loadError}</span>
        </div>
      )}

      {total > 0 && (
        <section class="panel stack">
          <div class="field">
            <span class="label">{t.mode}</span>
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'range', label: t.range },
                { value: 'each', label: t.each },
                { value: 'chunks', label: t.chunks },
              ]}
            />
          </div>
          {mode === 'range' && (
            <Field label={t.rangeLabel} htmlFor="split-range" hint={selection ? t.selected(selection.length) : t.rangeHint}>
              <input id="split-range" class="input mono" value={range} onInput={(e) => setRange(e.currentTarget.value)} aria-invalid={!selection} />
            </Field>
          )}
          {mode === 'range' && !selection && range.trim() && <p class="negative small">{t.badRange}</p>}
          {mode === 'chunks' && (
            <Field label={t.every} htmlFor="split-every">
              <input id="split-every" class="input" style="max-width:140px" type="number" min={1} max={total} value={every} onInput={(e) => setEvery(Math.min(total, Math.max(1, Number(e.currentTarget.value) || 1)))} />
            </Field>
          )}
          <div class="btn-row" style="justify-content:space-between">
            <span class="muted small">{groups.length > 1 ? t.files(groups.length) : ''}</span>
            <button type="button" class="btn btn-primary" disabled={!groups.length || busy} onClick={run}>
              <Scissors aria-hidden="true" />
              {busy ? c.processing : t.run}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
