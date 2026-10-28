import { useState } from 'preact/hooks';
import { ArrowLeftRight } from 'lucide-preact';
import { CopyButton, NumInput, fmtNum, parseNum, type Lang } from './shared/ui';

type L = Record<Lang, string>;
interface Unit {
  id: string;
  name: L;
  /** Cuántas unidades base hay en 1 de esta unidad. */
  factor?: number;
  toBase?: (v: number) => number;
  fromBase?: (v: number) => number;
}
interface Quantity {
  id: string;
  name: L;
  units: Unit[];
  from: string;
  to: string;
}

const u = (id: string, es: string, en: string, factor: number): Unit => ({ id, name: { es, en }, factor });

const QUANTITIES: Quantity[] = [
  {
    id: 'length',
    name: { es: 'Longitud', en: 'Length' },
    from: 'cm',
    to: 'in',
    units: [
      u('mm', 'Milímetros (mm)', 'Millimeters (mm)', 0.001),
      u('cm', 'Centímetros (cm)', 'Centimeters (cm)', 0.01),
      u('m', 'Metros (m)', 'Meters (m)', 1),
      u('km', 'Kilómetros (km)', 'Kilometers (km)', 1000),
      u('in', 'Pulgadas (in)', 'Inches (in)', 0.0254),
      u('ft', 'Pies (ft)', 'Feet (ft)', 0.3048),
      u('yd', 'Yardas (yd)', 'Yards (yd)', 0.9144),
      u('mi', 'Millas (mi)', 'Miles (mi)', 1609.344),
      u('nmi', 'Millas náuticas', 'Nautical miles', 1852),
    ],
  },
  {
    id: 'weight',
    name: { es: 'Peso', en: 'Weight' },
    from: 'kg',
    to: 'lb',
    units: [
      u('mg', 'Miligramos (mg)', 'Milligrams (mg)', 1e-6),
      u('g', 'Gramos (g)', 'Grams (g)', 0.001),
      u('kg', 'Kilogramos (kg)', 'Kilograms (kg)', 1),
      u('t', 'Toneladas (t)', 'Metric tons (t)', 1000),
      u('oz', 'Onzas (oz)', 'Ounces (oz)', 0.028349523125),
      u('lb', 'Libras (lb)', 'Pounds (lb)', 0.45359237),
      u('st', 'Stones (st)', 'Stones (st)', 6.35029318),
    ],
  },
  {
    id: 'volume',
    name: { es: 'Volumen', en: 'Volume' },
    from: 'l',
    to: 'gal',
    units: [
      u('ml', 'Mililitros (ml)', 'Milliliters (ml)', 0.001),
      u('cl', 'Centilitros (cl)', 'Centiliters (cl)', 0.01),
      u('l', 'Litros (l)', 'Liters (l)', 1),
      u('m3', 'Metros cúbicos (m³)', 'Cubic meters (m³)', 1000),
      u('tsp', 'Cucharaditas (EE. UU.)', 'Teaspoons (US)', 0.00492892159375),
      u('tbsp', 'Cucharadas (EE. UU.)', 'Tablespoons (US)', 0.01478676478125),
      u('cup', 'Tazas (EE. UU.)', 'Cups (US)', 0.2365882365),
      u('floz', 'Onzas líquidas (EE. UU.)', 'Fluid ounces (US)', 0.0295735295625),
      u('gal', 'Galones (EE. UU.)', 'Gallons (US)', 3.785411784),
      u('galuk', 'Galones (imperial)', 'Gallons (imperial)', 4.54609),
    ],
  },
  {
    id: 'temperature',
    name: { es: 'Temperatura', en: 'Temperature' },
    from: 'c',
    to: 'f',
    units: [
      { id: 'c', name: { es: 'Celsius (°C)', en: 'Celsius (°C)' }, toBase: (v) => v, fromBase: (v) => v },
      { id: 'f', name: { es: 'Fahrenheit (°F)', en: 'Fahrenheit (°F)' }, toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
      { id: 'k', name: { es: 'Kelvin (K)', en: 'Kelvin (K)' }, toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  {
    id: 'area',
    name: { es: 'Superficie', en: 'Area' },
    from: 'm2',
    to: 'ft2',
    units: [
      u('cm2', 'Centímetros² (cm²)', 'Square cm (cm²)', 1e-4),
      u('m2', 'Metros² (m²)', 'Square meters (m²)', 1),
      u('ha', 'Hectáreas (ha)', 'Hectares (ha)', 10000),
      u('km2', 'Kilómetros² (km²)', 'Square km (km²)', 1e6),
      u('in2', 'Pulgadas²', 'Square inches', 0.00064516),
      u('ft2', 'Pies²', 'Square feet', 0.09290304),
      u('ac', 'Acres', 'Acres', 4046.8564224),
    ],
  },
  {
    id: 'speed',
    name: { es: 'Velocidad', en: 'Speed' },
    from: 'kmh',
    to: 'mph',
    units: [
      u('ms', 'Metros/segundo (m/s)', 'Meters/second (m/s)', 1),
      u('kmh', 'Kilómetros/hora (km/h)', 'Kilometers/hour (km/h)', 1 / 3.6),
      u('mph', 'Millas/hora (mph)', 'Miles/hour (mph)', 0.44704),
      u('kn', 'Nudos (kn)', 'Knots (kn)', 1852 / 3600),
      u('fts', 'Pies/segundo (ft/s)', 'Feet/second (ft/s)', 0.3048),
    ],
  },
  {
    id: 'data',
    name: { es: 'Datos', en: 'Data' },
    from: 'mb',
    to: 'mib',
    units: [
      u('bit', 'Bits', 'Bits', 1 / 8),
      u('b', 'Bytes (B)', 'Bytes (B)', 1),
      u('kb', 'Kilobytes (KB)', 'Kilobytes (KB)', 1e3),
      u('mb', 'Megabytes (MB)', 'Megabytes (MB)', 1e6),
      u('gb', 'Gigabytes (GB)', 'Gigabytes (GB)', 1e9),
      u('tb', 'Terabytes (TB)', 'Terabytes (TB)', 1e12),
      u('kib', 'Kibibytes (KiB)', 'Kibibytes (KiB)', 1024),
      u('mib', 'Mebibytes (MiB)', 'Mebibytes (MiB)', 1024 ** 2),
      u('gib', 'Gibibytes (GiB)', 'Gibibytes (GiB)', 1024 ** 3),
      u('tib', 'Tebibytes (TiB)', 'Tebibytes (TiB)', 1024 ** 4),
    ],
  },
  {
    id: 'time',
    name: { es: 'Tiempo', en: 'Time' },
    from: 'h',
    to: 'min',
    units: [
      u('ms', 'Milisegundos', 'Milliseconds', 0.001),
      u('s', 'Segundos', 'Seconds', 1),
      u('min', 'Minutos', 'Minutes', 60),
      u('h', 'Horas', 'Hours', 3600),
      u('d', 'Días', 'Days', 86400),
      u('wk', 'Semanas', 'Weeks', 604800),
      u('mo', 'Meses (promedio)', 'Months (average)', 2629746),
      u('yr', 'Años', 'Years', 31556952),
    ],
  },
];

const toBase = (unit: Unit, v: number) => (unit.toBase ? unit.toBase(v) : v * unit.factor!);
const fromBase = (unit: Unit, v: number) => (unit.fromBase ? unit.fromBase(v) : v / unit.factor!);

const T = {
  es: { value: 'Valor', from: 'De', to: 'A', swap: 'Invertir', all: 'Equivalencias' },
  en: { value: 'Value', from: 'From', to: 'To', swap: 'Swap', all: 'All equivalents' },
};

/** Muestra hasta 10 cifras significativas sin notación científica para valores comunes. */
const pretty = (n: number, lang: Lang) => {
  if (!Number.isFinite(n)) return '—';
  if (n !== 0 && (Math.abs(n) >= 1e15 || Math.abs(n) < 1e-9)) return n.toExponential(6);
  const decimals = Math.abs(n) >= 1 ? Math.max(0, 8 - Math.floor(Math.log10(Math.abs(n)))) : 10;
  return fmtNum(Number(n.toPrecision(10)), lang, Math.min(decimals, 10));
};

export default function UnitConverter({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [qId, setQId] = useState('length');
  const q = QUANTITIES.find((x) => x.id === qId)!;
  const [sel, setSel] = useState<Record<string, { from: string; to: string }>>({});
  const [value, setValue] = useState('1');
  const from = q.units.find((x) => x.id === (sel[qId]?.from ?? q.from))!;
  const to = q.units.find((x) => x.id === (sel[qId]?.to ?? q.to))!;
  const setUnits = (patch: Partial<{ from: string; to: string }>) =>
    setSel((s) => ({ ...s, [qId]: { from: from.id, to: to.id, ...patch } }));

  const v = parseNum(value, lang);
  const base = toBase(from, v);
  const result = fromBase(to, base);

  return (
    <div class="stack-lg">
      <div class="segmented">
        {QUANTITIES.map((x) => (
          <button type="button" key={x.id} aria-pressed={x.id === qId} onClick={() => setQId(x.id)}>
            {x.name[lang]}
          </button>
        ))}
      </div>

      <section class="panel">
        <div class="conv-row">
          <div class="field">
            <label class="label" htmlFor="uc-value">
              {t.from}
            </label>
            <NumInput id="uc-value" value={value} onValue={setValue} />
            <select class="select" value={from.id} onChange={(e) => setUnits({ from: e.currentTarget.value })} aria-label={t.from}>
              {q.units.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name[lang]}
                </option>
              ))}
            </select>
          </div>
          <button type="button" class="btn btn-icon conv-swap" aria-label={t.swap} title={t.swap} onClick={() => setUnits({ from: to.id, to: from.id })}>
            <ArrowLeftRight aria-hidden="true" />
          </button>
          <div class="field">
            <span class="label">{t.to}</span>
            <div class="conv-result">
              <span class="mono">{pretty(result, lang)}</span>
              <CopyButton lang={lang} class="btn btn-sm btn-ghost btn-icon" label="" text={Number.isFinite(result) ? pretty(result, lang) : ''} />
            </div>
            <select class="select" value={to.id} onChange={(e) => setUnits({ to: e.currentTarget.value })} aria-label={t.to}>
              {q.units.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name[lang]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section class="panel">
        <h2 class="panel-title">
          {t.all}: {Number.isFinite(v) ? pretty(v, lang) : '—'} {from.name[lang]}
        </h2>
        <div class="table-wrap">
          <table class="table">
            <tbody>
              {q.units.map((x) => (
                <tr key={x.id} class={x.id === to.id ? 'is-current' : ''}>
                  <td>{x.name[lang]}</td>
                  <td class="num mono">{pretty(fromBase(x, base), lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .conv-row { display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center; }
        .conv-row .field { gap: 8px; }
        .conv-swap { margin-top: 26px; }
        .conv-result {
          display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 40px;
          padding: 0 4px 0 12px; border-radius: 10px; background: var(--accent-soft); font-weight: 650; font-size: 16px; overflow: hidden;
        }
        .conv-result .mono { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .table tr.is-current td { background: var(--accent-soft); font-weight: 600; }
        @media (max-width: 640px) {
          .conv-row { grid-template-columns: 1fr; }
          .conv-swap { margin: 0 auto; transform: rotate(90deg); }
        }
      `}</style>
    </div>
  );
}
