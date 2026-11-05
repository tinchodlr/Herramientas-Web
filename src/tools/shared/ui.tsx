import type { ComponentChildren, PartialInputHTMLAttributes } from 'preact';
import { useCallback, useEffect, useRef, useState, type StateUpdater } from 'preact/hooks';
import { Check, Copy, Upload } from 'lucide-preact';
import type { Lang } from '../../lib/format';
import { getCloudState, kvPull, kvPush, localStamp, setLocalStamp, subscribeCloud, type CloudState } from '../../lib/cloud';

export type { Lang };
export { fmtMoney, fmtNum, fmtPct, formatBytes, parseNum } from '../../lib/format';

export const COMMON = {
  es: {
    copy: 'Copiar',
    copied: 'Copiado',
    download: 'Descargar',
    downloadAll: 'Descargar todo (.zip)',
    clear: 'Limpiar',
    remove: 'Quitar',
    moveUp: 'Subir',
    moveDown: 'Bajar',
    drop: 'Arrastrá tus archivos acá',
    orClick: 'o hacé clic para elegirlos',
    processing: 'Procesando…',
    error: 'Ocurrió un error',
  },
  en: {
    copy: 'Copy',
    copied: 'Copied',
    download: 'Download',
    downloadAll: 'Download all (.zip)',
    clear: 'Clear',
    remove: 'Remove',
    moveUp: 'Move up',
    moveDown: 'Move down',
    drop: 'Drop your files here',
    orClick: 'or click to choose them',
    processing: 'Processing…',
    error: 'Something went wrong',
  },
};

// ───────── Componentes ─────────

export function Field(props: { label: ComponentChildren; hint?: ComponentChildren; htmlFor?: string; children: ComponentChildren; class?: string }) {
  return (
    <div class={`field ${props.class ?? ''}`}>
      <label htmlFor={props.htmlFor}>{props.label}</label>
      {props.children}
      {props.hint && <span class="hint">{props.hint}</span>}
    </div>
  );
}

type NumInputProps = Omit<PartialInputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'prefix' | 'type' | 'list' | 'role'> & {
  value: string;
  onValue: (v: string) => void;
  prefix?: string;
  suffix?: string;
  invalid?: boolean;
};

/** Campo numérico de texto: guarda lo escrito tal cual y se interpreta con parseNum. */
export function NumInput({ value, onValue, prefix, suffix, invalid, ...rest }: NumInputProps) {
  return (
    <div class={`input-group ${prefix ? 'has-pre' : ''} ${suffix ? 'has-post' : ''}`}>
      {prefix && <span class="affix pre">{prefix}</span>}
      <input
        {...rest}
        class="input"
        type="text"
        inputMode="decimal"
        autocomplete="off"
        value={value}
        aria-invalid={invalid ? 'true' : undefined}
        onInput={(e) => onValue(e.currentTarget.value)}
      />
      {suffix && <span class="affix post">{suffix}</span>}
    </div>
  );
}

