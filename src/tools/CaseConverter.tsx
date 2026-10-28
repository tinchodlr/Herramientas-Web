import { useState } from 'preact/hooks';
import { CopyButton, type Lang } from './shared/ui';
import { stripAccents } from '../lib/text';

type CaseId = 'upper' | 'lower' | 'title' | 'sentence' | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant' | 'slug';

const NAMES: Record<CaseId, Record<Lang, string>> = {
  upper: { es: 'MAYÚSCULAS', en: 'UPPERCASE' },
  lower: { es: 'minúsculas', en: 'lowercase' },
  title: { es: 'Tipo Título', en: 'Title Case' },
  sentence: { es: 'Tipo oración', en: 'Sentence case' },
  camel: { es: 'camelCase', en: 'camelCase' },
  pascal: { es: 'PascalCase', en: 'PascalCase' },
  snake: { es: 'snake_case', en: 'snake_case' },
  kebab: { es: 'kebab-case', en: 'kebab-case' },
  constant: { es: 'CONSTANTE', en: 'CONSTANT_CASE' },
  slug: { es: 'slug-para-url', en: 'url-slug' },
};

const T = {
  es: { input: 'Texto', output: 'Resultado', placeholder: 'Escribí o pegá tu texto…', sample: 'Remera de algodón peinado — talle M. ¡Envío gratis hoy!' },
  en: { input: 'Text', output: 'Result', placeholder: 'Type or paste your text…', sample: 'Combed cotton t-shirt — size M. Free shipping today!' },
};

/** Divide en palabras para los formatos de programación (respeta camelCase existente). */
const words = (s: string) =>
  s
    .replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

export function convertCase(s: string, id: CaseId, lang: Lang) {
  const lower = (x: string) => x.toLocaleLowerCase(lang);
  const cap = (x: string) => x.charAt(0).toLocaleUpperCase(lang) + lower(x.slice(1));
  switch (id) {
    case 'upper':
      return s.toLocaleUpperCase(lang);
    case 'lower':
      return lower(s);
    case 'title':
      return lower(s).replace(/(^|[\s\-–—("¿¡/])(\p{L})/gu, (_, sep, ch) => sep + ch.toLocaleUpperCase(lang));
    case 'sentence':
      return lower(s).replace(/(^\s*[¿¡"(]*|[.!?]\s+[¿¡"(]*)(\p{L})/gu, (_, pre, ch) => pre + ch.toLocaleUpperCase(lang));
    case 'camel':
      return words(s)
        .map((w, i) => (i === 0 ? lower(w) : cap(w)))
        .join('');
    case 'pascal':
      return words(s).map(cap).join('');
    case 'snake':
      return words(s).map(lower).join('_');
    case 'kebab':
      return words(s).map(lower).join('-');
    case 'constant':
      return words(s).map((w) => w.toLocaleUpperCase(lang)).join('_');
    case 'slug':
      return words(stripAccents(s).replace(/ñ/gi, 'n')).map(lower).join('-');
  }
}

export default function CaseConverter({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [text, setText] = useState(t.sample);

  return (
    <div class="tool-layout">
      <div class="field">
        <label class="label" htmlFor="case-in">
          {t.input}
        </label>
        <textarea id="case-in" class="textarea" style="min-height:300px" value={text} onInput={(e) => setText(e.currentTarget.value)} placeholder={t.placeholder} />
      </div>
      <div class="case-list">
        {(Object.keys(NAMES) as CaseId[]).map((id) => {
          const out = convertCase(text, id, lang);
          return (
            <div class="case-item" key={id}>
              <div class="case-head">
                <span class="label">{NAMES[id][lang]}</span>
                <CopyButton lang={lang} class="btn btn-sm btn-ghost" text={out} />
              </div>
              <div class="case-out">{out || '—'}</div>
            </div>
          );
        })}
      </div>
      <style>{`
        .case-list { display: flex; flex-direction: column; gap: 8px; }
        .case-item { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 8px 10px 10px 14px; }
        .case-head { display: flex; align-items: center; justify-content: space-between; }
        .case-out { font-size: 14.5px; overflow-wrap: anywhere; max-height: 7.5em; overflow: auto; white-space: pre-wrap; }
      `}</style>
    </div>
  );
}
