import { useMemo, useState } from 'preact/hooks';
import { Trash2 } from 'lucide-preact';
import { COMMON, fmtNum, type Lang } from './shared/ui';

const STOP = new Set(
  (
    'el la los las un una unos unas de del al a y o u e ni que en con por para sin sobre entre es son fue ser se lo le les su sus mi mis tu tus nos ya no si como mas pero muy este esta estos estas ese esa eso esto hay tambien cuando donde porque todo todos ' +
    'the a an and or but of to in on at for with by from is are was were be been it its this that these those as not no yes you your we our they their he she his her them i my me so if then than there here can will just do does did have has had'
  ).split(' '),
);

const T = {
  es: {
    placeholder: 'Pegá o escribí tu texto acá…',
    words: 'Palabras',
    chars: 'Caracteres',
    noSpaces: 'Sin espacios',
    sentences: 'Oraciones',
    paragraphs: 'Párrafos',
    lines: 'Líneas',
    reading: 'Lectura',
    speaking: 'En voz alta',
    min: 'min',
    sec: 's',
    top: 'Palabras más repetidas',
    topHint: 'Sin contar artículos, preposiciones ni palabras de menos de 3 letras.',
    none: 'Todavía no hay suficientes palabras.',
    limits: 'Límites comunes',
  },
  en: {
    placeholder: 'Paste or type your text here…',
    words: 'Words',
    chars: 'Characters',
    noSpaces: 'No spaces',
    sentences: 'Sentences',
    paragraphs: 'Paragraphs',
    lines: 'Lines',
    reading: 'Reading',
    speaking: 'Speaking',
    min: 'min',
    sec: 's',
    top: 'Most repeated words',
    topHint: 'Excluding articles, prepositions and words shorter than 3 letters.',
    none: 'Not enough words yet.',
    limits: 'Common limits',
  },
};

const LIMITS = [
  { name: { es: 'Título de Mercado Libre', en: 'Mercado Libre title' }, max: 60 },
  { name: { es: 'Post de X (Twitter)', en: 'X (Twitter) post' }, max: 280 },
  { name: { es: 'Meta descripción (Google)', en: 'Meta description (Google)' }, max: 160 },
  { name: { es: 'Bio de Instagram', en: 'Instagram bio' }, max: 150 },
];

const segmenter = (granularity: 'word' | 'grapheme' | 'sentence', lang: Lang) =>
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(lang, { granularity }) : null;

const duration = (seconds: number, t: (typeof T)['es']) =>
  seconds < 60 ? `${Math.ceil(seconds)} ${t.sec}` : `${Math.floor(seconds / 60)} ${t.min} ${Math.round(seconds % 60)} ${t.sec}`;

export default function WordCounter({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [text, setText] = useState('');

  const stats = useMemo(() => {
    const wordSeg = segmenter('word', lang);
    const words: string[] = wordSeg
      ? [...wordSeg.segment(text)].filter((s) => s.isWordLike).map((s) => s.segment)
      : text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
    const graphemes = segmenter('grapheme', lang);
    const chars = graphemes ? [...graphemes.segment(text)].length : [...text].length;
    const noSpaces = graphemes ? [...graphemes.segment(text.replace(/\s+/g, ''))].length : [...text.replace(/\s+/g, '')].length;
    const sentSeg = segmenter('sentence', lang);
    const sentences = text.trim() ? (sentSeg ? [...sentSeg.segment(text)].filter((s) => /[\p{L}\p{N}]/u.test(s.segment)).length : text.split(/[.!?¡¿]+/).filter((s) => s.trim()).length) : 0;
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
    const lines = text ? text.split('\n').length : 0;

    const freq = new Map<string, number>();
    for (const w of words) {
      const k = w.toLocaleLowerCase(lang);
      if (k.length < 3 || STOP.has(k.normalize('NFD').replace(/[̀-ͯ]/g, '')) || /^\d+$/.test(k)) continue;
      freq.set(k, (freq.get(k) ?? 0) + 1);
    }
    const top = [...freq].sort((a, b) => b[1] - a[1]).slice(0, 10);
    return { words: words.length, chars, noSpaces, sentences, paragraphs, lines, top };
  }, [text, lang]);

  const cards = [
    [t.words, fmtNum(stats.words, lang)],
    [t.chars, fmtNum(stats.chars, lang)],
    [t.noSpaces, fmtNum(stats.noSpaces, lang)],
    [t.sentences, fmtNum(stats.sentences, lang)],
    [t.paragraphs, fmtNum(stats.paragraphs, lang)],
    [t.lines, fmtNum(stats.lines, lang)],
    [t.reading, stats.words ? duration((stats.words / 230) * 60, t) : '—'],
    [t.speaking, stats.words ? duration((stats.words / 140) * 60, t) : '—'],
  ];

  return (
    <div class="tool-layout wide-left">
      <div class="stack">
        <textarea class="textarea wc-area" value={text} onInput={(e) => setText(e.currentTarget.value)} placeholder={t.placeholder} aria-label={t.placeholder} />
        <div class="btn-row">
          <button type="button" class="btn btn-sm btn-ghost btn-danger" disabled={!text} onClick={() => setText('')}>
            <Trash2 aria-hidden="true" />
            {COMMON[lang].clear}
          </button>
        </div>
      </div>
      <div class="stack sticky">
        <div class="stats" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          {cards.map(([label, value]) => (
            <div class="stat" key={label}>
              <div class="stat-label">{label}</div>
              <div class="stat-value">{value}</div>
            </div>
          ))}
        </div>
        <section class="panel">
          <h2 class="panel-title">{t.limits}</h2>
          <div class="stack" style="gap:10px">
            {LIMITS.map((l) => {
              const pct = Math.min(stats.chars / l.max, 1);
              const over = stats.chars > l.max;
              return (
                <div key={l.max}>
                  <div class="small" style="display:flex;justify-content:space-between">
                    <span>{l.name[lang]}</span>
                    <span class={over ? 'negative' : 'muted'}>
                      {stats.chars}/{l.max}
                    </span>
                  </div>
                  <div class="wc-bar">
                    <span style={{ width: `${pct * 100}%`, background: over ? 'var(--danger)' : 'var(--accent)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section class="panel">
          <h2 class="panel-title">{t.top}</h2>
          {stats.top.length === 0 ? (
            <p class="muted small">{t.none}</p>
          ) : (
            <ol class="wc-top">
              {stats.top.map(([w, n]) => (
                <li key={w}>
                  <span>{w}</span>
                  <span class="muted">
                    {n} · {fmtNum((n / stats.words) * 100, lang, 1)} %
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p class="hint" style="margin-top:10px">{t.topHint}</p>
        </section>
      </div>
      <style>{`
        .wc-area { min-height: 460px; font-size: 15.5px; line-height: 1.65; }
        .wc-bar { height: 6px; border-radius: 3px; background: var(--surface-3); overflow: hidden; margin-top: 4px; }
        .wc-bar span { display: block; height: 100%; border-radius: 3px; transition: width .15s; }
        .wc-top { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
        .wc-top li span:first-child { font-weight: 560; margin-right: 8px; }
      `}</style>
    </div>
  );
}
