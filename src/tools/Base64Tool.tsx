import { useMemo, useState } from 'preact/hooks';
import { ArrowDownUp, TriangleAlert } from 'lucide-preact';
import { CopyButton, Dropzone, Segmented, formatBytes, type Lang } from './shared/ui';

const T = {
  es: {
    text: 'Texto',
    file: 'Archivo a Data URL',
    encode: 'Codificar',
    decode: 'Decodificar',
    urlSafe: 'Base64 seguro para URL (- y _ en lugar de + y /)',
    input: 'Entrada',
    output: 'Resultado',
    swap: 'Usar el resultado como entrada',
    bad: 'El texto no es Base64 válido.',
    dropFile: 'Arrastrá un archivo para convertirlo a Data URL',
    fileInfo: (name: string, size: string, out: string) => `${name} · ${size} → ${out} en Base64`,
  },
  en: {
    text: 'Text',
    file: 'File to Data URL',
    encode: 'Encode',
    decode: 'Decode',
    urlSafe: 'URL-safe Base64 (- and _ instead of + and /)',
    input: 'Input',
    output: 'Result',
    swap: 'Use result as input',
    bad: 'The text is not valid Base64.',
    dropFile: 'Drop a file to turn it into a Data URL',
    fileInfo: (name: string, size: string, out: string) => `${name} · ${size} → ${out} as Base64`,
  },
};

const encode = (s: string, urlSafe: boolean) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const b64 = btoa(bin);
  return urlSafe ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b64;
};

const decode = (s: string) => {
  let b64 = s.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  b64 += '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

export default function Base64Tool({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [tab, setTab] = useState<'text' | 'file'>('text');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [urlSafe, setUrlSafe] = useState(false);
  const [input, setInput] = useState(lang === 'es' ? '¡Hola! Ñandú, acentos y emojis 🚀' : 'Hello! Accents (é, ñ) and emoji 🚀');
  const [dataUrl, setDataUrl] = useState<{ name: string; size: number; url: string } | null>(null);

  const result = useMemo(() => {
    if (!input) return { ok: true, value: '' };
    try {
      return { ok: true, value: mode === 'encode' ? encode(input, urlSafe) : decode(input) };
    } catch {
      return { ok: false, value: '' };
    }
  }, [input, mode, urlSafe]);

  const readFile = ([f]: File[]) => {
    const reader = new FileReader();
    reader.onload = () => setDataUrl({ name: f.name, size: f.size, url: String(reader.result) });
    reader.readAsDataURL(f);
  };

  return (
    <div class="stack">
      <Segmented value={tab} onChange={setTab} options={[{ value: 'text', label: t.text }, { value: 'file', label: t.file }]} />

      {tab === 'text' ? (
        <>
          <div class="btn-row">
            <Segmented value={mode} onChange={setMode} options={[{ value: 'encode', label: t.encode }, { value: 'decode', label: t.decode }]} />
            {mode === 'encode' && (
              <label class="check">
                <input type="checkbox" checked={urlSafe} onChange={(e) => setUrlSafe(e.currentTarget.checked)} />
                {t.urlSafe}
              </label>
            )}
          </div>
          <div class="tool-layout">
            <div class="field">
              <label class="label" htmlFor="b64-in">
                {t.input}
              </label>
              <textarea id="b64-in" class="textarea mono" rows={10} value={input} onInput={(e) => setInput(e.currentTarget.value)} spellcheck={false} />
            </div>
            <div class="field">
              <span class="label">{t.output}</span>
              {result.ok ? (
                <textarea class="textarea mono" rows={10} readOnly value={result.value} aria-label={t.output} />
              ) : (
                <div class="alert alert-danger">
                  <TriangleAlert aria-hidden="true" />
                  <span>{t.bad}</span>
                </div>
              )}
              <div class="btn-row">
                <CopyButton lang={lang} text={result.value} />
                <button
                  type="button"
                  class="btn btn-sm"
                  disabled={!result.ok || !result.value}
                  onClick={() => {
                    setInput(result.value);
                    setMode(mode === 'encode' ? 'decode' : 'encode');
                  }}
                >
                  <ArrowDownUp aria-hidden="true" />
                  {t.swap}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div class="stack">
          <Dropzone lang={lang} accept="*/*" onFiles={readFile} title={t.dropFile} compact={!!dataUrl} />
          {dataUrl && (
            <>
              <p class="muted small">{t.fileInfo(dataUrl.name, formatBytes(dataUrl.size, lang), formatBytes(dataUrl.url.length, lang))}</p>
              <textarea class="textarea mono" rows={8} readOnly value={dataUrl.url} aria-label={t.output} />
              <div>
                <CopyButton lang={lang} text={dataUrl.url} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
