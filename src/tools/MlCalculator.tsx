import { useMemo } from 'preact/hooks';
import { Info, Plus, RefreshCw, Trash2 } from 'lucide-preact';
import { Field, NumInput, Segmented, fmtMoney, fmtPct, parseNum, useStoredState, type Lang } from './shared/ui';

type Listing = 'clasica' | 'premium';
interface Tier {
  upTo: string;
  fee: string;
}

/**
 * Valores de referencia para Argentina (agosto 2026). ML los cambia varias veces por año
 * y la comisión depende de la categoría, por eso todo es editable y queda guardado en el navegador.
 */
const DEFAULTS = {
  price: '25000',
  listing: 'clasica' as Listing,
  pctClasica: '13,5',
  pctPremium: '17',
  pctCuotas: '0',
  cost: '9000',
  shipping: '0',
  other: '0',
  ads: '0',
  taxPct: '0',
  targetMargin: '20',
  fixedEnabled: true,
  ivaOnFees: false,
  tiers: [
    { upTo: '15000', fee: '1115' },
    { upTo: '25000', fee: '2300' },
    { upTo: '33000', fee: '2810' },
  ] as Tier[],
};

const T = {
  es: {
    sale: 'Venta',
    price: 'Precio de venta',
    listing: 'Tipo de publicación',
    clasica: 'Clásica',
    premium: 'Premium',
    commission: 'Comisión por vender',
    commissionHint: 'Depende de la categoría: suele ir de ~12 % a ~15 % en Clásica y de ~15 % a ~17 % en Premium.',
    cuotas: 'Cargo por cuotas sin interés',
    cuotasHint: 'Si ofrecés cuotas sin interés, poné el % que te muestra ML para esa cantidad de cuotas.',
    costs: 'Tus costos',
    cost: 'Costo del producto',
    shipping: 'Envío a tu cargo',
    shippingHint: 'Si ofrecés envío gratis, lo que te cobra ML por enviarlo.',
    other: 'Empaque y otros',
    ads: 'Publicidad por venta',
    tax: 'Impuestos sobre la venta',
    taxHint: 'Ingresos brutos, retenciones y percepciones (ej.: 3 % de IIBB).',
    settings: 'Tarifas de Mercado Libre',
    settingsNote:
      'Valores de referencia de agosto de 2026. Mercado Libre los actualiza varias veces al año: verificalos en el simulador de costos de tu cuenta. Lo que cambies queda guardado en este navegador.',
    fixed: 'Cobrar cargo fijo por unidad',
    fixedHint: 'Se cobra en productos baratos, según el tramo de precio. Supermercado no lo paga.',
    upTo: 'Precio hasta',
    fee: 'Cargo fijo',
    addTier: 'Agregar tramo',
    ivaOnFees: 'Sumar IVA (21 %) a los cargos de ML',
    ivaOnFeesHint: 'Activalo si ML te factura el IVA aparte y no lo podés usar como crédito fiscal (por ejemplo, si sos monotributista).',
    reset: 'Restablecer valores',
    profit: 'Ganancia por venta',
    loss: 'Pérdida por venta',
    margin: 'Margen',
    markup: 'Sobre el costo',
    receive: 'Recibís de Mercado Libre',
    mlCharges: 'Cargos de ML',
    breakdown: 'Detalle',
    rCommission: 'Comisión',
    rCuotas: 'Cuotas sin interés',
    rFixed: 'Cargo fijo',
    rIva: 'IVA sobre cargos',
    rShipping: 'Envío',
    rTax: 'Impuestos',
    rCost: 'Costo del producto',
    rOther: 'Empaque y otros',
    rAds: 'Publicidad',
    rProfit: 'Ganancia',
    compare: 'Clásica vs. Premium',
    suggest: 'Precio sugerido',
    targetMargin: 'Margen buscado',
    suggestText: (m: string) => `Para ganar un ${m} sobre el precio, publicá a`,
    breakEven: 'Precio de equilibrio (ganancia cero)',
    impossible: 'Con estos costos no se llega a ese margen: los porcentajes suman 100 % o más.',
    usePrice: 'Usar este precio',
    enterPrice: 'Ingresá un precio de venta para ver el resultado.',
    composition: 'A dónde va cada peso',
  },
  en: {
    sale: 'Sale',
    price: 'Sale price',
    listing: 'Listing type',
    clasica: 'Classic',
    premium: 'Premium',
    commission: 'Selling commission',
    commissionHint: 'Depends on the category: usually ~12% to ~15% for Classic and ~15% to ~17% for Premium.',
    cuotas: 'Interest-free installments fee',
    cuotasHint: 'If you offer interest-free installments, enter the % Mercado Libre shows for that number of installments.',
    costs: 'Your costs',
    cost: 'Product cost',
    shipping: 'Shipping you pay',
    shippingHint: 'If you offer free shipping, what Mercado Libre charges you to ship it.',
    other: 'Packaging & other',
    ads: 'Ads per sale',
    tax: 'Taxes on the sale',
    taxHint: 'Gross income tax, withholdings and perceptions (e.g. 3%).',
    settings: 'Mercado Libre fees',
    settingsNote:
      'Reference values from August 2026. Mercado Libre updates them several times a year: check them in your account’s fee simulator. Your changes are saved in this browser.',
    fixed: 'Charge fixed fee per unit',
    fixedHint: 'Applies to low-priced items, by price bracket. The supermarket category is exempt.',
    upTo: 'Price up to',
    fee: 'Fixed fee',
    addTier: 'Add bracket',
    ivaOnFees: 'Add VAT (21%) to Mercado Libre fees',
    ivaOnFeesHint: 'Turn it on if VAT is billed separately and you cannot claim it as a tax credit.',
    reset: 'Reset values',
    profit: 'Profit per sale',
    loss: 'Loss per sale',
    margin: 'Margin',
    markup: 'Markup on cost',
    receive: 'You receive from Mercado Libre',
    mlCharges: 'Mercado Libre fees',
    breakdown: 'Breakdown',
    rCommission: 'Commission',
    rCuotas: 'Installments',
    rFixed: 'Fixed fee',
    rIva: 'VAT on fees',
    rShipping: 'Shipping',
    rTax: 'Taxes',
    rCost: 'Product cost',
    rOther: 'Packaging & other',
    rAds: 'Ads',
    rProfit: 'Profit',
    compare: 'Classic vs. Premium',
    suggest: 'Suggested price',
    targetMargin: 'Target margin',
    suggestText: (m: string) => `To earn ${m} of the price, list it at`,
    breakEven: 'Break-even price (zero profit)',
    impossible: 'That margin cannot be reached with these costs: the percentages add up to 100% or more.',
    usePrice: 'Use this price',
    enterPrice: 'Enter a sale price to see the result.',
    composition: 'Where each peso goes',
  },
};

