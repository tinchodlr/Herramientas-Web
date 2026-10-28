import { useEffect, useRef, useState } from 'preact/hooks';
import { FileDown } from 'lucide-preact';
import { COMMON, Dropzone, Segmented, downloadBlob, formatBytes, type Lang } from './shared/ui';
import { FileOrderList } from './shared/FileOrderList';

interface Item {
  id: number;
  file: File;
  url: string;
}

type PageSize = 'a4' | 'letter' | 'fit';
type Orientation = 'auto' | 'portrait' | 'landscape';

const SIZES = { a4: [595.28, 841.89], letter: [612, 792] } as const;
const MM = 72 / 25.4;

const T = {
  es: {
    drop: 'Arrastrá tus imágenes acá',
    sub: 'JPG, PNG o WebP · se ordenan como las agregues',
    size: 'Tamaño de hoja',
    a4: 'A4',
    letter: 'Carta',
    fit: 'Igual a la imagen',
    orientation: 'Orientación',
    auto: 'Automática',
    portrait: 'Vertical',
    landscape: 'Horizontal',
    margin: 'Margen',
    none: 'Sin margen',
    small: 'Chico',
    big: 'Grande',
    create: 'Crear PDF',
    count: (n: number) => (n === 1 ? '1 imagen = 1 página' : `${n} imágenes = ${n} páginas`),
  },
  en: {
    drop: 'Drop your images here',
    sub: 'JPG, PNG or WebP · ordered as you add them',
    size: 'Page size',
    a4: 'A4',
    letter: 'Letter',
    fit: 'Same as image',
    orientation: 'Orientation',
    auto: 'Automatic',
    portrait: 'Portrait',
    landscape: 'Landscape',
    margin: 'Margin',
    none: 'None',
    small: 'Small',
    big: 'Large',
    create: 'Create PDF',
    count: (n: number) => (n === 1 ? '1 image = 1 page' : `${n} images = ${n} pages`),
  },
};

/** pdf-lib solo embebe JPG y PNG: el resto se pasa por un canvas a JPG. */
async function toEmbeddable(file: File): Promise<{ bytes: ArrayBuffer; kind: 'jpg' | 'png' }> {
  if (file.type === 'image/jpeg') return { bytes: await file.arrayBuffer(), kind: 'jpg' };
  if (file.type === 'image/png') return { bytes: await file.arrayBuffer(), kind: 'png' };
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0);
  const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/jpeg', 0.92));
  return { bytes: await blob.arrayBuffer(), kind: 'jpg' };
}

let nextId = 1;

export default function ImagesToPdf({ lang }: { lang: Lang }) {
  const t = T[lang];
  const c = COMMON[lang];
  const [items, setItems] = useState<Item[]>([]);
  const [size, setSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('auto');
  const [margin, setMargin] = useState(10);
  const [busy, setBusy] = useState(false);
  const urls = useRef(new Set<string>());

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const add = (files: File[]) =>
    setItems((list) => [
      ...list,
      ...files.map((file) => {
        const url = URL.createObjectURL(file);
        urls.current.add(url);
        return { id: nextId++, file, url };
      }),
    ]);

  const create = async () => {
    setBusy(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.create();
      for (const it of items) {
        const { bytes, kind } = await toEmbeddable(it.file);
        const img = kind === 'jpg' ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
        const m = margin * MM;
        let pw: number, ph: number;
        if (size === 'fit') {
          pw = img.width + 2 * m;
          ph = img.height + 2 * m;
        } else {
          const [w, h] = SIZES[size];
          const landscape = orientation === 'landscape' || (orientation === 'auto' && img.width > img.height);
          [pw, ph] = landscape ? [h, w] : [w, h];
        }
        const page = doc.addPage([pw, ph]);
        const scale = Math.min((pw - 2 * m) / img.width, (ph - 2 * m) / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        page.drawImage(img, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });
      }
      const bytes = await doc.save();
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), lang === 'es' ? 'imagenes.pdf' : 'images.pdf');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="tool-layout wide-left">
      <div class="stack">
        <Dropzone lang={lang} accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif" multiple onFiles={add} title={t.drop} subtitle={t.sub} compact={items.length > 0} />
        {items.length > 0 && (
          <FileOrderList
            lang={lang}
            items={items}
            onChange={(next) => {
              items.filter((x) => !next.includes(x)).forEach((x) => (URL.revokeObjectURL(x.url), urls.current.delete(x.url)));
              setItems(next);
            }}
            render={(it) => ({ thumb: <img class="thumb" src={it.url} alt="" />, name: it.file.name, sub: formatBytes(it.file.size, lang) })}
          />
        )}
      </div>
      <section class="panel stack sticky">
        <div class="field">
          <span class="label">{t.size}</span>
          <Segmented value={size} onChange={setSize} options={[{ value: 'a4', label: t.a4 }, { value: 'letter', label: t.letter }, { value: 'fit', label: t.fit }]} />
        </div>
        {size !== 'fit' && (
          <div class="field">
            <span class="label">{t.orientation}</span>
            <Segmented
              value={orientation}
              onChange={setOrientation}
              options={[{ value: 'auto', label: t.auto }, { value: 'portrait', label: t.portrait }, { value: 'landscape', label: t.landscape }]}
            />
          </div>
        )}
        <div class="field">
          <span class="label">{t.margin}</span>
          <Segmented
            value={String(margin)}
            onChange={(v) => setMargin(Number(v))}
            options={[{ value: '0', label: t.none }, { value: '10', label: `${t.small} · 10 mm` }, { value: '20', label: `${t.big} · 20 mm` }]}
          />
        </div>
        <hr class="divider" />
        <span class="muted small">{items.length ? t.count(items.length) : ''}</span>
        <button type="button" class="btn btn-primary" disabled={!items.length || busy} onClick={create}>
          <FileDown aria-hidden="true" />
          {busy ? c.processing : t.create}
        </button>
      </section>
    </div>
  );
}
