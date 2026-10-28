import { useEffect, useState } from 'preact/hooks';
import { Download, RefreshCw } from 'lucide-preact';
import { CopyButton, Field, Segmented, downloadText, type Lang } from './shared/ui';

const T = {
  es: {
    version: 'Versión',
    v4: 'v4 · aleatorio',
    v7: 'v7 · ordenado por fecha',
    count: 'Cantidad',
    upper: 'Mayúsculas',
    hyphens: 'Con guiones',
    braces: 'Entre llaves { }',
    regenerate: 'Generar otra vez',
    download: 'Descargar .txt',
    v7Hint: 'Los v7 empiezan con la fecha y hora: quedan ordenados al guardarlos en una base de datos.',
  },
  en: {
    version: 'Version',
    v4: 'v4 · random',
    v7: 'v7 · time-ordered',
    count: 'Quantity',
    upper: 'Uppercase',
    hyphens: 'Hyphens',
    braces: 'Wrap in braces { }',
    regenerate: 'Generate again',
    download: 'Download .txt',
    v7Hint: 'v7 IDs start with the timestamp, so they stay sorted when stored in a database.',
  },
};

const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
const dash = (h: string) => `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;

function uuidV4() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  return dash(hex(b));
}

function uuidV7() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  const ms = Date.now();
  for (let i = 0; i < 6; i++) b[i] = Math.floor(ms / 2 ** (8 * (5 - i))) & 0xff;
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  return dash(hex(b));
}

export default function UuidGenerator({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [version, setVersion] = useState<'v4' | 'v7'>('v4');
  const [count, setCount] = useState(5);
  const [fmt, setFmt] = useState({ upper: false, hyphens: true, braces: false });
  const [raw, setRaw] = useState<string[]>([]);

  const regen = () => setRaw(Array.from({ length: count }, version === 'v4' ? uuidV4 : uuidV7));
  useEffect(regen, [version, count]);

  const list = raw.map((u) => {
    let s = fmt.hyphens ? u : u.replace(/-/g, '');
    if (fmt.upper) s = s.toUpperCase();
    return fmt.braces ? `{${s}}` : s;
  });
  const text = list.join('\n');

  return (
    <div class="tool-layout">
      <section class="panel stack">
        <div class="field">
          <span class="label">{t.version}</span>
          <Segmented value={version} onChange={setVersion} options={[{ value: 'v4', label: t.v4 }, { value: 'v7', label: t.v7 }]} />
          {version === 'v7' && <span class="hint">{t.v7Hint}</span>}
        </div>
        <Field label={t.count} htmlFor="uuid-count">
          <select id="uuid-count" class="select" value={count} onChange={(e) => setCount(Number(e.currentTarget.value))}>
            {[1, 5, 10, 25, 50, 100, 500].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        {(['upper', 'hyphens', 'braces'] as const).map((k) => (
          <label class="check" key={k}>
            <input type="checkbox" checked={fmt[k]} onChange={(e) => setFmt((f) => ({ ...f, [k]: e.currentTarget.checked }))} />
            {t[k]}
          </label>
        ))}
      </section>

      <section class="panel stack">
        <div class="output" style="max-height:420px; overflow:auto">{text}</div>
        <div class="btn-row">
          <button type="button" class="btn btn-primary" onClick={regen}>
            <RefreshCw aria-hidden="true" />
            {t.regenerate}
          </button>
          <CopyButton lang={lang} class="btn" text={text} />
          <button type="button" class="btn" onClick={() => downloadText(text, 'uuid.txt')}>
            <Download aria-hidden="true" />
            {t.download}
          </button>
        </div>
      </section>
    </div>
  );
}
