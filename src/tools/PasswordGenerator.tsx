import { useEffect, useState } from 'preact/hooks';
import { RefreshCw } from 'lucide-preact';
import { CopyButton, Field, type Lang } from './shared/ui';

const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/',
};
const AMBIGUOUS = /[Il1O0o|]/g;

const T = {
  es: {
    length: 'Largo',
    lower: 'Minúsculas (a-z)',
    upper: 'Mayúsculas (A-Z)',
    digits: 'Números (0-9)',
    symbols: 'Símbolos (!@#…)',
    ambiguous: 'Evitar caracteres parecidos (I, l, 1, O, 0)',
    count: 'Cantidad',
    regenerate: 'Generar otra vez',
    strength: ['Débil', 'Aceptable', 'Fuerte', 'Muy fuerte'],
    entropy: 'bits de entropía',
    pickOne: 'Elegí al menos un tipo de carácter.',
  },
  en: {
    length: 'Length',
    lower: 'Lowercase (a-z)',
    upper: 'Uppercase (A-Z)',
    digits: 'Numbers (0-9)',
    symbols: 'Symbols (!@#…)',
    ambiguous: 'Avoid look-alike characters (I, l, 1, O, 0)',
    count: 'Quantity',
    regenerate: 'Generate again',
    strength: ['Weak', 'Fair', 'Strong', 'Very strong'],
    entropy: 'bits of entropy',
    pickOne: 'Choose at least one character type.',
  },
};

/** Entero aleatorio uniforme en [0, max) usando el generador criptográfico del navegador. */
function randomInt(max: number) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % max;
}

function generate(length: number, pools: string[]) {
  const all = pools.join('');
  // Garantiza al menos un carácter de cada tipo elegido y mezcla el resultado.
  const chars = pools.map((p) => p[randomInt(p.length)]);
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.slice(0, length).join('');
}

export default function PasswordGenerator({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [length, setLength] = useState(16);
  const [opts, setOpts] = useState({ lower: true, upper: true, digits: true, symbols: true, ambiguous: false });
  const [count, setCount] = useState(1);
  const [list, setList] = useState<string[]>([]);

  const pools = (Object.keys(SETS) as (keyof typeof SETS)[])
    .filter((k) => opts[k])
    .map((k) => (opts.ambiguous ? SETS[k].replace(AMBIGUOUS, '') : SETS[k]));
  const poolSize = pools.join('').length;
  const bits = poolSize ? Math.round(length * Math.log2(poolSize)) : 0;
  const level = bits < 45 ? 0 : bits < 65 ? 1 : bits < 90 ? 2 : 3;
  const colors = ['var(--danger)', 'var(--warning)', 'var(--success)', 'var(--success)'];

  const regen = () => setList(pools.length ? Array.from({ length: count }, () => generate(length, pools)) : []);
  useEffect(regen, [length, opts, count]);

  return (
    <div class="tool-layout">
      <section class="panel">
        <div class="stack">
          <Field label={`${t.length}: ${length}`} htmlFor="pw-len">
            <input id="pw-len" type="range" min={4} max={64} value={length} onInput={(e) => setLength(Number(e.currentTarget.value))} />
          </Field>
          {(['lower', 'upper', 'digits', 'symbols', 'ambiguous'] as const).map((k) => (
            <label class="check" key={k}>
              <input type="checkbox" checked={opts[k]} onChange={(e) => setOpts((o) => ({ ...o, [k]: e.currentTarget.checked }))} />
              {t[k]}
            </label>
          ))}
          <Field label={t.count} htmlFor="pw-count">
            <select id="pw-count" class="select" value={count} onChange={(e) => setCount(Number(e.currentTarget.value))}>
              {[1, 5, 10, 20].map((n) => (
                <option value={n} key={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section class="panel stack">
        {!pools.length ? (
          <p class="negative">{t.pickOne}</p>
        ) : (
          <>
            <div class="pw-list">
              {list.map((pw, i) => (
                <div class="pw-item" key={i}>
                  <code class="mono">{pw}</code>
                  <CopyButton lang={lang} text={pw} />
                </div>
              ))}
            </div>
            <div>
              <div class="pw-meter">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} style={{ background: i <= level ? colors[level] : undefined }} />
                ))}
              </div>
              <p class="small" style="margin-top:8px">
                <b style={{ color: colors[level] }}>{t.strength[level]}</b> <span class="muted">· {bits} {t.entropy}</span>
              </p>
            </div>
            <div class="btn-row">
              <button type="button" class="btn btn-primary" onClick={regen}>
                <RefreshCw aria-hidden="true" />
                {t.regenerate}
              </button>
              {count > 1 && <CopyButton lang={lang} class="btn" text={list.join('\n')} />}
            </div>
          </>
        )}
      </section>

      <style>{`
        .pw-list { display: flex; flex-direction: column; gap: 8px; max-height: 420px; overflow: auto; }
        .pw-item { display: flex; align-items: center; gap: 10px; padding: 10px 10px 10px 14px; background: var(--surface-2); border-radius: 10px; }
        .pw-item code { flex: 1; font-size: 16px; overflow-wrap: anywhere; letter-spacing: .02em; }
        .pw-meter { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
        .pw-meter span { height: 6px; border-radius: 3px; background: var(--surface-3); }
      `}</style>
    </div>
  );
}
