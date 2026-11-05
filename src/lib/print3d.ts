import { parseNum, type Lang } from './format';

export interface Settings {
  currency: string; // código de CURRENCIES
  custom: string; // símbolo propio cuando currency === 'custom'
  filamentKg: string; // precio del kilo de filamento
  waste: string; // % de desperdicio (soportes, purgas)
  watts: string;
  kwh: string; // precio del kWh
  printerCost: string;
  lifeH: string; // horas de vida útil de la impresora
  maint: string; // % extra sobre la amortización
  fail: string; // % de impresiones fallidas
  labor: string; // valor de la hora de trabajo
  setupMin: string; // preparación del trabajo (minutos, una sola vez)
  packaging: string; // embalaje u otros costos fijos del trabajo
  markup: string; // ganancia sobre el costo: un % o un multiplicador, según markupMode
  markupMode: 'pct' | 'mult';
  round: '0' | '1' | '10' | '100';
  vatOn: boolean;
  vatRate: string;
  secondOn: boolean;
  secondCur: string;
  rate: string; // 1 unidad de la segunda moneda = X de la principal
  rateDate: string; // día en que se tomó la cotización (yyyy-mm-dd)
}

export interface Part {
  id: number;
  name: string;
  grams: string;
  h: string;
  min: string;
  qty: string;
  post: string; // minutos de postproceso por unidad
  extra: string; // costo extra por unidad (tornillos, imanes, pintura…)
}

/** Insumo del trabajo (embalaje, protección, accesorios…). Se cobra una sola vez por trabajo. */
export interface Supply {
  id: number;
  name: string;
  price: string;
  cur: 'main' | 'alt'; // moneda principal o la segunda (se convierte con la cotización cargada a mano)
}

/** Modelo 3D que hubo que comprar para el trabajo. */
export interface ModelBuy {
  on: boolean;
  name: string;
  price: string;
  cur: 'main' | 'alt';
}

export const EMPTY_MODEL: ModelBuy = { on: false, name: '', price: '', cur: 'main' };

export const CURRENCIES: { code: string; sym: string }[] = [
  { code: 'ARS', sym: '$' },
  { code: 'USD', sym: 'US$' },
  { code: 'EUR', sym: '€' },
  { code: 'BRL', sym: 'R$' },
  { code: 'CLP', sym: '$' },
  { code: 'UYU', sym: '$U' },
  { code: 'MXN', sym: 'MX$' },
  { code: 'COP', sym: 'COL$' },
  { code: 'PEN', sym: 'S/' },
];

export const symbolOf = (code: string, custom: string) => (code === 'custom' ? custom.trim() || '$' : CURRENCIES.find((c) => c.code === code)?.sym ?? '$');

export interface PartRow {
  part: Part;
  qty: number;
  material: number;
  energy: number;
  machine: number;
  risk: number;
  labor: number;
  extra: number;
  cost: number; // por unidad
  price: number; // por unidad, ya redondeado
}

export interface JobResult {
  rows: PartRow[];
  setupCost: number;
  setupPrice: number;
  suppliesCost: number;
  suppliesPrice: number;
  modelCost: number;
  modelPrice: number;
  costTotal: number;
  priceNet: number;
  profit: number;
  vat: number;
  total: number;
  breakdown: { material: number; energy: number; machine: number; risk: number; labor: number; extra: number; supplies: number; model: number };
}

export const roundPrice = (value: number, step: Settings['round']) => {
  const s = Number(step);
  if (!Number.isFinite(value)) return 0;
  return s > 0 ? Math.ceil(value / s - 1e-9) * s : Math.round(value * 100) / 100;
};

export function calculate(s: Settings, parts: Part[], lang: Lang, supplies: Supply[] = [], model: ModelBuy = EMPTY_MODEL): JobResult {
  const n = (x: string) => {
    const v = parseNum(x, lang);
    return Number.isFinite(v) && v > 0 ? v : 0;
  };
  // Con multiplicador, 2 significa que el precio es el doble del costo; vacío o 0 no cambia nada.
  const markup = s.markupMode === 'mult' ? n(s.markup) || 1 : 1 + n(s.markup) / 100;
  const rows: PartRow[] = parts.map((part) => {
    const hours = n(part.h) + n(part.min) / 60;
    const material = (n(part.grams) / 1000) * n(s.filamentKg) * (1 + n(s.waste) / 100);
    const energy = hours * (n(s.watts) / 1000) * n(s.kwh);
    const machine = n(s.lifeH) > 0 ? hours * (n(s.printerCost) / n(s.lifeH)) * (1 + n(s.maint) / 100) : 0;
    const risk = (material + energy + machine) * (n(s.fail) / 100);
    const labor = (n(part.post) / 60) * n(s.labor);
    const extra = n(part.extra);
    const cost = material + energy + machine + risk + labor + extra;
    return { part, qty: n(part.qty) || 1, material, energy, machine, risk, labor, extra, cost, price: roundPrice(cost * markup, s.round) };
  });

  const setupLabor = (n(s.setupMin) / 60) * n(s.labor);
  const setupCost = setupLabor + n(s.packaging);
  const setupPrice = setupCost > 0 ? roundPrice(setupCost * markup, s.round) : 0;

  // Los importes en la segunda moneda se pasan a la principal con la cotización cargada a mano.
  const inMain = (price: string, cur: 'main' | 'alt') => n(price) * (cur === 'alt' ? n(s.rate) : 1);
  const suppliesCost = supplies.reduce((t, x) => t + inMain(x.price, x.cur), 0);
  const suppliesPrice = suppliesCost > 0 ? roundPrice(suppliesCost * markup, s.round) : 0;
  const modelCost = model.on ? inMain(model.price, model.cur) : 0;
  const modelPrice = modelCost > 0 ? roundPrice(modelCost * markup, s.round) : 0;

  const sum = (f: (r: PartRow) => number) => rows.reduce((t, r) => t + f(r) * r.qty, 0);
  const costTotal = sum((r) => r.cost) + setupCost + suppliesCost + modelCost;
  const priceNet = sum((r) => r.price) + setupPrice + suppliesPrice + modelPrice;
  const vat = s.vatOn ? (priceNet * n(s.vatRate)) / 100 : 0;
  return {
    rows,
    setupCost,
    setupPrice,
    suppliesCost,
    suppliesPrice,
    modelCost,
    modelPrice,
    costTotal,
    priceNet,
    profit: priceNet - costTotal,
    vat,
    total: priceNet + vat,
    breakdown: {
      material: sum((r) => r.material),
      energy: sum((r) => r.energy),
      machine: sum((r) => r.machine),
      risk: sum((r) => r.risk),
      labor: sum((r) => r.labor) + setupLabor,
      extra: sum((r) => r.extra) + n(s.packaging),
      supplies: suppliesCost,
      model: modelCost,
    },
  };
}
