import { useMemo, useState } from 'preact/hooks';
import { FileDown, Plus, Trash2, Wand2 } from 'lucide-preact';
import { Field, NumInput, downloadBlob, fmtNum, parseNum, useStoredState, type Lang } from './shared/ui';
import { LogoPicker } from './shared/LogoPicker';
import { CURRENCIES, calculate, symbolOf, type Part, type Settings } from '../lib/print3d';
import { DOC_WORDS, EMPTY_ISSUER } from './Documents';
import type { Issuer } from './documents/pdf';

const T = {
  es: {
    parts: 'Piezas a imprimir',
    partName: 'Nombre de la pieza',
    grams: 'Peso (g)',
    hours: 'Horas',
    minutes: 'Min',
    qty: 'Cantidad',
    post: 'Postproceso (min)',
    extra: 'Costo extra c/u',
    addPart: 'Agregar pieza',
    removePart: 'Quitar pieza',
    material: 'Material y máquina',
    filamentKg: 'Precio del filamento (por kilo)',
    waste: 'Desperdicio y soportes',
    watts: 'Consumo de la impresora (W)',
    kwh: 'Precio del kWh',
    printerCost: 'Precio de la impresora',
    lifeH: 'Vida útil (horas)',
    maint: 'Mantenimiento',
    fail: 'Impresiones fallidas',
    work: 'Trabajo y ganancia',
    labor: 'Valor de tu hora de trabajo',
    setupMin: 'Preparación del trabajo (min)',
    setupHint: 'Laminado, cambio de material, atención al cliente: se cobra una sola vez.',
    packaging: 'Embalaje y otros costos fijos',
    markup: 'Ganancia sobre el costo',
    round: 'Redondear precios hacia arriba',
    roundOpts: [['0', 'No redondear'], ['1', 'Al entero'], ['10', 'A la decena'], ['100', 'A la centena']] as [string, string][],
    currency: 'Moneda',
    custom: 'Símbolo',
    vatOn: 'Agregar IVA al presupuesto',
    vatRate: 'Alícuota',
    vatHint: 'Si no facturás con IVA, dejalo desactivado: el precio queda sin impuestos.',
    secondOn: 'Mostrar el total en otra moneda',
    secondCur: 'Otra moneda',
    rate: 'Cotización',
    rateHint: (a: string, b: string) => `1 ${a} equivale a cuántos ${b}`,
    summary: 'Resultado',
    costTotal: 'Costo total',
    priceNet: 'Precio sin IVA',
    price: 'Precio',
    profit: 'Ganancia',
    vat: 'IVA',
    total: 'Total',
    perUnit: 'Precio por unidad',
    setup: 'Preparación y embalaje',
    breakdown: 'En qué se va el costo',
    labels: { material: 'Material', energy: 'Electricidad', machine: 'Máquina', risk: 'Fallas', labor: 'Mano de obra', extra: 'Extras y embalaje' } as Record<string, string>,
    quote: 'Presupuesto en PDF',
    quoteHint: 'Arma un presupuesto con estas piezas. Es un documento no fiscal.',
    clientName: 'Cliente',
    notes: 'Observaciones',
    notesDefault: 'Tiempo de entrega a coordinar. Los precios corresponden a las piezas detalladas.',
    issuer: 'Tus datos para el presupuesto',
    business: 'Nombre o razón social',
    taxId: 'CUIT',
    address: 'Domicilio',
    phone: 'Teléfono',
    email: 'Email',
    uploadLogo: 'Subir logo',
    removeLogo: 'Quitar',
    logo: 'Logo',
    download: 'Descargar presupuesto',
    example: 'Cargar un ejemplo',
    empty: 'Completá los costos y el peso y las horas de cada pieza para ver el precio.',
    defaultPart: (i: number) => `Pieza ${i}`,
    note: 'Los costos son una estimación: el consumo real y el tiempo de impresión dependen de tu laminador y tu máquina.',
  },
  en: {
    parts: 'Parts to print',
    partName: 'Part name',
    grams: 'Weight (g)',
    hours: 'Hours',
    minutes: 'Min',
    qty: 'Quantity',
    post: 'Post-processing (min)',
    extra: 'Extra cost each',
    addPart: 'Add part',
    removePart: 'Remove part',
    material: 'Material and machine',
    filamentKg: 'Filament price (per kg)',
    waste: 'Waste and supports',
    watts: 'Printer power draw (W)',
    kwh: 'Price per kWh',
    printerCost: 'Printer price',
    lifeH: 'Lifespan (hours)',
    maint: 'Maintenance',
    fail: 'Failed prints',
    work: 'Labor and profit',
    labor: 'Your hourly rate',
    setupMin: 'Job setup (min)',
    setupHint: 'Slicing, material changes, customer service: charged once per job.',
    packaging: 'Packaging and other fixed costs',
    markup: 'Profit on cost',
    round: 'Round prices up',
    roundOpts: [['0', 'Do not round'], ['1', 'To the unit'], ['10', 'To the ten'], ['100', 'To the hundred']] as [string, string][],
    currency: 'Currency',
    custom: 'Symbol',
    vatOn: 'Add VAT to the quote',
    vatRate: 'Rate',
    vatHint: 'If you do not invoice with VAT, leave it off: the price stays tax-free.',
    secondOn: 'Show the total in another currency',
    secondCur: 'Other currency',
    rate: 'Exchange rate',
    rateHint: (a: string, b: string) => `1 ${a} equals how many ${b}`,
    summary: 'Result',
    costTotal: 'Total cost',
    priceNet: 'Price before VAT',
    price: 'Price',
    profit: 'Profit',
    vat: 'VAT',
    total: 'Total',
    perUnit: 'Price per unit',
    setup: 'Setup and packaging',
    breakdown: 'Where the cost goes',
    labels: { material: 'Material', energy: 'Electricity', machine: 'Machine', risk: 'Failures', labor: 'Labor', extra: 'Extras and packaging' } as Record<string, string>,
    quote: 'Quote as PDF',
    quoteHint: 'Builds a quote from these parts. It is a non-fiscal document.',
    clientName: 'Customer',
    notes: 'Notes',
    notesDefault: 'Delivery time to be arranged. Prices apply to the parts listed.',
    issuer: 'Your details for the quote',
    business: 'Name or company',
    taxId: 'Tax ID (CUIT)',
    address: 'Address',
    phone: 'Phone',
    email: 'Email',
    uploadLogo: 'Upload logo',
    removeLogo: 'Remove',
    logo: 'Logo',
    download: 'Download quote',
    example: 'Load an example',
    empty: 'Fill in the costs and each part’s weight and hours to see the price.',
    defaultPart: (i: number) => `Part ${i}`,
    note: 'Costs are an estimate: real consumption and print time depend on your slicer and machine.',
  },
};

