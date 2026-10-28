import { useEffect, useMemo, useState } from 'preact/hooks';
import JsBarcode from 'jsbarcode';
import { Download, TriangleAlert } from 'lucide-preact';
import { Field, downloadBlob, zipBlobs, type Lang } from './shared/ui';

type Format = 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39' | 'ITF14';

const FORMATS: { value: Format; label: string; example: string; es: string; en: string }[] = [
  { value: 'CODE128', label: 'Code 128', example: 'SKU-00123', es: 'Letras, números y símbolos. El más versátil para inventario y envíos.', en: 'Letters, numbers and symbols. The most versatile for inventory and shipping.' },
  { value: 'EAN13', label: 'EAN-13', example: '7791234567898', es: '12 o 13 números. El de los productos en góndola. Si ponés 12, se calcula el último dígito.', en: '12 or 13 digits. The one on retail products. With 12, the last digit is calculated.' },
  { value: 'EAN8', label: 'EAN-8', example: '12345670', es: '7 u 8 números, para productos chicos.', en: '7 or 8 digits, for small products.' },
  { value: 'UPC', label: 'UPC-A', example: '036000291452', es: '11 o 12 números. Estándar de Estados Unidos y Canadá.', en: '11 or 12 digits. US and Canada standard.' },
  { value: 'CODE39', label: 'Code 39', example: 'ABC-123', es: 'Mayúsculas, números y algunos símbolos.', en: 'Uppercase letters, numbers and a few symbols.' },
  { value: 'ITF14', label: 'ITF-14', example: '17791234567895', es: '13 o 14 números, para cajas y bultos.', en: '13 or 14 digits, for boxes and cartons.' },
];

const T = {
  es: {
    format: 'Formato',
    values: 'Códigos',
    valuesHint: 'Uno por línea. Podés pegar una columna de Excel.',
    barWidth: 'Grosor de las barras',
    height: 'Alto',
    showText: 'Mostrar el número debajo',
    bars: 'Color de las barras',
    background: 'Fondo',
    invalid: 'No es válido para este formato',
    svg: 'SVG',
    png: 'PNG',
    allPng: 'Todos en PNG (.zip)',
    allSvg: 'Todos en SVG (.zip)',
    empty: 'Escribí un código para ver el resultado.',
    scanTip: 'Antes de imprimir un lote probá escanear uno: el contraste entre barras y fondo tiene que ser alto.',
  },
  en: {
    format: 'Format',
    values: 'Codes',
    valuesHint: 'One per line. You can paste a spreadsheet column.',
    barWidth: 'Bar width',
    height: 'Height',
    showText: 'Show the number below',
    bars: 'Bar color',
    background: 'Background',
    invalid: 'Not valid for this format',
    svg: 'SVG',
    png: 'PNG',
    allPng: 'All as PNG (.zip)',
    allSvg: 'All as SVG (.zip)',
    empty: 'Type a code to see the result.',
    scanTip: 'Before printing a batch, try scanning one: the contrast between bars and background must be high.',
  },
};

interface Opts {
  format: Format;
  width: number;
  height: number;
  displayValue: boolean;
  lineColor: string;
  background: string;
}

const jsbOptions = (o: Opts, scale = 1) => ({
  format: o.format,
  width: o.width * scale,
  height: o.height * scale,
  displayValue: o.displayValue,
  fontSize: 14 * scale,
  textMargin: 2 * scale,
  margin: 10 * scale,
  lineColor: o.lineColor,
  background: o.background,
});

/** Devuelve el SVG como texto, o null si el código no es válido para el formato. */
function toSvg(value: string, o: Opts) {
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, value, { ...jsbOptions(o), xmlDocument: document });
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return new XMLSerializer().serializeToString(svg);
  } catch {
    return null;
  }
}

function toPngBlob(value: string, o: Opts) {
  return new Promise<Blob | null>((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, value, jsbOptions(o, 2));
      canvas.toBlob((b) => resolve(b), 'image/png');
    } catch {
      resolve(null);
    }
  });
}

const fileName = (value: string, ext: string) => `${value.replace(/[^\w.\-]+/g, '_').slice(0, 40) || 'codigo'}.${ext}`;

