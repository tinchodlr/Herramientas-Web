import { useMemo, useState } from 'preact/hooks';
import { FileDown, Package, Pencil, Plus, Printer, Receipt, Save, Trash2, Truck, Wand2 } from 'lucide-preact';
import { Field, NumInput, Segmented, downloadBlob, fmtNum, parseNum, useStoredState, type Lang } from './shared/ui';
import { LogoPicker } from './shared/LogoPicker';
import { LibraryBar, useLibrary } from './shared/Library';
import { openLogin } from '../lib/cloud';
import { fetchDollar, type Dollar, type Quote } from '../lib/dolar';
import { EMPTY_HANDOFF_CLIENT, addressLine, sendHandoff, type HandoffClient } from '../lib/handoff';
import { TOOLS } from '../data/tools';
import { toolPath } from '../i18n/ui';
import { CURRENCIES, EMPTY_MODEL, calculate, symbolOf, type ModelBuy, type Part, type Settings, type Supply } from '../lib/print3d';
import { DOC_WORDS, EMPTY_ISSUER } from './Documents';
import { fmtDate, type DocData, type Issuer } from './documents/pdf';

const T = {
  es: {
    parts: 'Piezas a imprimir',
    savedJobs: 'Piezas guardadas',
    savedProfiles: 'Perfiles de impresión (costos y parámetros)',
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
    packaging: 'Embalaje y otros costos fijos (valor anterior)',
    supTitle: 'Insumos del trabajo',
    supHint: 'Embalaje, protección y accesorios. Se cobran una sola vez por trabajo y llevan la misma ganancia que el resto.',
    supName: 'Insumo',
    supPrice: 'Precio',
    supCur: 'Moneda',
    addSupply: 'Agregar insumo',
    removeSupply: 'Quitar insumo',
    defaultSupplies: ['Embalaje', 'Protección del embalaje', 'Accesorios adicionales'],
    modelBuy: 'Tuve que comprar el modelo 3D',
    modelName: 'Modelo (nombre o link)',
    modelPrice: 'Precio del modelo',
    modelHint: 'Si lo pagaste en otra moneda, elegila y cargá la cotización: se pasa a pesos con el cambio que pongas.',
    converted: (amount: string) => `≈ ${amount} al cambio cargado`,
    rateMissing: 'Cargá la cotización para convertir los importes en otra moneda.',
    rateDate: 'Cotización del día',
    getRate: 'Traer la cotización de hoy',
    gettingRate: 'Consultando…',
    useRate: 'Usar el valor de venta:',
    rateOfficial: 'Dólar oficial',
    rateBlue: 'Dólar blue',
    rateSource: (when: string) => `Actualizada ${when} · Fuente: DolarAPI.com (se consulta solo al tocar el botón).`,
    rateFail: 'No se pudo traer la cotización. Cargala a mano.',
    rateUsed: (a: string, rate: string, b: string, date: string) => `Cotización: 1 ${a} = ${b} ${rate}${date ? ` al ${date}` : ''}`,
    equivalent: (amount: string, a: string, rate: string, b: string, date: string) => `Equivalente: ${a} ${amount} (cotización 1 ${a} = ${b} ${rate}${date ? ` al ${date}` : ''}).`,
    suppliesLine: 'Insumos y embalaje',
    modelLine: 'Modelo 3D',
    markup: 'Ganancia sobre el costo',
    markupMultHint: 'Ej.: 2 = el precio es el doble del costo.',
    quoteNumber: 'Número de presupuesto',
    validity: 'Validez (días)',
    validityHint: 'Se imprime como “Válido hasta” en el PDF. Dejalo vacío para no mostrarlo.',
    quoteNumberHint: 'Se guarda y sube solo con cada presupuesto.',
    quoteTitle: 'Título del presupuesto',
    quoteTitlePh: 'Ej.: Soportes para el local',
    clientTax: 'CUIT / DNI',
    clientPhone: 'Teléfono',
    clientAddr: 'Dirección del cliente (también para remito y etiqueta)',
    street: 'Calle y altura',
    floor: 'Piso / depto',
    barrio: 'Barrio',
    city: 'Localidad',
    cp: 'CP',
    saveQuote: 'Guardar presupuesto',
    savedOk: 'Guardado',
    editing: (n: string) => `Editando el presupuesto ${n}. Al guardar se actualiza.`,
    newQuote: 'Hacer uno nuevo',
    historyTitle: 'Presupuestos guardados',
    historyHint: 'Se guardan al descargar o con “Guardar presupuesto”. Desde acá podés volver a imprimirlos y crear el remito, el recibo o la etiqueta de envío.',
    historyEmpty: 'Todavía no hay presupuestos guardados.',
    load: 'Editar',
    reprint: 'Imprimir PDF',
    toDelivery: 'Remito',
    toReceipt: 'Recibo',
    toLabel: 'Etiqueta de envío',
    del: 'Eliminar',
    confirmDel: (n: string) => `¿Eliminar el presupuesto ${n}?`,
    local: 'Se guardan solo en este navegador.',
    login: 'Iniciá sesión',
    localTail: 'para tenerlos en todos tus dispositivos.',
    cloud: 'Sincronizados con tu cuenta.',
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
    setup: 'Preparación del trabajo',
    breakdown: 'En qué se va el costo',
    labels: { material: 'Material', energy: 'Electricidad', machine: 'Máquina', risk: 'Fallas', labor: 'Mano de obra', extra: 'Extras por pieza', supplies: 'Insumos', model: 'Modelo 3D' } as Record<string, string>,
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
    savedJobs: 'Saved parts',
    savedProfiles: 'Printing profiles (costs and parameters)',
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
    packaging: 'Packaging and other fixed costs (previous value)',
    supTitle: 'Job supplies',
    supHint: 'Packaging, protection and accessories. Charged once per job, with the same profit as everything else.',
    supName: 'Supply',
    supPrice: 'Price',
    supCur: 'Currency',
    addSupply: 'Add supply',
    removeSupply: 'Remove supply',
    defaultSupplies: ['Packaging', 'Packaging protection', 'Additional accessories'],
    modelBuy: 'I had to buy the 3D model',
    modelName: 'Model (name or link)',
    modelPrice: 'Model price',
    modelHint: 'If you paid in another currency, pick it and enter the exchange rate: it is converted with the rate you set.',
    converted: (amount: string) => `≈ ${amount} at the entered rate`,
    rateMissing: 'Enter the exchange rate to convert amounts in another currency.',
    rateDate: 'Rate of the day',
    getRate: 'Fetch today’s rate',
    gettingRate: 'Checking…',
    useRate: 'Use the selling price:',
    rateOfficial: 'Official dollar',
    rateBlue: 'Blue dollar',
    rateSource: (when: string) => `Updated ${when} · Source: DolarAPI.com (queried only when you press the button).`,
    rateFail: 'Could not fetch the rate. Enter it by hand.',
    rateUsed: (a: string, rate: string, b: string, date: string) => `Exchange rate: 1 ${a} = ${b} ${rate}${date ? ` on ${date}` : ''}`,
    equivalent: (amount: string, a: string, rate: string, b: string, date: string) => `Equivalent: ${a} ${amount} (rate 1 ${a} = ${b} ${rate}${date ? ` on ${date}` : ''}).`,
    suppliesLine: 'Supplies and packaging',
    modelLine: '3D model',
    markup: 'Profit on cost',
    markupMultHint: 'E.g. 2 = the price is double the cost.',
    quoteNumber: 'Quote number',
    validity: 'Validity (days)',
    validityHint: 'Printed as “Valid until” on the PDF. Leave empty to hide it.',
    quoteNumberHint: 'Saved and increased automatically with each quote.',
    quoteTitle: 'Quote title',
    quoteTitlePh: 'E.g. Display stands for the shop',
    clientTax: 'Tax ID',
    clientPhone: 'Phone',
    clientAddr: 'Customer address (also used for delivery note and label)',
    street: 'Street and number',
    floor: 'Floor / apt',
    barrio: 'Neighborhood',
    city: 'City',
    cp: 'Postal code',
    saveQuote: 'Save quote',
    savedOk: 'Saved',
    editing: (n: string) => `Editing quote ${n}. Saving updates it.`,
    newQuote: 'Start a new one',
    historyTitle: 'Saved quotes',
    historyHint: 'They are saved when you download or with “Save quote”. From here you can print them again and create the delivery note, receipt or shipping label.',
    historyEmpty: 'No saved quotes yet.',
    load: 'Edit',
    reprint: 'Print PDF',
    toDelivery: 'Delivery note',
    toReceipt: 'Receipt',
    toLabel: 'Shipping label',
    del: 'Delete',
    confirmDel: (n: string) => `Delete quote ${n}?`,
    local: 'Saved only in this browser.',
    login: 'Sign in',
    localTail: 'to keep them on all your devices.',
    cloud: 'Synced with your account.',
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
    setup: 'Job setup',
    breakdown: 'Where the cost goes',
    labels: { material: 'Material', energy: 'Electricity', machine: 'Machine', risk: 'Failures', labor: 'Labor', extra: 'Extras per part', supplies: 'Supplies', model: '3D model' } as Record<string, string>,
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
  labor: '', setupMin: '', packaging: '', markup: '100', markupMode: 'pct', round: '0', vatOn: false, vatRate: '21', secondOn: false, secondCur: 'USD', rate: '', rateDate: '',
};
const EXAMPLE: Settings = { ...DEFAULTS, filamentKg: '25000', kwh: '120', printerCost: '600000', labor: '3000', setupMin: '15', round: '100' };

let nextId = 1;
const newPart = (over: Partial<Part> = {}): Part => ({ id: nextId++, name: '', grams: '', h: '', min: '', qty: '1', post: '', extra: '', ...over });

const newSupplyId = () => Math.floor(Math.random() * 1e9) + 1;
const supplyList = (names: string[], prices: string[] = []): Supply[] => names.map((name, i) => ({ id: newSupplyId(), name, price: prices[i] ?? '', cur: 'main' }));

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const bumpNumber = (n: string) => n.replace(/(\d+)(\D*)$/, (_, d: string, rest: string) => String(Number(d) + 1).padStart(d.length, '0') + rest);

interface QuoteRecord {
  number: string;
  date: string; // yyyy-mm-dd, de creación
  created: number;
  title: string;
  client: HandoffClient;
  partNames: string[];
  total: number;
  totalText: string;
  currency: string;
  doc: DocData;
  job: { parts: Part[]; notes: string; s: Settings; supplies?: Supply[]; model?: ModelBuy; validity?: string };
  /** Total en la segunda moneda con la cotización de ese día. */
  alt?: { cur: string; rate: number; date: string; total: number };
}

export default function Print3dCalculator({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [s, setS] = useStoredState<Settings>('p3d-settings', DEFAULTS);
  const [parts, setParts] = useState<Part[]>(() => [newPart()]);
  const [client, setClient] = useState<HandoffClient>(EMPTY_HANDOFF_CLIENT);
  const [quoteTitle, setQuoteTitle] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  const history = useLibrary<QuoteRecord>('p3d-quotes');
  const [supplies, setSupplies] = useStoredState<{ items: Supply[] }>('p3d-supplies', { items: supplyList(t.defaultSupplies) });
  const [model, setModel] = useState<ModelBuy>(EMPTY_MODEL);
  const [validity, setValidity] = useStoredState('p3d-validity', '15');
  const [dollar, setDollar] = useState<Dollar | null>(null);
  const [dollarState, setDollarState] = useState<'idle' | 'loading' | 'error'>('idle');
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
  const r = useMemo(() => calculate(s, parts, lang, supplies.items, model), [s, parts, lang, supplies, model]);
  const rate = parseNum(s.rate, lang);
  const hasRate = Number.isFinite(rate) && rate > 0;
  const mainCode = s.currency === 'custom' ? sym : s.currency;
  const anyAlt = supplies.items.some((x) => x.cur === 'alt') || (model.on && model.cur === 'alt');
  const rateDateText = s.rateDate ? fmtDate(s.rateDate, lang) : '';
  const setRate = (v: string) => setS((o) => ({ ...o, rate: v, rateDate: o.rateDate || today() }));
  const setSupply = (id: number, patch: Partial<Supply>) => {
    setSupplies((o) => ({ items: o.items.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    if (patch.cur === 'alt') set('secondOn', true);
  };
  const toMain = (price: string, cur: 'main' | 'alt') => {
    const v = parseNum(price, lang);
    return Number.isFinite(v) && v > 0 ? v * (cur === 'alt' ? (hasRate ? rate : 0) : 1) : 0;
  };

  const loadDollar = async () => {
    setDollarState('loading');
    try {
      setDollar(await fetchDollar());
      setDollarState('idle');
    } catch {
      setDollarState('error');
    }
  };
  const takeRate = (q: Quote) =>
    setS((o) => ({ ...o, rate: String(q.sell).replace('.', lang === 'es' ? ',' : '.'), rateDate: q.updated.toLocaleDateString('sv') }));
  const canFetchRate = s.currency === 'ARS' && s.secondCur === 'USD';

  /** Campos de la cotización (manual): se muestran donde haga falta, nunca dos veces. */
  const rateFields = (
    <div class="form-grid">
      <Field label={t.rate} htmlFor="p3-rate" hint={t.rateHint(s.secondCur, mainCode)}>
        <NumInput id="p3-rate" value={s.rate} onValue={setRate} prefix={sym} />
      </Field>
      <Field label={t.rateDate} htmlFor="p3-rate-date">
        <input id="p3-rate-date" class="input" type="date" value={s.rateDate} onInput={(e) => set('rateDate', e.currentTarget.value)} />
      </Field>
      {canFetchRate && (
        <div class="stack p3-fetch" style="grid-column:1 / -1;gap:8px">
          {!dollar ? (
            <div>
              <button type="button" class="btn btn-sm" disabled={dollarState === 'loading'} onClick={loadDollar}>
                {dollarState === 'loading' ? t.gettingRate : t.getRate}
              </button>
            </div>
          ) : (
            <>
              <span class="label">{t.useRate}</span>
              <div class="btn-row">
                <button type="button" class="btn btn-sm" onClick={() => takeRate(dollar.oficial)}>
                  {t.rateOfficial} · $ {fmtNum(dollar.oficial.sell, lang, 2)}
                </button>
                <button type="button" class="btn btn-sm" onClick={() => takeRate(dollar.blue)}>
                  {t.rateBlue} · $ {fmtNum(dollar.blue.sell, lang, 2)}
                </button>
                <button type="button" class="btn btn-sm btn-ghost" disabled={dollarState === 'loading'} onClick={loadDollar}>
                  {dollarState === 'loading' ? t.gettingRate : '↻'}
                </button>
              </div>
              <span class="hint">{t.rateSource(`${dollar.blue.updated.toLocaleDateString(lang === 'es' ? 'es-AR' : 'en-US')} ${dollar.blue.updated.toLocaleTimeString(lang === 'es' ? 'es-AR' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`)}</span>
            </>
          )}
          {dollarState === 'error' && <div class="alert alert-warning">{t.rateFail}</div>}
        </div>
      )}
    </div>
  );
  const hasData = r.priceNet > 0;
  const maxBreak = Math.max(...Object.values(r.breakdown), 0.0001);

  const setC = (k: keyof HandoffClient, v: string) => setClient((c) => ({ ...c, [k]: v }));

  const buildDoc = (quoteNumber: string, date: string): DocData => {
    const list = r.rows.map((row, i) => ({ id: i, desc: row.part.name.trim() || t.defaultPart(i + 1), qty: String(row.qty), price: fmtNum(row.price, lang, 2, 2) }));
    if (r.setupPrice > 0) list.push({ id: 999, desc: t.setup, qty: '1', price: fmtNum(r.setupPrice, lang, 2, 2) });
    if (r.suppliesPrice > 0) list.push({ id: 998, desc: t.suppliesLine, qty: '1', price: fmtNum(r.suppliesPrice, lang, 2, 2) });
    if (r.modelPrice > 0) list.push({ id: 997, desc: model.name.trim() ? `${t.modelLine}: ${model.name.trim()}` : t.modelLine, qty: '1', price: fmtNum(r.modelPrice, lang, 2, 2) });
    const equivalent =
      s.secondOn && hasRate
        ? t.equivalent(fmtNum(r.total / rate, lang, 2, 2), secondSym, fmtNum(rate, lang, 2), sym, s.rateDate ? fmtDate(s.rateDate, lang) : '')
        : '';
    return {
      kind: 'quote', number: quoteNumber, date, clientName: client.name, clientTaxId: client.taxId, clientAddress: addressLine(client), items: list, discount: '',
      vat: s.vatOn ? s.vatRate : '0', vatIncluded: false, currency: sym, validity, notes: [notes.trim(), equivalent].filter(Boolean).join('\n'), showPrices: true,
      amount: '', concept: '', method: '', reference: '',
    };
  };

  /** Guarda (o actualiza) el presupuesto en la lista, con su número y fecha de creación. */
  const saveQuote = async (): Promise<QuoteRecord> => {
    const quoteNumber = editing ?? number;
    const prev = history.items.find((i) => i.name === quoteNumber)?.data;
    const date = prev?.date ?? today();
    const rec: QuoteRecord = {
      number: quoteNumber,
      date,
      created: prev?.created ?? Date.now(),
      title: quoteTitle.trim(),
      client,
      partNames: r.rows.map((row, i) => row.part.name.trim() || t.defaultPart(i + 1)),
      total: r.total,
      totalText: money(r.total),
      currency: sym,
      doc: buildDoc(quoteNumber, date),
      job: { parts, notes, s, supplies: supplies.items, model, validity },
      alt: s.secondOn && hasRate ? { cur: s.secondCur, rate, date: s.rateDate, total: r.total / rate } : undefined,
    };
    try {
      await history.save(quoteNumber, rec);
    } catch {}
    return rec;
  };

  const printQuote = async (doc: DocData) => {
    const { buildDocumentPdf } = await import('./documents/pdf');
    const bytes = await buildDocumentPdf(doc, issuer, lang, DOC_WORDS[lang]);
    downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `${DOC_WORDS[lang].title.quote}-${doc.number}.pdf`.replace(/[^\w.\-]+/g, '_'));
  };

  const buildQuote = async () => {
    setBusy(true);
    try {
      const rec = await saveQuote();
      await printQuote(rec.doc);
      if (editing === null) setNumber(bumpNumber(number));
    } finally {
      setBusy(false);
    }
  };

  const saveOnly = async () => {
    setBusy(true);
    try {
      await saveQuote();
      if (editing === null) setNumber(bumpNumber(number));
      setSavedNote(true);
      setTimeout(() => setSavedNote(false), 2400);
    } finally {
      setBusy(false);
    }
  };

  const loadQuote = (rec: QuoteRecord) => {
    setParts(rec.job.parts.length ? rec.job.parts.map((p) => newPart({ ...p })) : [newPart()]);
    setClient({ ...EMPTY_HANDOFF_CLIENT, ...rec.client });
    setQuoteTitle(rec.title);
    setNotes(rec.job.notes);
    setS({ ...DEFAULTS, ...rec.job.s });
    if (rec.job.supplies) setSupplies({ items: rec.job.supplies.map((x) => ({ ...x, id: newSupplyId() })) });
    setModel({ ...EMPTY_MODEL, ...rec.job.model });
    if (rec.job.validity !== undefined) setValidity(rec.job.validity);
    setEditing(rec.number);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goTo = (kind: 'delivery' | 'receipt' | 'label', rec: QuoteRecord) => {
    sendHandoff({
      to: kind,
      number: rec.number,
      client: { ...EMPTY_HANDOFF_CLIENT, ...rec.client },
      items: rec.doc.items.map(({ desc, qty, price }) => ({ desc, qty, price })),
      total: rec.total,
      currency: rec.currency,
    });
    const id = kind === 'label' ? 'shipping-label' : kind === 'delivery' ? 'delivery-note' : 'receipt';
    const tool = TOOLS.find((x) => x.id === id);
    if (tool) window.location.href = toolPath(tool, lang);
  };

  const quotes = useMemo(() => [...history.items].sort((a, b) => b.data.created - a.data.created), [history.items]);

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
            <button type="button" class="btn btn-sm btn-ghost" onClick={() => (setS(EXAMPLE), setSupplies({ items: supplyList(t.defaultSupplies, ['1500', '400', '']) }), setModel(EMPTY_MODEL), setParts([newPart({ name: lang === 'es' ? 'Soporte de auriculares' : 'Headphone stand', grams: '85', h: '4', min: '30', qty: '3', post: '10' })]))}>
              <Wand2 aria-hidden="true" />
              {t.example}
            </button>
          </div>
          <LibraryBar
            col="p3d-jobs"
            lang={lang}
            title={t.savedJobs}
            getData={() => ({ parts })}
            onLoad={(d) => setParts(d.parts?.length ? d.parts.map((p) => newPart({ ...p })) : [newPart()])}
            suggestName={() => parts.find((p) => p.name.trim())?.name.trim() ?? ''}
          />
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
          <LibraryBar col="p3d-profiles" lang={lang} title={t.savedProfiles} getData={() => s} onLoad={(d) => setS({ ...DEFAULTS, ...d })} suggestName={() => (lang === 'es' ? 'Mi impresora' : 'My printer')} />
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
            {s.packaging.trim() !== '' && num('p3-pack', t.packaging, 'packaging', { prefix: sym })}
            <Field label={t.markup} htmlFor="p3-markup" hint={s.markupMode === 'mult' ? t.markupMultHint : undefined}>
              <Segmented<'pct' | 'mult'>
                label={t.markup}
                value={s.markupMode}
                onChange={(mode) => {
                  if (mode === s.markupMode) return;
                  const v = parseNum(s.markup, lang);
                  const conv = Number.isFinite(v) ? (mode === 'mult' ? 1 + v / 100 : (v - 1) * 100) : NaN;
                  setS((o) => ({ ...o, markupMode: mode, markup: Number.isFinite(conv) ? fmtNum(Math.max(conv, 0), lang, 2) : o.markup }));
                }}
                options={[
                  { value: 'pct', label: '% ' + (lang === 'es' ? 'porcentaje' : 'percent') },
                  { value: 'mult', label: '× ' + (lang === 'es' ? 'multiplicador' : 'multiplier') },
                ]}
              />
              <NumInput id="p3-markup" value={s.markup} onValue={(v) => set('markup', v)} suffix={s.markupMode === 'mult' ? '×' : '%'} />
            </Field>
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
          <div>
            <h2 class="panel-title" style="margin:0 0 2px">{t.supTitle}</h2>
            <span class="hint">{t.supHint}</span>
          </div>
          {supplies.items.map((x) => (
            <div class="p3-sup" key={x.id}>
              <input class="input" aria-label={t.supName} value={x.name} onInput={(e) => setSupply(x.id, { name: e.currentTarget.value })} />
              <NumInput aria-label={t.supPrice} placeholder="0" prefix={x.cur === 'alt' ? secondSym : sym} value={x.price} onValue={(v) => setSupply(x.id, { price: v })} />
              <select class="select" aria-label={t.supCur} value={x.cur} onChange={(e) => setSupply(x.id, { cur: e.currentTarget.value as Supply['cur'] })}>
                <option value="main">{mainCode}</option>
                <option value="alt">{s.secondCur}</option>
              </select>
              <button type="button" class="btn btn-icon btn-ghost" aria-label={t.removeSupply} title={t.removeSupply} onClick={() => setSupplies((o) => ({ items: o.items.filter((i) => i.id !== x.id) }))}>
                <Trash2 aria-hidden="true" />
              </button>
              {x.cur === 'alt' && toMain(x.price, 'alt') > 0 && <span class="hint p3-sup-conv">{t.converted(money(toMain(x.price, 'alt')))}</span>}
            </div>
          ))}
          <div>
            <button type="button" class="btn btn-sm" onClick={() => setSupplies((o) => ({ items: [...o.items, { id: newSupplyId(), name: '', price: '', cur: 'main' }] }))}>
              <Plus aria-hidden="true" />
              {t.addSupply}
            </button>
          </div>

          <label class="check">
            <input type="checkbox" checked={model.on} onChange={(e) => setModel((m) => ({ ...m, on: e.currentTarget.checked }))} />
            {t.modelBuy}
          </label>
          {model.on && (
            <div class="stack">
              <div class="p3-model">
                <Field label={t.modelName} htmlFor="p3-model-name">
                  <input id="p3-model-name" class="input" value={model.name} onInput={(e) => setModel((m) => ({ ...m, name: e.currentTarget.value }))} />
                </Field>
                <Field label={t.modelPrice} htmlFor="p3-model-price">
                  <NumInput id="p3-model-price" prefix={model.cur === 'alt' ? secondSym : sym} value={model.price} onValue={(v) => setModel((m) => ({ ...m, price: v }))} />
                </Field>
                <Field label={t.supCur} htmlFor="p3-model-cur">
                  <select
                    id="p3-model-cur"
                    class="select"
                    value={model.cur}
                    onChange={(e) => {
                      const cur = e.currentTarget.value as ModelBuy['cur'];
                      setModel((m) => ({ ...m, cur }));
                      if (cur === 'alt') set('secondOn', true);
                    }}
                  >
                    <option value="main">{mainCode}</option>
                    <option value="alt">{s.secondCur}</option>
                  </select>
                </Field>
              </div>
              {model.cur === 'alt' && toMain(model.price, 'alt') > 0 && <span class="hint">{t.converted(money(toMain(model.price, 'alt')))}</span>}
              <span class="hint">{t.modelHint}</span>
            </div>
          )}

          {anyAlt && (
            <div class="stack">
              {rateFields}
              {!hasRate && <div class="alert alert-warning">{t.rateMissing}</div>}
            </div>
          )}
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
            </div>
          )}
          {s.secondOn && !anyAlt && rateFields}
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
                {s.secondOn && hasRate && <span class="muted small">≈ {money(r.total / rate, secondSym)}</span>}
                {s.secondOn && hasRate && <span class="muted small">{t.rateUsed(secondSym, fmtNum(rate, lang, 2), sym, rateDateText)}</span>}
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
                {r.suppliesPrice > 0 && (
                  <div class="breakdown-row">
                    <span>{t.suppliesLine}</span>
                    <span class="amount">{money(r.suppliesPrice)}</span>
                  </div>
                )}
                {r.modelPrice > 0 && (
                  <div class="breakdown-row">
                    <span>{t.modelLine}</span>
                    <span class="amount">{money(r.modelPrice)}</span>
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
          {editing !== null && (
            <div class="alert alert-warning p3-editing">
              <span>{t.editing(editing)}</span>
              <button type="button" class="btn btn-sm" onClick={() => setEditing(null)}>
                {t.newQuote}
              </button>
            </div>
          )}
          <div class="form-grid">
            <Field label={t.quoteNumber} htmlFor="p3-qnum" hint={editing === null ? t.quoteNumberHint : undefined}>
              <input id="p3-qnum" class="input" value={editing ?? number} disabled={editing !== null} onInput={(e) => setNumber(e.currentTarget.value)} />
            </Field>
            <Field label={t.quoteTitle} htmlFor="p3-qtitle">
              <input id="p3-qtitle" class="input" placeholder={t.quoteTitlePh} value={quoteTitle} onInput={(e) => setQuoteTitle(e.currentTarget.value)} />
            </Field>
          </div>
          <Field label={t.validity} htmlFor="p3-validity" hint={t.validityHint}>
            <NumInput id="p3-validity" suffix={lang === 'es' ? 'días' : 'days'} value={validity} onValue={setValidity} />
          </Field>
          <div class="form-grid">
            <Field label={t.clientName} htmlFor="p3-client">
              <input id="p3-client" class="input" value={client.name} onInput={(e) => setC('name', e.currentTarget.value)} />
            </Field>
            <Field label={t.clientTax} htmlFor="p3-ctax">
              <input id="p3-ctax" class="input" value={client.taxId} onInput={(e) => setC('taxId', e.currentTarget.value)} />
            </Field>
          </div>
          <details class="p3-issuer">
            <summary>{t.clientAddr}</summary>
            <div class="stack" style="margin-top:12px">
              <div class="form-grid">
                <Field label={t.street} htmlFor="p3-cstreet"><input id="p3-cstreet" class="input" value={client.street} onInput={(e) => setC('street', e.currentTarget.value)} /></Field>
                <Field label={t.floor} htmlFor="p3-cfloor"><input id="p3-cfloor" class="input" value={client.floor} onInput={(e) => setC('floor', e.currentTarget.value)} /></Field>
              </div>
              <div class="form-grid">
                <Field label={t.barrio} htmlFor="p3-cbarrio"><input id="p3-cbarrio" class="input" value={client.barrio} onInput={(e) => setC('barrio', e.currentTarget.value)} /></Field>
                <Field label={t.city} htmlFor="p3-ccity"><input id="p3-ccity" class="input" value={client.city} onInput={(e) => setC('city', e.currentTarget.value)} /></Field>
              </div>
              <div class="form-grid">
                <Field label={t.cp} htmlFor="p3-ccp"><input id="p3-ccp" class="input" value={client.cp} onInput={(e) => setC('cp', e.currentTarget.value)} /></Field>
                <Field label={t.clientPhone} htmlFor="p3-cphone"><input id="p3-cphone" class="input" type="tel" value={client.phone} onInput={(e) => setC('phone', e.currentTarget.value)} /></Field>
              </div>
            </div>
          </details>
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
          <div class="btn-row">
            <button type="button" class="btn btn-primary" disabled={!hasData || busy} onClick={buildQuote}>
              <FileDown aria-hidden="true" />
              {t.download}
            </button>
            <button type="button" class="btn" disabled={!hasData || busy} onClick={saveOnly}>
              <Save aria-hidden="true" />
              {savedNote ? t.savedOk : t.saveQuote}
            </button>
          </div>
        </section>

        <section class="panel stack">
          <div>
            <h2 class="panel-title" style="margin:0 0 2px">{t.historyTitle}</h2>
            <span class="hint">{t.historyHint}</span>
            <span class="hint">
              {history.loggedIn ? (
                t.cloud
              ) : (
                <>
                  {t.local}{' '}
                  <button type="button" class="link-btn" onClick={openLogin}>
                    {t.login}
                  </button>{' '}
                  {t.localTail}
                </>
              )}
            </span>
          </div>
          {quotes.length === 0 && <span class="muted">{t.historyEmpty}</span>}
          {quotes.map((q) => (
            <div class="p3-q" key={q.id}>
              <div class="p3-q-top">
                <strong>{q.data.number}</strong>
                <span class="muted small">{fmtDate(q.data.date, lang)}</span>
                <span class="p3-q-amount">{q.data.totalText}</span>
              </div>
              <div class="small">{[q.data.title, q.data.client.name].filter(Boolean).join(' · ') || '—'}</div>
              <div class="muted small">{q.data.partNames.join(', ')}</div>
              {q.data.alt && (
                <div class="muted small">
                  ≈ {symbolOf(q.data.alt.cur, '')} {fmtNum(q.data.alt.total, lang, 2, 2)} · 1 {symbolOf(q.data.alt.cur, '')} = {q.data.currency} {fmtNum(q.data.alt.rate, lang, 2)}
                  {q.data.alt.date ? ` · ${fmtDate(q.data.alt.date, lang)}` : ''}
                </div>
              )}
              <div class="btn-row">
                <button type="button" class="btn btn-sm" onClick={() => loadQuote(q.data)}>
                  <Pencil aria-hidden="true" />
                  {t.load}
                </button>
                <button type="button" class="btn btn-sm" onClick={() => void printQuote(q.data.doc)}>
                  <Printer aria-hidden="true" />
                  {t.reprint}
                </button>
                <button type="button" class="btn btn-sm" onClick={() => goTo('delivery', q.data)}>
                  <Package aria-hidden="true" />
                  {t.toDelivery}
                </button>
                <button type="button" class="btn btn-sm" onClick={() => goTo('receipt', q.data)}>
                  <Receipt aria-hidden="true" />
                  {t.toReceipt}
                </button>
                <button type="button" class="btn btn-sm" onClick={() => goTo('label', q.data)}>
                  <Truck aria-hidden="true" />
                  {t.toLabel}
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-ghost btn-danger"
                  aria-label={t.del}
                  title={t.del}
                  onClick={async () => {
                    if (!confirm(t.confirmDel(q.data.number))) return;
                    await history.remove(q.id).catch(() => {});
                    if (editing === q.data.number) setEditing(null);
                  }}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
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
        .p3-sup { display: grid; grid-template-columns: minmax(0, 1fr) 150px 92px 40px; gap: 8px; align-items: center; }
        .p3-sup-conv { grid-column: 1 / -1; margin-top: -4px; }
        .p3-model { display: grid; gap: 12px; grid-template-columns: minmax(0, 2fr) minmax(0, 1.2fr) minmax(0, 1fr); }
        @media (max-width: 560px) { .p3-sup { grid-template-columns: minmax(0, 1fr) 40px; } .p3-sup .input-group, .p3-sup select { grid-column: 1 / -1; } .p3-model { grid-template-columns: 1fr; } }
        .p3-editing { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .p3-q { display: grid; gap: 4px; padding: 12px; border: 1px solid var(--border); border-radius: 12px; }
        .p3-q-top { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
        .p3-q-amount { margin-left: auto; font-weight: 650; font-variant-numeric: tabular-nums; }
        @media (max-width: 520px) { .p3-bar { grid-template-columns: 90px minmax(0, 1fr) auto; } }
      `}</style>
    </div>
  );
}