export function Segmented<T extends string>(props: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ComponentChildren; icon?: ComponentChildren }[];
  label?: string;
}) {
  return (
    <div class="segmented" role="group" aria-label={props.label}>
      {props.options.map((o) => (
        <button type="button" key={o.value} aria-pressed={props.value === o.value} onClick={() => props.onChange(o.value)}>
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

export function CopyButton({ text, lang, label, class: cls = 'btn btn-sm', disabled }: { text: string; lang: Lang; label?: string; class?: string; disabled?: boolean }) {
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      class={cls}
      disabled={disabled || !text}
      onClick={async () => {
        await copyText(text);
        setDone(true);
        clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {done ? COMMON[lang].copied : label ?? COMMON[lang].copy}
    </button>
  );
}

export function Dropzone(props: {
  lang: Lang;
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const t = COMMON[props.lang];

  const accepts = (f: File) =>
    props.accept.split(',').some((a) => {
      a = a.trim();
      if (a.endsWith('/*')) return f.type.startsWith(a.slice(0, -1));
      if (a.startsWith('.')) return f.name.toLowerCase().endsWith(a);
      return f.type === a;
    });

  const handle = (list: FileList | null) => {
    const files = [...(list ?? [])].filter(accepts);
    if (files.length) props.onFiles(props.multiple ? files : files.slice(0, 1));
  };

  return (
    <div
      class={`dropzone ${over ? 'is-over' : ''}`}
      style={props.compact ? 'padding:18px' : undefined}
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.current?.click())}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        handle(e.dataTransfer?.files ?? null);
      }}
    >
      <Upload aria-hidden="true" />
      <strong>{props.title ?? t.drop}</strong>
      <span class="hint">{props.subtitle ?? t.orClick}</span>
      <input
        ref={input}
        type="file"
        accept={props.accept}
        multiple={props.multiple}
        hidden
        onChange={(e) => {
          handle(e.currentTarget.files);
          e.currentTarget.value = '';
        }}
      />
    </div>
  );
}

// ───────── Utilidades ─────────

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const downloadText = (text: string, filename: string, type = 'text/plain;charset=utf-8') =>
  downloadBlob(new Blob([text], { type }), filename);

export async function zipBlobs(files: { name: string; blob: Blob }[]) {
  const { zipSync } = await import('fflate');
  const entries: Record<string, Uint8Array> = {};
  const used = new Set<string>();
  for (const f of files) {
    let name = f.name;
    for (let i = 2; used.has(name); i++) name = f.name.replace(/(\.[^.]+)?$/, ` (${i})$1`);
    used.add(name);
    entries[name] = new Uint8Array(await f.blob.arrayBuffer());
  }
  const zipped = zipSync(entries, { level: 0 });
  return new Blob([zipped as BlobPart], { type: 'application/zip' });
}

/**
 * Estado que se recuerda en este navegador (localStorage). Si no hay acceso, funciona igual sin guardar.
 * Con una sesión iniciada, además se guarda en la cuenta y se comparte entre dispositivos: gana
 * siempre la versión más reciente.
 */
export function useStoredState<T>(key: string, initial: T) {
  const [value, setValueRaw] = useState<T>(initial);
  const loaded = useRef(false);
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const setValue = useCallback((next: StateUpdater<T>) => {
    dirty.current = true;
    setValueRaw(next);
  }, []);

  const parse = (raw: string) => {
    const parsed = JSON.parse(raw);
    const isObject = initial && typeof initial === 'object' && !Array.isArray(initial);
    return (isObject ? { ...initial, ...parsed } : parsed) as T;
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValueRaw(parse(raw));
    } catch {}
    loaded.current = true;
  }, [key]);

  // Al iniciar sesión (o si ya estaba iniciada) se compara con la copia de la cuenta.
  useEffect(() => {
    let alive = true;
    let busy = false;
    const reconcile = async (s: CloudState) => {
      if (s.status !== 'in' || busy) return;
      busy = true;
      try {
        const remote = await kvPull(key);
        if (!alive) return;
        const stamp = localStamp(key);
        if (remote && remote.t > stamp) {
          setValueRaw(parse(remote.v));
          try {
            localStorage.setItem(key, remote.v);
          } catch {}
          setLocalStamp(key, remote.t);
        } else if (stamp > (remote?.t ?? 0)) {
          const raw = localStorage.getItem(key);
          if (raw !== null) await kvPush(key, raw, stamp);
        }
      } catch {
      } finally {
        busy = false;
      }
    };
    void reconcile(getCloudState());
    const off = subscribeCloud((s) => void reconcile(s));
    return () => {
      alive = false;
      off();
    };
  }, [key]);

  useEffect(() => {
    if (!loaded.current || !dirty.current) return;
    dirty.current = false;
    const raw = JSON.stringify(value);
    try {
      localStorage.setItem(key, raw);
    } catch {}
    const t = Date.now();
    setLocalStamp(key, t);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (getCloudState().status === 'in') kvPush(key, raw, t).catch(() => {});
    }, 600);
  }, [key, value]);
  return [value, setValue] as const;
}

/** Nombre de archivo con otra extensión: "foto.png" → "foto.webp". */
export const withExtension = (name: string, ext: string) => name.replace(/\.[^.]+$/, '') + '.' + ext;