export default function BarcodeGenerator({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [format, setFormat] = useState<Format>('CODE128');
  const [text, setText] = useState('SKU-00123');
  const [width, setWidth] = useState(2);
  const [height, setHeight] = useState(90);
  const [displayValue, setDisplayValue] = useState(true);
  const [lineColor, setLineColor] = useState('#000000');
  const [background, setBackground] = useState('#ffffff');
  // JsBarcode necesita el DOM: se dibuja recién en el navegador, así el HTML del servidor y el del cliente coinciden.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const opts: Opts = { format, width, height, displayValue, lineColor, background };
  const info = FORMATS.find((f) => f.value === format)!;
  const values = useMemo(() => [...new Set(text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))].slice(0, 200), [text]);
  const rendered = useMemo(() => (mounted ? values.map((v) => ({ value: v, svg: toSvg(v, opts) })) : []), [mounted, values, format, width, height, displayValue, lineColor, background]);
  const valid = rendered.filter((r) => r.svg);

  const downloadSvg = (value: string, svg: string) => downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), fileName(value, 'svg'));
  const downloadPng = async (value: string) => {
    const blob = await toPngBlob(value, opts);
    if (blob) downloadBlob(blob, fileName(value, 'png'));
  };
  const downloadAll = async (kind: 'png' | 'svg') => {
    const files: { name: string; blob: Blob }[] = [];
    for (const r of valid) {
      const blob = kind === 'png' ? await toPngBlob(r.value, opts) : new Blob([r.svg!], { type: 'image/svg+xml' });
      if (blob) files.push({ name: fileName(r.value, kind), blob });
    }
    if (files.length) downloadBlob(await zipBlobs(files), `codigos-de-barras-${kind}.zip`);
  };

  return (
    <div class="tool-layout">
      <section class="panel stack">
        <Field label={t.format} htmlFor="bc-format" hint={info[lang]}>
          <select
            id="bc-format"
            class="select"
            value={format}
            onChange={(e) => {
              const f = e.currentTarget.value as Format;
              setFormat(f);
              if (values.length <= 1) setText(FORMATS.find((x) => x.value === f)!.example);
            }}
          >
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.values} htmlFor="bc-values" hint={t.valuesHint}>
          <textarea id="bc-values" class="textarea mono" rows={5} value={text} onInput={(e) => setText(e.currentTarget.value)} />
        </Field>
        <div class="form-grid">
          <Field label={`${t.barWidth}: ${width}`} htmlFor="bc-width">
            <input id="bc-width" type="range" min={1} max={5} step={1} value={width} onInput={(e) => setWidth(Number(e.currentTarget.value))} />
          </Field>
          <Field label={`${t.height}: ${height}`} htmlFor="bc-height">
            <input id="bc-height" type="range" min={40} max={200} step={10} value={height} onInput={(e) => setHeight(Number(e.currentTarget.value))} />
          </Field>
        </div>
        <div class="form-grid">
          <Field label={t.bars} htmlFor="bc-line">
            <input id="bc-line" type="color" value={lineColor} onInput={(e) => setLineColor(e.currentTarget.value)} />
          </Field>
          <Field label={t.background} htmlFor="bc-bg">
            <input id="bc-bg" type="color" value={background} onInput={(e) => setBackground(e.currentTarget.value)} />
          </Field>
        </div>
        <label class="check">
          <input type="checkbox" checked={displayValue} onChange={(e) => setDisplayValue(e.currentTarget.checked)} />
          {t.showText}
        </label>
      </section>

      <section class="panel stack">
        {mounted && rendered.length === 0 && <span class="muted">{t.empty}</span>}
        <div class="bc-grid">
          {rendered.map((r) => (
            <div class="bc-card" key={r.value}>
              {r.svg ? (
                <>
                  <div class="bc-svg" dangerouslySetInnerHTML={{ __html: r.svg }} />
                  <div class="btn-row">
                    <button type="button" class="btn btn-sm" onClick={() => downloadPng(r.value)}>
                      <Download aria-hidden="true" />
                      {t.png}
                    </button>
                    <button type="button" class="btn btn-sm" onClick={() => downloadSvg(r.value, r.svg!)}>
                      <Download aria-hidden="true" />
                      {t.svg}
                    </button>
                  </div>
                </>
              ) : (
                <div class="bc-bad">
                  <TriangleAlert aria-hidden="true" />
                  <div>
                    <div class="mono">{r.value}</div>
                    <div class="small">{t.invalid}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {valid.length > 1 && (
          <div class="btn-row">
            <button type="button" class="btn btn-primary" onClick={() => downloadAll('png')}>
              <Download aria-hidden="true" />
              {t.allPng}
            </button>
            <button type="button" class="btn" onClick={() => downloadAll('svg')}>
              <Download aria-hidden="true" />
              {t.allSvg}
            </button>
          </div>
        )}
        <span class="hint">{t.scanTip}</span>
      </section>

      <style>{`
        .bc-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
        .bc-card { display: grid; gap: 10px; padding: 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface, transparent); }
        .bc-svg { display: grid; place-items: center; overflow: hidden; border-radius: 8px; }
        .bc-svg svg { max-width: 100%; height: auto; }
        .bc-bad { display: flex; gap: 10px; align-items: flex-start; color: #dc2626; }
        .bc-bad svg { width: 20px; height: 20px; flex: none; }
        input[type="color"] { width: 56px; height: 36px; padding: 2px; border: 1px solid var(--border-strong); border-radius: 8px; background: transparent; }
        input[type="range"] { width: 100%; }
      `}</style>
    </div>
  );
}