interface Inputs {
  commissionPct: number;
  cuotasPct: number;
  taxPct: number;
  ivaMul: number;
  fixedEnabled: boolean;
  tiers: { upTo: number; fee: number }[];
  shipping: number;
  cost: number;
  other: number;
  ads: number;
}

const fixedFeeFor = (price: number, inp: Inputs) => {
  if (!inp.fixedEnabled) return 0;
  return inp.tiers.find((t) => price <= t.upTo)?.fee ?? 0;
};

function compute(price: number, inp: Inputs) {
  const commission = (price * inp.commissionPct) / 100;
  const cuotas = (price * inp.cuotasPct) / 100;
  const fixed = fixedFeeFor(price, inp);
  const iva = (commission + cuotas + fixed) * (inp.ivaMul - 1);
  const mlTotal = commission + cuotas + fixed + iva;
  const receive = price - mlTotal - inp.shipping;
  const tax = (price * inp.taxPct) / 100;
  const profit = receive - tax - inp.cost - inp.other - inp.ads;
  return { commission, cuotas, fixed, iva, mlTotal, receive, tax, profit, margin: price > 0 ? (profit / price) * 100 : NaN };
}

/**
 * Precio mínimo que deja el margen buscado. Como el cargo fijo cambia por tramo,
 * se resuelve la ecuación en cada tramo y se queda con la solución válida más baja.
 */