const DEFAULTS: Settings = {
  currency: 'ARS', custom: '', filamentKg: '', waste: '5', watts: '150', kwh: '', printerCost: '', lifeH: '5000', maint: '10', fail: '10',
  labor: '', setupMin: '', packaging: '', markup: '100', round: '0', vatOn: false, vatRate: '21', secondOn: false, secondCur: 'USD', rate: '',
};
const EXAMPLE: Settings = { ...DEFAULTS, filamentKg: '25000', kwh: '120', printerCost: '600000', labor: '3000', setupMin: '15', packaging: '1500', round: '100' };

let nextId = 1;
const newPart = (over: Partial<Part> = {}): Part => ({ id: nextId++, name: '', grams: '', h: '', min: '', qty: '1', post: '', extra: '', ...over });

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const bumpNumber = (n: string) => n.replace(/(\d+)(\D*)$/, (_, d: string, rest: string) => String(Number(d) + 1).padStart(d.length, '0') + rest);

export default function Print3dCalculator({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [s, setS] = useStoredState<Settings>('p3d-settings', DEFAULTS);
  const [parts, setParts] = useState<Part[]>(() => [newPart()]);
  const [client, setClient] = useState('');
  const [notes, setNotes] = useState(t.notesDefault);
  const [issuer, setIssuer] = useStoredState<Issuer>('doc-issuer', EMPTY_ISSUER);
  const [number, setNumber] = useStoredState('doc-number-quote', '0001-00000001');
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((o) => ({ ...o, [k]: v }));
  const setPart = (id: number, patch: Partial<Part>) => setParts((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const setI = <K extends keyof Issuer>(k: K, v: Issuer[K]) => setIssuer((o) => ({ ...o, [k]: v }));

  const sym = symbolOf(s.currency, s.custom);
  const secondSym = symbolOf(s.secondCur, '');
  const money = (n: number, symbol = sym) => `${n < 0 ? '−' : ''}${symbol} ${fmtNum(Math.abs(n), lang, 2, 2)}`;
  const r = useMemo(() => calculate(s, parts, lang), [s, parts, lang]);
  const rate = parseNum(s.rate, lang);
  const hasData = r.priceNet > 0;
  const maxBreak = Math.max(...Object.values(r.breakdown), 0.0001);

  const buildQuote = async () => {
    setBusy(true);
    try {
      const { buildDocumentPdf } = await import('./documents/pdf');
      const list = r.rows.map((row, i) => ({ id: i, desc: row.part.name.trim() || t.defaultPart(i + 1), qty: String(row.qty), price: fmtNum(row.price, lang, 2, 2) }));
      if (r.setupPrice > 0) list.push({ id: 999, desc: t.setup, qty: '1', price: fmtNum(r.setupPrice, lang, 2, 2) });
      const bytes = await buildDocumentPdf(
        {
          kind: 'quote', number, date: today(), clientName: client, clientTaxId: '', clientAddress: '', items: list, discount: '',
          vat: s.vatOn ? s.vatRate : '0', vatIncluded: false, currency: sym, validity: '15', notes, showPrices: true,
          amount: '', concept: '', method: '', reference: '',
        },
        issuer,
        lang,
        DOC_WORDS[lang],
      );
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `${DOC_WORDS[lang].title.quote}-${number}.pdf`.replace(/[^\w.\-]+/g, '_'));
      setNumber(bumpNumber(number));
    } finally {
      setBusy(false);
    }
  };

  const num = (id: string, label: string, key: keyof Settings, opts: { prefix?: string; suffix?: string; hint?: string } = {}) => (
    <Field label={label} htmlFor={id} hint={opts.hint}>
      <NumInput id={id} value={String(s[key])} onValue={(v) => set(key, v as never)} prefix={opts.prefix} suffix={opts.suffix} />
    </Field>
  );

  return (
    <div class="tool-layout wide-left">
      <div class="stack">
        <section class="panel stack">
          <div class="p3-head">
            <h2 class="panel-title" style="margin:0">{t.parts}</h2>
            <button type="button" class="btn btn-sm btn-ghost" onClick={() => (setS(EXAMPLE), setParts([newPart({ name: lang === 'es' ? 'Soporte de auriculares' : 'Headphone stand', grams: '85', h: '4', min: '30', qty: '3', post: '10' })]))}>
              <Wand2 aria-hidden="true" />
              {t.example}
            </button>
          </div>
          {parts.map((p, i) => (
            <div class="p3-part" key={p.id}>
              <div class="p3-name">
                <input class="input" aria-label={t.partName} placeholder={`${t.partName} (${t.defaultPart(i + 1)})`} value={p.name} onInput={(e) => setPart(p.id, { name: e.currentTarget.value })} />
                <button type="button" class="btn btn-icon btn-ghost" aria-label={t.removePart} disabled={parts.length === 1} onClick={() => setParts((l) => l.filter((x) => x.id !== p.id))}>
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
              <div class="p3-grid">
                <Field label={t.grams}><NumInput aria-label={t.grams} value={p.grams} onValue={(v) => setPart(p.id, { grams: v })} /></Field>
                <Field label={t.hours}><NumInput aria-label={t.hours} value={p.h} onValue={(v) => setPart(p.id, { h: v })} /></Field>
                <Field label={t.minutes}><NumInput aria-label={t.minutes} value={p.min} onValue={(v) => setPart(p.id, { min: v })} /></Field>
                <Field label={t.qty}><NumInput aria-label={t.qty} value={p.qty} onValue={(v) => setPart(p.id, { qty: v })} /></Field>
                <Field label={t.post}><NumInput aria-label={t.post} value={p.post} onValue={(v) => setPart(p.id, { post: v })} /></Field>
                <Field label={t.extra}><NumInput aria-label={t.extra} prefix={sym} value={p.extra} onValue={(v) => setPart(p.id, { extra: v })} /></Field>
              </div>
            </div>
          ))}
          <div>
            <button type="button" class="btn btn-sm" onClick={() => setParts((l) => [...l, newPart()])}>
              <Plus aria-hidden="true" />
              {t.addPart}
            </button>
          </div>
        </section>

        <section class="panel stack">
          <h2 class="panel-title" style="margin:0">{t.material}</h2>
          <div class="form-grid">
            {num('p3-fil', t.filamentKg, 'filamentKg', { prefix: sym })}
            {num('p3-waste', t.waste, 'waste', { suffix: '%' })}
            {num('p3-watts', t.watts, 'watts', { suffix: 'W' })}
            {num('p3-kwh', t.kwh, 'kwh', { prefix: sym })}
            {num('p3-printer', t.printerCost, 'printerCost', { prefix: sym })}
            {num('p3-life', t.lifeH, 'lifeH', { suffix: 'h' })}
            {num('p3-maint', t.maint, 'maint', { suffix: '%' })}
            {num('p3-fail', t.fail, 'fail', { suffix: '%' })}
          </div>
        </section>

        <section class="panel stack">
          <h2 class="panel-title" style="margin:0">{t.work}</h2>
          <div class="form-grid">
            {num('p3-labor', t.labor, 'labor', { prefix: sym })}
            {num('p3-setup', t.setupMin, 'setupMin', { suffix: 'min', hint: t.setupHint })}
            {num('p3-pack', t.packaging, 'packaging', { prefix: sym })}
            {num('p3-markup', t.markup, 'markup', { suffix: '%' })}
          </div>
          <Field label={t.round} htmlFor="p3-round">
            <select id="p3-round" class="select" value={s.round} onChange={(e) => set('round', e.currentTarget.value as Settings['round'])}>
              {t.roundOpts.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </section>

        <section class="panel stack">
          <div class="form-grid">
            <Field label={t.currency} htmlFor="p3-cur">
              <select id="p3-cur" class="select" value={s.currency} onChange={(e) => set('currency', e.currentTarget.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.sym}
                  </option>
                ))}
                <option value="custom">{lang === 'es' ? 'Otra…' : 'Other…'}</option>
              </select>
            </Field>
            {s.currency === 'custom' && (
              <Field label={t.custom} htmlFor="p3-custom">
                <input id="p3-custom" class="input" maxLength={6} value={s.custom} onInput={(e) => set('custom', e.currentTarget.value)} />
              </Field>
            )}
          </div>
          <label class="check">
            <input type="checkbox" checked={s.vatOn} onChange={(e) => set('vatOn', e.currentTarget.checked)} />
            {t.vatOn}
          </label>
          {s.vatOn ? (
            <Field label={t.vatRate} htmlFor="p3-vat">
              <select id="p3-vat" class="select" value={s.vatRate} onChange={(e) => set('vatRate', e.currentTarget.value)}>
                <option value="21">21 %</option>
                <option value="10.5">10,5 %</option>
                <option value="27">27 %</option>
              </select>
            </Field>
          ) : (
            <span class="hint">{t.vatHint}</span>
          )}
          <label class="check">
            <input type="checkbox" checked={s.secondOn} onChange={(e) => set('secondOn', e.currentTarget.checked)} />
            {t.secondOn}
          </label>
          {s.secondOn && (
            <div class="form-grid">
              <Field label={t.secondCur} htmlFor="p3-cur2">
                <select id="p3-cur2" class="select" value={s.secondCur} onChange={(e) => set('secondCur', e.currentTarget.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {c.sym}
                    </option>
                  ))}
                </select>
              </Field>
              {num('p3-rate', t.rate, 'rate', { prefix: sym, hint: t.rateHint(s.secondCur, s.currency === 'custom' ? sym : s.currency) })}
            </div>
          )}
        </section>
      </div>

      <div class="stack sticky">
        <section class="panel stack">
          <h2 class="panel-title" style="margin:0">{t.summary}</h2>
          {!hasData ? (
            <span class="muted">{t.empty}</span>
          ) : (
            <>
              <div class="p3-total">
                <span>{s.vatOn ? t.total : t.price}</span>
                <strong>{money(r.total)}</strong>
                {s.secondOn && Number.isFinite(rate) && rate > 0 && <span class="muted small">≈ {money(r.total / rate, secondSym)}</span>}
              </div>
              <div class="breakdown">
                {r.rows.map((row, i) => (
                  <div class="breakdown-row" key={row.part.id}>
                    <span>
                      {row.part.name.trim() || t.defaultPart(i + 1)} × {fmtNum(row.qty, lang, 2)}
                      <span class="muted small"> · {t.perUnit.toLowerCase()}</span>
                    </span>
                    <span class="amount">{money(row.price)}</span>
                  </div>
                ))}
                {r.setupPrice > 0 && (
                  <div class="breakdown-row">
                    <span>{t.setup}</span>
                    <span class="amount">{money(r.setupPrice)}</span>
                  </div>
                )}
                {s.vatOn && (
                  <div class="breakdown-row">
                    <span>{t.priceNet}</span>
                    <span class="amount">{money(r.priceNet)}</span>
                  </div>
                )}
                {s.vatOn && (
                  <div class="breakdown-row">
                    <span>
                      {t.vat} {fmtNum(parseNum(s.vatRate, lang) || 0, lang, 2)} %
                    </span>
                    <span class="amount">{money(r.vat)}</span>
                  </div>
                )}
                <div class="breakdown-row total">
                  <span>{t.total}</span>
                  <span class="amount">{money(r.total)}</span>
                </div>
              </div>
              <div class="stats">
                <div class="stat">
                  <div class="stat-label">{t.costTotal}</div>
                  <div class="stat-value">{money(r.costTotal)}</div>
                </div>
                <div class="stat">
                  <div class="stat-label">{t.profit}</div>
                  <div class={`stat-value ${r.profit >= 0 ? 'positive' : 'negative'}`}>{money(r.profit)}</div>
                </div>
              </div>
              <div class="stack" style="gap:8px">
                <span class="label">{t.breakdown}</span>
                {Object.entries(r.breakdown)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => (
                    <div class="p3-bar" key={k}>
                      <span class="small">{t.labels[k]}</span>
                      <div class="p3-track">
                        <div class="p3-fill" style={`width:${Math.max(3, (v / maxBreak) * 100)}%`} />
                      </div>
                      <span class="small amount">{money(v)}</span>
                    </div>
                  ))}
              </div>
            </>
          )}
          <span class="hint">{t.note}</span>
        </section>

        <section class="panel stack">
          <div>
            <h2 class="panel-title" style="margin:0 0 2px">{t.quote}</h2>
            <span class="hint">{t.quoteHint}</span>
          </div>
          <Field label={t.clientName} htmlFor="p3-client">
            <input id="p3-client" class="input" value={client} onInput={(e) => setClient(e.currentTarget.value)} />
          </Field>
          <Field label={t.notes} htmlFor="p3-notes">
            <textarea id="p3-notes" class="textarea" rows={3} value={notes} onInput={(e) => setNotes(e.currentTarget.value)} />
          </Field>
          <details class="p3-issuer">
            <summary>{t.issuer}</summary>
            <div class="stack" style="margin-top:12px">
              <LogoPicker value={issuer.logo} onChange={(v) => setI('logo', v)} uploadLabel={t.uploadLogo} removeLabel={t.removeLogo} ariaLabel={t.logo} />
              <div class="form-grid">
                <Field label={t.business} htmlFor="p3-i-name"><input id="p3-i-name" class="input" value={issuer.name} onInput={(e) => setI('name', e.currentTarget.value)} /></Field>
                <Field label={t.taxId} htmlFor="p3-i-cuit"><input id="p3-i-cuit" class="input" value={issuer.taxId} onInput={(e) => setI('taxId', e.currentTarget.value)} /></Field>
              </div>
              <Field label={t.address} htmlFor="p3-i-addr"><input id="p3-i-addr" class="input" value={issuer.address} onInput={(e) => setI('address', e.currentTarget.value)} /></Field>
              <div class="form-grid">
                <Field label={t.phone} htmlFor="p3-i-phone"><input id="p3-i-phone" class="input" type="tel" value={issuer.phone} onInput={(e) => setI('phone', e.currentTarget.value)} /></Field>
                <Field label={t.email} htmlFor="p3-i-mail"><input id="p3-i-mail" class="input" type="email" value={issuer.email} onInput={(e) => setI('email', e.currentTarget.value)} /></Field>
              </div>
            </div>
          </details>
          <div>
            <button type="button" class="btn btn-primary" disabled={!hasData || busy} onClick={buildQuote}>
              <FileDown aria-hidden="true" />
              {t.download}
            </button>
          </div>
        </section>
      </div>

      <style>{`
        .p3-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .p3-part { display: grid; gap: 12px; padding: 14px; border: 1px solid var(--border); border-radius: 12px; }
        .p3-name { display: grid; grid-template-columns: minmax(0, 1fr) 40px; gap: 8px; align-items: center; }
        .p3-grid { display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
        @media (max-width: 520px) { .p3-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .p3-total { display: grid; gap: 2px; padding: 14px; border-radius: 12px; background: var(--surface-2); }
        .p3-total strong { font-size: 1.8rem; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
        .p3-bar { display: grid; grid-template-columns: 110px minmax(0, 1fr) auto; gap: 10px; align-items: center; }
        .p3-bar .amount { font-variant-numeric: tabular-nums; white-space: nowrap; }
        .p3-track { height: 8px; border-radius: 99px; background: var(--surface-2); overflow: hidden; }
        .p3-fill { height: 100%; border-radius: 99px; background: var(--primary, #3b82f6); }
        .p3-issuer summary { cursor: pointer; font-weight: 600; }
        @media (max-width: 520px) { .p3-bar { grid-template-columns: 90px minmax(0, 1fr) auto; } }
      `}</style>
    </div>
  );
}
