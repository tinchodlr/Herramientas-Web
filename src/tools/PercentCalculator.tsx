import { useState } from 'preact/hooks';
import { CopyButton, NumInput, fmtNum, parseNum, type Lang } from './shared/ui';

type CalcId = 'of' | 'what' | 'change' | 'add' | 'sub' | 'reverse';

const T = {
  es: {
    of: { title: 'Porcentaje de un número', a: '¿Cuánto es el', b: '% de', c: '?' },
    what: { title: 'Qué porcentaje representa', a: '', b: 'es qué porcentaje de', c: '?' },
    change: { title: 'Variación porcentual', a: 'De', b: 'a', c: '' },
    add: { title: 'Aumento (sumar un %)', a: 'Sumar el', b: '% a', c: '' },
    sub: { title: 'Descuento (restar un %)', a: 'Restar el', b: '% a', c: '' },
    reverse: { title: 'Valor antes del aumento', a: 'Si', b: 'ya incluye un', c: '%, el valor original era' },
    up: 'Aumentó',
    down: 'Bajó',
    diff: 'Diferencia',
    saving: 'Ahorro',
    added: 'Se suma',
    removed: 'Se quitó',
  },
  en: {
    of: { title: 'Percentage of a number', a: 'What is', b: '% of', c: '?' },
    what: { title: 'What percent is it', a: '', b: 'is what percent of', c: '?' },
    change: { title: 'Percentage change', a: 'From', b: 'to', c: '' },
    add: { title: 'Increase (add a %)', a: 'Add', b: '% to', c: '' },
    sub: { title: 'Discount (subtract a %)', a: 'Subtract', b: '% from', c: '' },
    reverse: { title: 'Value before the increase', a: 'If', b: 'already includes', c: '%, the original value was' },
    up: 'Increased',
    down: 'Decreased',
    diff: 'Difference',
    saving: 'You save',
    added: 'Added',
    removed: 'Removed',
  },
};

const INITIAL: Record<CalcId, [string, string]> = {
  of: ['15', '2500'],
  what: ['300', '1200'],
  change: ['8000', '9500'],
  add: ['21', '10000'],
  sub: ['20', '45000'],
  reverse: ['12100', '21'],
};

export default function PercentCalculator({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [v, setV] = useState(INITIAL);
  const num = (s: string) => parseNum(s, lang);
  const f = (n: number, d = 2) => fmtNum(n, lang, d);

  const calc = (id: CalcId): { main: number; suffix?: string; sub?: string } => {
    const [a, b] = v[id].map(num);
    switch (id) {
      case 'of':
        return { main: (a * b) / 100 };
      case 'what':
        return { main: b ? (a / b) * 100 : NaN, suffix: '%' };
      case 'change': {
        const pct = a ? ((b - a) / Math.abs(a)) * 100 : NaN;
        return { main: pct, suffix: '%', sub: Number.isFinite(pct) ? `${pct >= 0 ? t.up : t.down} · ${t.diff}: ${f(b - a)}` : undefined };
      }
      case 'add':
        return { main: b * (1 + a / 100), sub: `${t.added}: ${f((b * a) / 100)}` };
      case 'sub':
        return { main: b * (1 - a / 100), sub: `${t.saving}: ${f((b * a) / 100)}` };
      case 'reverse': {
        const orig = a / (1 + b / 100);
        return { main: orig, sub: `${t.removed}: ${f(a - orig)}` };
      }
    }
  };

  return (
    <div class="pct-grid">
      {(Object.keys(INITIAL) as CalcId[]).map((id) => {
        const r = calc(id);
        const labels = t[id];
        const value = Number.isFinite(r.main) ? `${f(r.main, r.suffix ? 2 : 2)}${r.suffix ? ' %' : ''}` : '—';
        const isChange = id === 'change' && Number.isFinite(r.main);
        return (
          <section class="panel pct-card" key={id}>
            <h2 class="panel-title">{labels.title}</h2>
            <div class="pct-sentence">
              {labels.a && <span>{labels.a}</span>}
              <div class="pct-input">
                <NumInput value={v[id][0]} onValue={(x) => setV((p) => ({ ...p, [id]: [x, p[id][1]] }))} aria-label={`${labels.title} 1`} />
              </div>
              <span>{labels.b}</span>
              <div class="pct-input">
                <NumInput value={v[id][1]} onValue={(x) => setV((p) => ({ ...p, [id]: [p[id][0], x] }))} aria-label={`${labels.title} 2`} />
              </div>
              {labels.c && <span>{labels.c}</span>}
            </div>
            <div class="pct-result">
              <span class={`result-big ${isChange ? (r.main >= 0 ? 'positive' : 'negative') : ''}`}>
                {isChange && r.main > 0 ? '+' : ''}
                {value}
              </span>
              <CopyButton lang={lang} text={Number.isFinite(r.main) ? f(r.main) : ''} class="btn btn-sm btn-ghost" />
            </div>
            {r.sub && <p class="muted small">{r.sub}</p>}
          </section>
        );
      })}
      <style>{`
        .pct-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); }
        @media (max-width: 420px) { .pct-grid { grid-template-columns: minmax(0, 1fr); } }
        .pct-card { display: flex; flex-direction: column; gap: 14px; }
        .pct-card .panel-title { margin: 0; }
        .pct-sentence { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; color: var(--text-2); }
        .pct-input { width: 120px; }
        .pct-result { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 12px; border-top: 1px solid var(--border); }
        .pct-result .result-big { font-size: 28px; overflow-wrap: anywhere; }
      `}</style>
    </div>
  );
}