function solvePrice(marginPct: number, inp: Inputs): number | null {
  const d = 1 - ((inp.commissionPct + inp.cuotasPct) / 100) * inp.ivaMul - inp.taxPct / 100 - marginPct / 100;
  if (d <= 0) return null;
  const base = inp.shipping + inp.cost + inp.other + inp.ads;
  const tiers = inp.fixedEnabled ? inp.tiers : [];
  const ranges = [
    ...tiers.map((t, i) => ({ lo: i === 0 ? 0 : tiers[i - 1].upTo, hi: t.upTo, fee: t.fee })),
    { lo: tiers.length ? tiers[tiers.length - 1].upTo : 0, hi: Infinity, fee: 0 },
  ];
  const candidates: number[] = [];
  for (const r of ranges) {
    const p = (base + r.fee * inp.ivaMul) / d;
    if (p > r.hi) continue;
    candidates.push(p > r.lo ? p : r.lo + 0.01);
  }
  return candidates.length ? Math.ceil(Math.min(...candidates)) : null;
}

export default function MlCalculator({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [s, setS] = useStoredState('ml-calc', DEFAULTS);
  const set = <K extends keyof typeof DEFAULTS>(k: K, v: (typeof DEFAULTS)[K]) => setS((prev) => ({ ...prev, [k]: v }));
  const n = (v: string) => {
    const x = parseNum(v, lang);
    return Number.isFinite(x) ? x : 0;
  };

  const tiers = useMemo(
    () =>
      s.tiers
        .map((tr) => ({ upTo: parseNum(tr.upTo, lang), fee: parseNum(tr.fee, lang) }))
        .filter((tr) => Number.isFinite(tr.upTo) && Number.isFinite(tr.fee))
        .sort((a, b) => a.upTo - b.upTo),
    [s.tiers, lang],
  );

  const inputsFor = (listing: Listing): Inputs => ({
    commissionPct: n(listing === 'premium' ? s.pctPremium : s.pctClasica),
    cuotasPct: listing === 'premium' ? n(s.pctCuotas) : 0,
    taxPct: n(s.taxPct),
    ivaMul: s.ivaOnFees ? 1.21 : 1,
    fixedEnabled: s.fixedEnabled,
    tiers,
    shipping: n(s.shipping),
    cost: n(s.cost),
    other: n(s.other),
    ads: n(s.ads),
  });

  const price = parseNum(s.price, lang);
  const hasPrice = Number.isFinite(price) && price > 0;
  const inputs = inputsFor(s.listing);
  const r = hasPrice ? compute(price, inputs) : null;
  const other = s.listing === 'clasica' ? 'premium' : 'clasica';
  const rOther = hasPrice ? compute(price, inputsFor(other)) : null;
  const target = n(s.targetMargin);
  const suggested = solvePrice(target, inputs);
  const breakEven = solvePrice(0, inputs);

  const segments = r
    ? [
        { label: t.mlCharges, value: r.mlTotal, color: 'var(--c-ecommerce)' },
        { label: t.rShipping, value: inputs.shipping, color: 'var(--c-calculators)' },
        { label: t.rTax, value: r.tax, color: 'var(--c-generators)' },
        { label: t.rCost, value: inputs.cost + inputs.other + inputs.ads, color: 'var(--text-3)' },
        { label: t.rProfit, value: Math.max(r.profit, 0), color: 'var(--success)' },
      ].filter((x) => x.value > 0)
    : [];
  const segTotal = segments.reduce((a, b) => a + b.value, 0);

  const updateTier = (i: number, key: keyof Tier, v: string) =>
    set('tiers', s.tiers.map((tr, j) => (j === i ? { ...tr, [key]: v } : tr)));

  return (
    <div class="tool-layout wide-left">
      <div class="stack">
        <section class="panel">
          <h2 class="panel-title">{t.sale}</h2>
          <div class="stack">
            <div class="form-grid">
              <Field label={t.price} htmlFor="ml-price">
                <NumInput id="ml-price" prefix="$" value={s.price} onValue={(v) => set('price', v)} invalid={!!s.price && !hasPrice} />
              </Field>
              <div class="field">
                <span class="label">{t.listing}</span>
                <Segmented
                  value={s.listing}
                  onChange={(v) => set('listing', v)}
                  options={[
                    { value: 'clasica', label: t.clasica },
                    { value: 'premium', label: t.premium },
                  ]}
                />
              </div>
            </div>
            <div class="form-grid">
              <Field label={`${t.commission} (${s.listing === 'premium' ? t.premium : t.clasica})`} htmlFor="ml-pct" hint={t.commissionHint}>
                <NumInput
                  id="ml-pct"
                  suffix="%"
                  value={s.listing === 'premium' ? s.pctPremium : s.pctClasica}
                  onValue={(v) => set(s.listing === 'premium' ? 'pctPremium' : 'pctClasica', v)}
                />
              </Field>
              {s.listing === 'premium' && (
                <Field label={t.cuotas} htmlFor="ml-cuotas" hint={t.cuotasHint}>
                  <NumInput id="ml-cuotas" suffix="%" value={s.pctCuotas} onValue={(v) => set('pctCuotas', v)} />
                </Field>
              )}
            </div>
          </div>
        </section>

        <section class="panel">
          <h2 class="panel-title">{t.costs}</h2>
          <div class="form-grid">
            <Field label={t.cost} htmlFor="ml-cost">
              <NumInput id="ml-cost" prefix="$" value={s.cost} onValue={(v) => set('cost', v)} />
            </Field>
            <Field label={t.shipping} htmlFor="ml-ship" hint={t.shippingHint}>
              <NumInput id="ml-ship" prefix="$" value={s.shipping} onValue={(v) => set('shipping', v)} />
            </Field>
            <Field label={t.other} htmlFor="ml-other">
              <NumInput id="ml-other" prefix="$" value={s.other} onValue={(v) => set('other', v)} />
            </Field>
            <Field label={t.ads} htmlFor="ml-ads">
              <NumInput id="ml-ads" prefix="$" value={s.ads} onValue={(v) => set('ads', v)} />
            </Field>
            <Field label={t.tax} htmlFor="ml-tax" hint={t.taxHint}>
              <NumInput id="ml-tax" suffix="%" value={s.taxPct} onValue={(v) => set('taxPct', v)} />
            </Field>
          </div>
        </section>

        <section class="panel">
          <details class="disclosure">
            <summary>{t.settings}</summary>
            <div class="stack">
              <div class="alert">
                <Info aria-hidden="true" />
                <span>{t.settingsNote}</span>
              </div>
              <div class="form-grid">
                <Field label={`${t.commission} · ${t.clasica}`} htmlFor="ml-pc">
                  <NumInput id="ml-pc" suffix="%" value={s.pctClasica} onValue={(v) => set('pctClasica', v)} />
                </Field>
                <Field label={`${t.commission} · ${t.premium}`} htmlFor="ml-pp">
                  <NumInput id="ml-pp" suffix="%" value={s.pctPremium} onValue={(v) => set('pctPremium', v)} />
                </Field>
              </div>

              <label class="check">
                <input type="checkbox" checked={s.fixedEnabled} onChange={(e) => set('fixedEnabled', e.currentTarget.checked)} />
                {t.fixed}
              </label>
              <span class="hint" style="margin-top:-8px">{t.fixedHint}</span>

              {s.fixedEnabled && (
                <div class="stack" style="gap:8px">
                  <div class="tier-head hint">
                    <span>{t.upTo}</span>
                    <span>{t.fee}</span>
                  </div>
                  {s.tiers.map((tr, i) => (
                    <div class="tier-row" key={i}>
                      <NumInput prefix="$" value={tr.upTo} onValue={(v) => updateTier(i, 'upTo', v)} aria-label={t.upTo} placeholder={t.upTo} />
                      <NumInput prefix="$" value={tr.fee} onValue={(v) => updateTier(i, 'fee', v)} aria-label={t.fee} placeholder={t.fee} />
                      <button type="button" class="btn btn-ghost btn-sm btn-icon btn-danger" aria-label={COMMON_REMOVE[lang]} onClick={() => set('tiers', s.tiers.filter((_, j) => j !== i))}>
                        <Trash2 aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  <div>
                    <button type="button" class="btn btn-sm" onClick={() => set('tiers', [...s.tiers, { upTo: '', fee: '' }])}>
                      <Plus aria-hidden="true" />
                      {t.addTier}
                    </button>
                  </div>
                </div>
              )}

              <label class="check">
                <input type="checkbox" checked={s.ivaOnFees} onChange={(e) => set('ivaOnFees', e.currentTarget.checked)} />
                {t.ivaOnFees}
              </label>
              <span class="hint" style="margin-top:-8px">{t.ivaOnFeesHint}</span>

              <div>
                <button type="button" class="btn btn-sm" onClick={() => setS({ ...DEFAULTS, price: s.price, cost: s.cost })}>
                  <RefreshCw aria-hidden="true" />
                  {t.reset}
                </button>
              </div>
            </div>
          </details>
        </section>
      </div>

      <div class="stack sticky">
        <section class="panel">
          {!r ? (
            <p class="muted">{t.enterPrice}</p>
          ) : (
            <div class="stack-lg">
              <div>
                <div class="stat-label">{r.profit >= 0 ? t.profit : t.loss}</div>
                <div class={`result-big ${r.profit >= 0 ? 'positive' : 'negative'}`}>{fmtMoney(r.profit, lang)}</div>
                <div class="btn-row" style="margin-top:10px">
                  <span class={`badge ${r.profit >= 0 ? 'badge-success' : 'badge-danger'}`}>
                    {t.margin}: {fmtPct(r.margin, lang)}
                  </span>
                  {inputs.cost > 0 && (
                    <span class="badge">
                      {t.markup}: {fmtPct((r.profit / inputs.cost) * 100, lang)}
                    </span>
                  )}
                </div>
              </div>

              <div class="stats">
                <div class="stat">
                  <div class="stat-label">{t.receive}</div>
                  <div class="stat-value">{fmtMoney(r.receive, lang)}</div>
                </div>
                <div class="stat">
                  <div class="stat-label">{t.mlCharges}</div>
                  <div class="stat-value">{fmtMoney(r.mlTotal, lang)}</div>
                  <div class="hint">{fmtPct((r.mlTotal / price) * 100, lang)}</div>
                </div>
              </div>

              {segTotal > 0 && (
                <div>
                  <div class="label" style="margin-bottom:8px">{t.composition}</div>
                  <div class="comp-bar" role="img" aria-label={t.composition}>
                    {segments.map((sg) => (
                      <span key={sg.label} style={{ width: `${(sg.value / segTotal) * 100}%`, background: sg.color }} title={`${sg.label}: ${fmtMoney(sg.value, lang)}`} />
                    ))}
                  </div>
                  <div class="comp-legend">
                    {segments.map((sg) => (
                      <span key={sg.label}>
                        <i class="dot" style={{ background: sg.color }} />
                        {sg.label} <b>{fmtPct((sg.value / segTotal) * 100, lang, 0)}</b>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div class="label" style="margin-bottom:4px">{t.breakdown}</div>
                <div class="breakdown">
                  <Row label={t.price} value={price} lang={lang} />
                  <Row label={`${t.rCommission} (${fmtPct(inputs.commissionPct, lang)})`} value={-r.commission} lang={lang} />
                  {r.cuotas > 0 && <Row label={`${t.rCuotas} (${fmtPct(inputs.cuotasPct, lang)})`} value={-r.cuotas} lang={lang} />}
                  {r.fixed > 0 && <Row label={t.rFixed} value={-r.fixed} lang={lang} />}
                  {r.iva > 0 && <Row label={t.rIva} value={-r.iva} lang={lang} />}
                  {inputs.shipping > 0 && <Row label={t.rShipping} value={-inputs.shipping} lang={lang} />}
                  <Row label={t.receive} value={r.receive} lang={lang} total />
                  {r.tax > 0 && <Row label={`${t.rTax} (${fmtPct(inputs.taxPct, lang)})`} value={-r.tax} lang={lang} />}
                  {inputs.cost > 0 && <Row label={t.rCost} value={-inputs.cost} lang={lang} />}
                  {inputs.other > 0 && <Row label={t.rOther} value={-inputs.other} lang={lang} />}
                  {inputs.ads > 0 && <Row label={t.rAds} value={-inputs.ads} lang={lang} />}
                  <Row label={t.rProfit} value={r.profit} lang={lang} total highlight />
                </div>
              </div>

              {rOther && (
                <div class="subpanel">
                  <div class="label" style="margin-bottom:8px">{t.compare}</div>
                  <div class="compare">
                    {(['clasica', 'premium'] as Listing[]).map((l) => {
                      const res = l === s.listing ? r : rOther;
                      return (
                        <button type="button" key={l} class={`compare-item ${l === s.listing ? 'is-current' : ''}`} onClick={() => set('listing', l)}>
                          <span class="hint">{l === 'premium' ? t.premium : t.clasica}</span>
                          <b class={res.profit >= 0 ? 'positive' : 'negative'}>{fmtMoney(res.profit, lang)}</b>
                          <span class="hint">{fmtPct(res.margin, lang)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section class="panel">
          <h2 class="panel-title">{t.suggest}</h2>
          <div class="stack">
            <Field label={t.targetMargin} htmlFor="ml-target">
              <NumInput id="ml-target" suffix="%" value={s.targetMargin} onValue={(v) => set('targetMargin', v)} />
            </Field>
            {suggested === null ? (
              <div class="alert alert-warning">
                <Info aria-hidden="true" />
                <span>{t.impossible}</span>
              </div>
            ) : (
              <div class="suggest">
                <span class="muted small">{t.suggestText(fmtPct(target, lang, 1))}</span>
                <div class="suggest-row">
                  <span class="result-big">{fmtMoney(suggested, lang)}</span>
                  <button type="button" class="btn btn-sm" onClick={() => set('price', String(suggested))}>
                    {t.usePrice}
                  </button>
                </div>
                {breakEven !== null && (
                  <span class="hint">
                    {t.breakEven}: <b>{fmtMoney(breakEven, lang)}</b>
                  </span>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <style>{`
        .tier-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; align-items: center; }
        .tier-head { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding-right: 40px; }
        .comp-bar { display: flex; height: 14px; border-radius: 7px; overflow: hidden; gap: 2px; background: var(--surface-2); }
        .comp-bar span { display: block; min-width: 3px; }
        .comp-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 10px; font-size: 12.5px; color: var(--text-2); }
        .comp-legend span { display: inline-flex; align-items: center; gap: 6px; }
        .compare { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .compare-item {
          display: flex; flex-direction: column; align-items: flex-start; gap: 2px; text-align: left;
          padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); cursor: pointer;
        }
        .compare-item b { font-size: 17px; font-variant-numeric: tabular-nums; }
        .compare-item.is-current { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
        .suggest { display: flex; flex-direction: column; gap: 6px; }
        .suggest-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
      `}</style>
    </div>
  );
}

const COMMON_REMOVE = { es: 'Quitar tramo', en: 'Remove bracket' };

function Row({ label, value, lang, total, highlight }: { label: string; value: number; lang: Lang; total?: boolean; highlight?: boolean }) {
  return (
    <div class={`breakdown-row ${total ? 'total' : ''}`}>
      <span class={total ? '' : 'muted'}>{label}</span>
      <span class={`amount ${highlight ? (value >= 0 ? 'positive' : 'negative') : ''}`}>
        {value < 0 ? `− ${fmtMoney(-value, lang)}` : fmtMoney(value, lang)}
      </span>
    </div>
  );
}
