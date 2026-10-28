import { useEffect, useRef, useState } from 'preact/hooks';
import { Download, Trash2, TriangleAlert } from 'lucide-preact';
import { COMMON, Dropzone, Field, Segmented, downloadBlob, formatBytes, withExtension, zipBlobs, type Lang } from './shared/ui';

type Preset = 'webp' | 'compress' | 'resize';
type Format = 'original' | 'image/webp' | 'image/jpeg' | 'image/png';

interface Settings {
  format: Format;
  quality: number;
  resize: boolean;
  maxW: number;
  maxH: number;
}

interface Item {
  id: number;
  file: File;
  status: 'pending' | 'done' | 'error';
  blob?: Blob;
  url?: string;
  w?: number;
  h?: number;
  outW?: number;
  outH?: number;
}

const PRESETS: Record<Preset, Settings> = {
  webp: { format: 'image/webp', quality: 82, resize: false, maxW: 1600, maxH: 1600 },
  compress: { format: 'original', quality: 70, resize: false, maxW: 1920, maxH: 1920 },
  resize: { format: 'original', quality: 90, resize: true, maxW: 1200, maxH: 1200 },
};

const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

const T = {
  es: {
    format: 'Formato de salida',
    original: 'Original',
    quality: 'Calidad',
    qualityHint: 'Entre 70 y 85 suele ser imperceptible y ahorra mucho peso.',
    pngNoQuality: 'PNG no tiene ajuste de calidad (es sin pérdida). Para achicar un PNG, pasalo a WebP o JPG.',
    resize: 'Limitar el tamaño',
    maxW: 'Ancho máximo (px)',
    maxH: 'Alto máximo (px)',
    resizeHint: 'Mantiene la proporción. Las imágenes más chicas no se agrandan.',
    drop: 'Arrastrá tus imágenes acá',
    sub: 'JPG, PNG, WebP, GIF, BMP o AVIF · todas las que quieras',
    total: (n: number, before: string, after: string) => `${n} ${n === 1 ? 'imagen' : 'imágenes'} · ${before} → ${after}`,
    noWebp: 'Tu navegador no puede generar este formato y usó PNG. Probá con Chrome, Edge o Firefox.',
    unsupported: 'No se pudo leer esta imagen',
  },
  en: {
    format: 'Output format',
    original: 'Original',
    quality: 'Quality',
    qualityHint: 'Between 70 and 85 is usually invisible and saves a lot of weight.',
    pngNoQuality: 'PNG has no quality setting (it is lossless). To shrink a PNG, convert it to WebP or JPG.',
    resize: 'Limit size',
    maxW: 'Max width (px)',
    maxH: 'Max height (px)',
    resizeHint: 'Keeps the aspect ratio. Smaller images are never enlarged.',
    drop: 'Drop your images here',
    sub: 'JPG, PNG, WebP, GIF, BMP or AVIF · as many as you want',
    total: (n: number, before: string, after: string) => `${n} ${n === 1 ? 'image' : 'images'} · ${before} → ${after}`,
    noWebp: 'Your browser cannot create this format and used PNG instead. Try Chrome, Edge or Firefox.',
    unsupported: 'Could not read this image',
  },
};

const outputType = (file: File, s: Settings) => {
  if (s.format !== 'original') return s.format;
  return EXT[file.type] ? file.type : 'image/png';
};

async function convert(file: File, s: Settings) {
  const bmp = await createImageBitmap(file);
  const scale = s.resize ? Math.min(1, s.maxW / bmp.width, s.maxH / bmp.height) : 1;
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const type = outputType(file, s);
  if (type === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), type, s.quality / 100),
  );
  return { blob, w: Math.round(w / scale), h: Math.round(h / scale), outW: w, outH: h };
}

let nextId = 1;

