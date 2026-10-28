import { useState } from 'preact/hooks';
import { Combine, FileText, TriangleAlert } from 'lucide-preact';
import { COMMON, Dropzone, downloadBlob, formatBytes, type Lang } from './shared/ui';
import { FileOrderList } from './shared/FileOrderList';

interface Item {
  id: number;
  file: File;
  pages?: number;
  error?: string;
}

const T = {
  es: {
    drop: 'Arrastrá tus PDF acá',
    sub: 'Podés agregar todos los que quieras y ordenarlos',
    pages: (n: number) => (n === 1 ? '1 página' : `${n} páginas`),
    merge: 'Unir PDF y descargar',
    needTwo: 'Agregá al menos dos PDF para unirlos.',
    encrypted: 'Está protegido con contraseña',
    invalid: 'No es un PDF válido',
    total: (files: number, pages: number) => `${files} archivos · ${pages} páginas en total`,
  },
  en: {
    drop: 'Drop your PDFs here',
    sub: 'Add as many as you want and reorder them',
    pages: (n: number) => (n === 1 ? '1 page' : `${n} pages`),
    merge: 'Merge PDF and download',
    needTwo: 'Add at least two PDFs to merge them.',
    encrypted: 'It is password protected',
    invalid: 'Not a valid PDF',
    total: (files: number, pages: number) => `${files} files · ${pages} pages in total`,
  },
};

let nextId = 1;

export default function PdfMerge({ lang }: { lang: Lang }) {
  const t = T[lang];
  const c = COMMON[lang];
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const add = async (files: File[]) => {
    const { PDFDocument } = await import('pdf-lib');
    const fresh = files.map((file) => ({ id: nextId++, file }));
    setItems((list) => [...list, ...fresh]);
    for (const it of fresh) {
      let patch: Partial<Item>;
      try {
        const doc = await PDFDocument.load(await it.file.arrayBuffer());
        patch = { pages: doc.getPageCount() };
      } catch (e) {
        patch = { error: String(e).toLowerCase().includes('encrypt') ? t.encrypted : t.invalid };
      }
      setItems((list) => list.map((x) => (x.id === it.id ? { ...x, ...patch } : x)));
    }
  };

  const valid = items.filter((i) => i.pages && !i.error);

  const merge = async () => {
    setBusy(true);
    setError('');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const out = await PDFDocument.create();
      for (const it of valid) {
        const src = await PDFDocument.load(await it.file.arrayBuffer());
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      const bytes = await out.save();
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), lang === 'es' ? 'pdf-unido.pdf' : 'merged.pdf');
    } catch {
      setError(c.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="stack" style="max-width:820px">
      <Dropzone lang={lang} accept="application/pdf,.pdf" multiple onFiles={add} title={t.drop} subtitle={t.sub} compact={items.length > 0} />
      {items.length > 0 && (
        <FileOrderList
          lang={lang}
          items={items}
          onChange={setItems}
          render={(it) => ({
            thumb: (
              <span class="icon-tile" data-cat="pdf">
                <FileText aria-hidden="true" />
              </span>
            ),
            name: it.file.name,
            sub: it.error ? (
              <span class="negative">{it.error}</span>
            ) : (
              <>
                {formatBytes(it.file.size, lang)}
                {it.pages ? ` · ${t.pages(it.pages)}` : ` · ${c.processing}`}
              </>
            ),
          })}
        />
      )}
      {error && (
        <div class="alert alert-danger">
          <TriangleAlert aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      <div class="btn-row" style="justify-content:space-between">
        <span class="muted small">{valid.length >= 2 ? t.total(valid.length, valid.reduce((a, i) => a + (i.pages ?? 0), 0)) : t.needTwo}</span>
        <button type="button" class="btn btn-primary" disabled={valid.length < 2 || busy} onClick={merge}>
          <Combine aria-hidden="true" />
          {busy ? c.processing : t.merge}
        </button>
      </div>
    </div>
  );
}