export default function ImageConverter({ lang, preset }: { lang: Lang; preset: Preset }) {
  const t = T[lang];
  const c = COMMON[lang];
  const [s, setS] = useState<Settings>(PRESETS[preset]);
  const [items, setItems] = useState<Item[]>([]);
  const [zipping, setZipping] = useState(false);
  const run = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));

  // Reprocesa todo cuando cambian los ajustes o se agregan imágenes (con una pequeña espera
  // para no recalcular en cada movimiento del control de calidad).
  const ids = items.map((i) => i.id).join(',');
  useEffect(() => {
    if (!items.length) return;
    const myRun = ++run.current;
    const timer = setTimeout(async () => {
      for (const item of itemsRef.current) {
        if (run.current !== myRun) return;
        try {
          const r = await convert(item.file, s);
          if (run.current !== myRun) return;
          setItems((list) =>
            list.map((x) => {
              if (x.id !== item.id) return x;
              if (x.url) URL.revokeObjectURL(x.url);
              return { ...x, ...r, status: 'done', url: URL.createObjectURL(r.blob) };
            }),
          );
        } catch {
          setItems((list) => list.map((x) => (x.id === item.id ? { ...x, status: 'error' } : x)));
        }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [s, ids]);

  useEffect(() => () => itemsRef.current.forEach((x) => x.url && URL.revokeObjectURL(x.url)), []);

  const add = (files: File[]) => setItems((list) => [...list, ...files.map((file) => ({ id: nextId++, file, status: 'pending' as const }))]);

  const remove = (id: number) =>
    setItems((list) => {
      const x = list.find((i) => i.id === id);
      if (x?.url) URL.revokeObjectURL(x.url);
      return list.filter((i) => i.id !== id);
    });

  const nameFor = (item: Item) => withExtension(item.file.name, EXT[item.blob?.type ?? ''] ?? 'png');

  const done = items.filter((i) => i.status === 'done');
  const before = done.reduce((a, i) => a + i.file.size, 0);
  const after = done.reduce((a, i) => a + (i.blob?.size ?? 0), 0);
  const wrongType = done.some((i) => s.format !== 'original' && i.blob && i.blob.type !== s.format);
  const showQuality = s.format !== 'image/png';

  const downloadAll = async () => {
    setZipping(true);
    try {
      const zip = await zipBlobs(done.map((i) => ({ name: nameFor(i), blob: i.blob! })));
      downloadBlob(zip, 'imagenes.zip');
    } finally {
      setZipping(false);
    }
  };

  return (
    <div class="tool-layout wide-left">
      <div class="stack">
        <Dropzone lang={lang} accept="image/*" multiple onFiles={add} title={t.drop} subtitle={t.sub} compact={items.length > 0} />

        {items.length > 0 && (
          <>
            <div class="btn-row" style="justify-content:space-between">
              <span class="muted small">{t.total(items.length, formatBytes(before, lang), formatBytes(after, lang))}</span>
              <div class="btn-row">
                <button type="button" class="btn btn-sm btn-ghost btn-danger" onClick={() => (items.forEach((i) => i.url && URL.revokeObjectURL(i.url)), setItems([]))}>
                  <Trash2 aria-hidden="true" />
                  {c.clear}
                </button>
                <button type="button" class="btn btn-sm btn-primary" disabled={!done.length || zipping} onClick={downloadAll}>
                  <Download aria-hidden="true" />
                  {zipping ? c.processing : c.downloadAll}
                </button>
              </div>
            </div>
            {wrongType && (
              <div class="alert alert-warning">
                <TriangleAlert aria-hidden="true" />
                <span>{t.noWebp}</span>
              </div>
            )}
            <div class="file-list">
              {items.map((item) => {
                const saved = item.blob ? 1 - item.blob.size / item.file.size : 0;
                return (
                  <div class="file-item" key={item.id}>
                    {item.url ? <img class="thumb" src={item.url} alt="" /> : <div class="thumb" />}
                    <div class="meta">
                      <div class="name" title={item.file.name}>
                        {item.status === 'done' ? nameFor(item) : item.file.name}
                      </div>
                      <div class="sub">
                        {item.status === 'pending' && c.processing}
                        {item.status === 'error' && <span class="negative">{t.unsupported}</span>}
                        {item.status === 'done' && (
                          <>
                            {formatBytes(item.file.size, lang)} → <b>{formatBytes(item.blob!.size, lang)}</b>{' '}
                            <span class={saved >= 0 ? 'positive' : 'negative'}>
                              ({saved >= 0 ? '−' : '+'}
                              {Math.abs(Math.round(saved * 100))} %)
                            </span>
                            {' · '}
                            {item.outW}×{item.outH}
                          </>
                        )}
                      </div>
                    </div>
                    <button type="button" class="btn btn-sm" disabled={item.status !== 'done'} onClick={() => downloadBlob(item.blob!, nameFor(item))} aria-label={`${c.download} ${item.file.name}`}>
                      <Download aria-hidden="true" />
                      <span class="hide-xs">{c.download}</span>
                    </button>
                    <button type="button" class="btn btn-sm btn-ghost btn-icon btn-danger" onClick={() => remove(item.id)} aria-label={`${c.remove} ${item.file.name}`}>
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <section class="panel stack sticky">
        <div class="field">
          <span class="label">{t.format}</span>
          <Segmented
            value={s.format}
            onChange={(v) => set('format', v)}
            options={[
              { value: 'original', label: t.original },
              { value: 'image/webp', label: 'WebP' },
              { value: 'image/jpeg', label: 'JPG' },
              { value: 'image/png', label: 'PNG' },
            ]}
          />
        </div>
        {showQuality ? (
          <Field label={`${t.quality}: ${s.quality}`} htmlFor="img-q" hint={t.qualityHint}>
            <input id="img-q" type="range" min={10} max={100} value={s.quality} onInput={(e) => set('quality', Number(e.currentTarget.value))} />
          </Field>
        ) : (
          <p class="hint">{t.pngNoQuality}</p>
        )}
        <hr class="divider" />
        <label class="check">
          <input type="checkbox" checked={s.resize} onChange={(e) => set('resize', e.currentTarget.checked)} />
          {t.resize}
        </label>
        {s.resize && (
          <>
            <div class="form-grid" style="grid-template-columns:1fr 1fr">
              <Field label={t.maxW} htmlFor="img-w">
                <input id="img-w" class="input" type="number" min={1} value={s.maxW} onInput={(e) => set('maxW', Math.max(1, Number(e.currentTarget.value) || 1))} />
              </Field>
              <Field label={t.maxH} htmlFor="img-h">
                <input id="img-h" class="input" type="number" min={1} value={s.maxH} onInput={(e) => set('maxH', Math.max(1, Number(e.currentTarget.value) || 1))} />
              </Field>
            </div>
            <div class="btn-row">
              {[800, 1080, 1200, 1920].map((px) => (
                <button type="button" key={px} class="btn btn-sm" onClick={() => setS((p) => ({ ...p, maxW: px, maxH: px }))}>
                  {px}px
                </button>
              ))}
            </div>
            <span class="hint">{t.resizeHint}</span>
          </>
        )}
      </section>

      <style>{`@media (max-width: 480px) { .hide-xs { display: none; } }`}</style>
    </div>
  );
}
