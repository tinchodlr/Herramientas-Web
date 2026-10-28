import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Download, ExternalLink, Plus, Trash2, TriangleAlert } from 'lucide-preact';
import { Field, NumInput, downloadBlob, parseNum, useStoredState, type Lang } from './shared/ui';
import { LogoPicker } from './shared/LogoPicker';
import { amountInWords } from '../lib/numwords';
import { buildDocumentPdf, computeTotals, fmtDate, money, type DocData, type DocItem, type DocKind, type Issuer, type PdfWords } from './documents/pdf';

const T = {
  es: {
    issuer: 'Tus datos',
    issuerHint: 'Se guardan solo en este navegador.',
    uploadLogo: 'Subir logo',
    removeLogo: 'Quitar',
    logo: 'Logo',
    name: 'Nombre o razón social',
    taxId: 'CUIT',
    taxCondition: 'Condición frente al IVA',
    conditions: ['', 'Responsable Inscripto', 'Monotributista', 'IVA Exento', 'Consumidor Final'],
    address: 'Domicilio',
    phone: 'Teléfono',
    email: 'Email',
    document: 'Documento',
    number: 'Número',
    date: 'Fecha',
    client: 'Cliente',
    clientName: 'Nombre o razón social',
    clientTaxId: 'CUIT / DNI',
    clientAddress: 'Domicilio',
    items: 'Detalle',
    desc: 'Descripción',
    qty: 'Cant.',
    price: 'Precio unit.',
    addItem: 'Agregar renglón',
    removeItem: 'Quitar renglón',
    showPrices: 'Mostrar precios en el remito',
    discount: 'Descuento general',
    vat: 'IVA',
    noVat: 'No discriminar IVA',
    vatIncluded: 'Los precios ya incluyen IVA',
    currency: 'Moneda',
    validity: 'Validez (días)',
    notes: 'Observaciones',
    notesPlaceholder: 'Forma de pago, plazo de entrega, condiciones…',
    amount: 'Importe recibido',
    concept: 'En concepto de',
    method: 'Forma de pago',
    methods: ['Efectivo', 'Transferencia bancaria', 'Cheque', 'Tarjeta', 'Mercado Pago'],
    reference: 'Referencia (n° de operación, cheque, etc.)',
    download: 'Descargar PDF',
    open: 'Abrir en otra pestaña',
    preview: 'Vista previa',
    totals: { subtotal: 'Subtotal', total: 'Total' },
    fiscalNote: 'Este documento no es una factura y no tiene validez fiscal. Para facturar tenés que usar el sistema de ARCA.',
    building: 'Armando el PDF…',
    failed: 'No se pudo armar el PDF.',
    words: {
      title: { quote: 'Presupuesto', delivery: 'Remito', receipt: 'Recibo' },
      number: 'N°',
      date: 'Fecha',
      validUntil: (d: number, date: string) => `Válido ${d} días (hasta ${date})`,
      nonFiscalBox: 'DOCUMENTO NO VÁLIDO COMO FACTURA',
      nonFiscalFoot: 'Documento no válido como factura',
      client: 'Cliente',
      taxId: 'CUIT / DNI',
      address: 'Domicilio',
      desc: 'Descripción',
      qty: 'Cant.',
      unit: 'P. unitario',
      amount: 'Importe',
      subtotal: 'Subtotal',
      discount: (p: string) => `Descuento (${p} %)`,
      net: 'Neto gravado',
      vat: (r: string) => `IVA ${r} %`,
      vatIncluded: (r: string) => `IVA incluido ${r} %`,
      total: 'TOTAL',
      notes: 'Observaciones',
      page: (i: number, n: number) => `Página ${i} de ${n}`,
      signature: 'Firma',
      signName: 'Aclaración',
      signId: 'DNI',
      receivedFrom: 'Recibí de',
      receiptText: (c: string, a: string, w: string, concept: string) => `Recibí de ${c} la suma de ${a}${w ? ` (${w})` : ''}${concept.trim() ? `, en concepto de ${concept.trim()}` : ''}.`,
      amountReceived: 'TOTAL RECIBIDO',
      method: 'Forma de pago',
      reference: 'Referencia',
      signReceiver: 'Firma de quien recibe el pago.',
      currencyName: { es: ['peso', 'pesos'], en: ['peso', 'pesos'] },
    },
  },
  en: {
    issuer: 'Your details',
    issuerHint: 'Saved only in this browser.',
    uploadLogo: 'Upload logo',
    removeLogo: 'Remove',
    logo: 'Logo',
    name: 'Name or company',
    taxId: 'Tax ID (CUIT)',
    taxCondition: 'VAT status',
    conditions: ['', 'VAT registered', 'Small taxpayer (Monotributo)', 'VAT exempt', 'Final consumer'],
    address: 'Address',
    phone: 'Phone',
    email: 'Email',
    document: 'Document',
    number: 'Number',
    date: 'Date',
    client: 'Customer',
    clientName: 'Name or company',
    clientTaxId: 'Tax ID',
    clientAddress: 'Address',
    items: 'Details',
    desc: 'Description',
    qty: 'Qty',
    price: 'Unit price',
    addItem: 'Add line',
    removeItem: 'Remove line',
    showPrices: 'Show prices on the delivery note',
    discount: 'Overall discount',
    vat: 'VAT',
    noVat: 'Do not itemize VAT',
    vatIncluded: 'Prices already include VAT',
    currency: 'Currency',
    validity: 'Valid for (days)',
    notes: 'Notes',
    notesPlaceholder: 'Payment terms, delivery time, conditions…',
    amount: 'Amount received',
    concept: 'For',
    method: 'Payment method',
    methods: ['Cash', 'Bank transfer', 'Check', 'Card', 'Mercado Pago'],
    reference: 'Reference (operation no., check no., etc.)',
    download: 'Download PDF',
    open: 'Open in a new tab',
    preview: 'Preview',
    totals: { subtotal: 'Subtotal', total: 'Total' },
    fiscalNote: 'This document is not an invoice and has no tax validity. To issue invoices you must use the ARCA system.',
    building: 'Building the PDF…',
    failed: 'The PDF could not be built.',
    words: {
      title: { quote: 'Quote', delivery: 'Delivery note', receipt: 'Receipt' },
      number: 'No.',
      date: 'Date',
      validUntil: (d: number, date: string) => `Valid for ${d} days (until ${date})`,
      nonFiscalBox: 'NOT VALID AS AN INVOICE',
      nonFiscalFoot: 'Not valid as an invoice',
      client: 'Customer',
      taxId: 'Tax ID',
      address: 'Address',
      desc: 'Description',
      qty: 'Qty',
      unit: 'Unit price',
      amount: 'Amount',
      subtotal: 'Subtotal',
      discount: (p: string) => `Discount (${p} %)`,
      net: 'Taxable amount',
      vat: (r: string) => `VAT ${r} %`,
      vatIncluded: (r: string) => `VAT included ${r} %`,
      total: 'TOTAL',
      notes: 'Notes',
      page: (i: number, n: number) => `Page ${i} of ${n}`,
      signature: 'Signature',
      signName: 'Printed name',
      signId: 'ID',
      receivedFrom: 'Received from',
      receiptText: (c: string, a: string, w: string, concept: string) => `Received from ${c} the sum of ${a}${w ? ` (${w})` : ''}${concept.trim() ? `, for ${concept.trim()}` : ''}.`,
      amountReceived: 'TOTAL RECEIVED',
      method: 'Payment method',
      reference: 'Reference',
      signReceiver: 'Signature of the person receiving the payment.',
      currencyName: { es: ['peso', 'pesos'], en: ['peso', 'pesos'] },
    },
  },
};

export const DOC_WORDS = { es: T.es.words, en: T.en.words };
export const EMPTY_ISSUER: Issuer = { name: '', taxId: '', taxCondition: '', address: '', phone: '', email: '', logo: '' };
const CURRENCIES = ['$', 'US$', '€'];
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
let nextId = 1;
const newItem = (): DocItem => ({ id: nextId++, desc: '', qty: '1', price: '' });

/** "0001-00000007" → "0001-00000008": suma uno al último grupo de dígitos. */
const bumpNumber = (n: string) => n.replace(/(\d+)(\D*)$/, (_, d: string, rest: string) => String(Number(d) + 1).padStart(d.length, '0') + rest);

export default function Documents({ lang, kind }: { lang: Lang; kind: DocKind }) {
  const t = T[lang];
  const [issuer, setIssuer] = useStoredState<Issuer>('doc-issuer', EMPTY_ISSUER);
  const [number, setNumber] = useStoredState(`doc-number-${kind}`, '0001-00000001');
  const [prefs, setPrefs] = useStoredState('doc-prefs', { currency: '$', vat: '0', vatIncluded: true, validity: '15', showPrices: false, method: '' });
  const [date, setDate] = useState(today());
  const [client, setClient] = useState({ name: '', taxId: '', address: '' });
  const [items, setItems] = useState<DocItem[]>(() => [newItem()]);
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [reference, setReference] = useState('');

  const setI = <K extends keyof Issuer>(k: K, v: Issuer[K]) => setIssuer((s) => ({ ...s, [k]: v }));
  const setP = <K extends keyof typeof prefs>(k: K, v: (typeof prefs)[K]) => setPrefs((s) => ({ ...s, [k]: v }));
  const setItem = (id: number, patch: Partial<DocItem>) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const doc: DocData = {
    kind,
    number,
    date,
    clientName: client.name,
    clientTaxId: client.taxId,
    clientAddress: client.address,
    items,
    discount,
    vat: prefs.vat,
    vatIncluded: prefs.vatIncluded,
    currency: prefs.currency,
    validity: prefs.validity,
    notes,
    showPrices: prefs.showPrices,
    amount,
    concept,
    method: prefs.method,
    reference,
  };

  const vatRate = Number.isFinite(parseNum(prefs.vat, lang)) ? parseNum(prefs.vat, lang) : 0;
  const totals = useMemo(() => computeTotals(items, discount, vatRate, prefs.vatIncluded, lang), [items, discount, vatRate, prefs.vatIncluded, lang]);
  const showPrices = kind === 'quote' || (kind === 'delivery' && prefs.showPrices);
  const amountNum = parseNum(amount, lang);

  // El PDF se rearma unos instantes después de cada cambio y se muestra en la vista previa.
  const [url, setUrl] = useState('');
  const [state, setState] = useState<'idle' | 'building' | 'error'>('building');
  const bytes = useRef<Uint8Array | null>(null);
  const docKey = JSON.stringify([doc, issuer, lang]);
  useEffect(() => {
    let cancelled = false;
    setState('building');
    const id = setTimeout(async () => {
      try {
        const out = await buildDocumentPdf(doc, issuer, lang, t.words as PdfWords);
        if (cancelled) return;
        bytes.current = out;
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(new Blob([out as BlobPart], { type: 'application/pdf' }));
        });
        setState('idle');
      } catch {
        if (!cancelled) setState('error');
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [docKey]);
  useEffect(() => () => url && URL.revokeObjectURL(url), []);

  const download = () => {
    if (!bytes.current) return;
    const file = `${t.words.title[kind]}-${number || 'sin-numero'}.pdf`.replace(/[^\w.\-áéíóúñÁÉÍÓÚÑ]+/g, '_');
    downloadBlob(new Blob([bytes.current as BlobPart], { type: 'application/pdf' }), file);
    setNumber(bumpNumber(number));
  };

  const words = kind === 'receipt' && Number.isFinite(amountNum) ? amountInWords(amountNum, lang, t.words.currencyName) : '';

  return (
    <div class="tool-layout">
      <div class="stack">
        <section class="panel stack">
          <div>
            <h2 class="panel-title" style="margin-bottom:2px">{t.issuer}</h2>
            <span class="hint">{t.issuerHint}</span>
          </div>
          <LogoPicker value={issuer.logo} onChange={(v) => setI('logo', v)} uploadLabel={t.uploadLogo} removeLabel={t.removeLogo} ariaLabel={t.logo} />
          <div class="form-grid">
            <Field label={t.name} htmlFor="d-name">
              <input id="d-name" class="input" value={issuer.name} onInput={(e) => setI('name', e.currentTarget.value)} />
            </Field>
            <Field label={t.taxId} htmlFor="d-cuit">
              <input id="d-cuit" class="input" inputMode="numeric" placeholder="20-12345678-6" value={issuer.taxId} onInput={(e) => setI('taxId', e.currentTarget.value)} />
            </Field>
          </div>
          <Field label={t.taxCondition} htmlFor="d-cond">
            <select id="d-cond" class="select" value={issuer.taxCondition} onChange={(e) => setI('taxCondition', e.currentTarget.value)}>
              {t.conditions.map((c) => (
                <option key={c} value={c}>
                  {c || '—'}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.address} htmlFor="d-addr">
            <input id="d-addr" class="input" value={issuer.address} onInput={(e) => setI('address', e.currentTarget.value)} />
          </Field>
          <div class="form-grid">
            <Field label={t.phone} htmlFor="d-phone">
              <input id="d-phone" class="input" type="tel" value={issuer.phone} onInput={(e) => setI('phone', e.currentTarget.value)} />
            </Field>
            <Field label={t.email} htmlFor="d-mail">
              <input id="d-mail" class="input" type="email" value={issuer.email} onInput={(e) => setI('email', e.currentTarget.value)} />
            </Field>
          </div>
        </section>

        <section class="panel stack">
          <h2 class="panel-title" style="margin:0">{t.document}</h2>
          <div class="form-grid">
            <Field label={t.number} htmlFor="d-num">
              <input id="d-num" class="input" value={number} onInput={(e) => setNumber(e.currentTarget.value)} />
            </Field>
            <Field label={t.date} htmlFor="d-date">
              <input id="d-date" class="input" type="date" value={date} onInput={(e) => setDate(e.currentTarget.value)} />
            </Field>
          </div>
          <h3 class="panel-title" style="margin:6px 0 0">{t.client}</h3>
          <div class="form-grid">
            <Field label={t.clientName} htmlFor="d-cname">
              <input id="d-cname" class="input" value={client.name} onInput={(e) => setClient((c) => ({ ...c, name: e.currentTarget.value }))} />
            </Field>
            <Field label={t.clientTaxId} htmlFor="d-ctax">
              <input id="d-ctax" class="input" value={client.taxId} onInput={(e) => setClient((c) => ({ ...c, taxId: e.currentTarget.value }))} />
            </Field>
          </div>
          <Field label={t.clientAddress} htmlFor="d-caddr">
            <input id="d-caddr" class="input" value={client.address} onInput={(e) => setClient((c) => ({ ...c, address: e.currentTarget.value }))} />
          </Field>
        </section>

        {kind === 'receipt' ? (
          <section class="panel stack">
            <Field label={t.amount} htmlFor="d-amount" hint={words}>
              <NumInput id="d-amount" prefix={prefs.currency} value={amount} onValue={setAmount} placeholder="0,00" />
            </Field>
            <Field label={t.concept} htmlFor="d-concept">
              <input id="d-concept" class="input" value={concept} onInput={(e) => setConcept(e.currentTarget.value)} />
            </Field>
            <div class="form-grid">
              <Field label={t.method} htmlFor="d-method">
                <input id="d-method" class="input" list="d-methods" value={prefs.method} onInput={(e) => setP('method', e.currentTarget.value)} />
                <datalist id="d-methods">
                  {t.methods.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </Field>
              <Field label={t.currency} htmlFor="d-cur">
                <select id="d-cur" class="select" value={prefs.currency} onChange={(e) => setP('currency', e.currentTarget.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={t.reference} htmlFor="d-ref">
              <input id="d-ref" class="input" value={reference} onInput={(e) => setReference(e.currentTarget.value)} />
            </Field>
          </section>
        ) : (
          <section class="panel stack">
            <h2 class="panel-title" style="margin:0">{t.items}</h2>
            <div class="doc-items">
              {items.map((it) => (
                <div class={`doc-item ${showPrices ? 'with-price' : ''}`} key={it.id}>
                  <input class="input" aria-label={t.desc} placeholder={t.desc} value={it.desc} onInput={(e) => setItem(it.id, { desc: e.currentTarget.value })} />
                  <NumInput aria-label={t.qty} placeholder={t.qty} value={it.qty} onValue={(v) => setItem(it.id, { qty: v })} />
                  {showPrices && <NumInput aria-label={t.price} placeholder={t.price} prefix={prefs.currency} value={it.price} onValue={(v) => setItem(it.id, { price: v })} />}
                  <button type="button" class="btn btn-icon btn-ghost" aria-label={t.removeItem} disabled={items.length === 1} onClick={() => setItems((l) => l.filter((x) => x.id !== it.id))}>
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <div>
              <button type="button" class="btn btn-sm" onClick={() => setItems((l) => [...l, newItem()])}>
                <Plus aria-hidden="true" />
                {t.addItem}
              </button>
            </div>

            {kind === 'delivery' && (
              <label class="check">
                <input type="checkbox" checked={prefs.showPrices} onChange={(e) => setP('showPrices', e.currentTarget.checked)} />
                {t.showPrices}
              </label>
            )}

            {showPrices && (
              <div class="stack">
                <div class="form-grid">
                  <Field label={t.vat} htmlFor="d-vat">
                    <select id="d-vat" class="select" value={prefs.vat} onChange={(e) => setP('vat', e.currentTarget.value)}>
                      <option value="0">{t.noVat}</option>
                      <option value="21">21 %</option>
                      <option value="10.5">10,5 %</option>
                      <option value="27">27 %</option>
                    </select>
                  </Field>
                  <Field label={t.discount} htmlFor="d-disc">
                    <NumInput id="d-disc" suffix="%" value={discount} onValue={setDiscount} placeholder="0" />
                  </Field>
                </div>
                <div class="form-grid">
                  <Field label={t.currency} htmlFor="d-cur2">
                    <select id="d-cur2" class="select" value={prefs.currency} onChange={(e) => setP('currency', e.currentTarget.value)}>
                      {CURRENCIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  {kind === 'quote' && (
                    <Field label={t.validity} htmlFor="d-valid">
                      <NumInput id="d-valid" value={prefs.validity} onValue={(v) => setP('validity', v)} />
                    </Field>
                  )}
                </div>
                {vatRate > 0 && (
                  <label class="check">
                    <input type="checkbox" checked={prefs.vatIncluded} onChange={(e) => setP('vatIncluded', e.currentTarget.checked)} />
                    {t.vatIncluded}
                  </label>
                )}
                <div class="doc-total">
                  <span>{t.totals.total}</span>
                  <strong>{money(totals.total, prefs.currency, lang)}</strong>
                </div>
              </div>
            )}
          </section>
        )}

        <section class="panel stack">
          <Field label={t.notes} htmlFor="d-notes">
            <textarea id="d-notes" class="textarea" rows={3} placeholder={t.notesPlaceholder} value={notes} onInput={(e) => setNotes(e.currentTarget.value)} />
          </Field>
        </section>

        <div class="alert alert-warning">
          <TriangleAlert aria-hidden="true" />
          <div>{t.fiscalNote}</div>
        </div>
      </div>

      <div class="stack sticky">
        <section class="panel stack">
          <div class="btn-row">
            <button type="button" class="btn btn-primary" onClick={download} disabled={!bytes.current || state === 'error'}>
              <Download aria-hidden="true" />
              {t.download}
            </button>
            {url && (
              <a class="btn" href={url} target="_blank" rel="noopener">
                <ExternalLink aria-hidden="true" />
                {t.open}
              </a>
            )}
          </div>
          <div class="doc-preview" aria-label={t.preview}>
            {url && <iframe src={`${url}#toolbar=0&navpanes=0`} title={t.preview} />}
            {state === 'building' && <span class="doc-status">{t.building}</span>}
            {state === 'error' && <span class="doc-status">{t.failed}</span>}
          </div>
          <span class="hint">
            {t.words.title[kind]} · {fmtDate(date, lang)}
          </span>
        </section>
      </div>

      <style>{`
        .doc-items { display: grid; gap: 10px; }
        .doc-item { display: grid; grid-template-columns: minmax(0, 1fr) 76px 40px; gap: 8px; align-items: center; }
        .doc-item.with-price { grid-template-columns: minmax(0, 1fr) 76px minmax(0, 130px) 40px; }
        @media (max-width: 560px) {
          .doc-item { grid-template-columns: minmax(0, 1fr) 70px 40px; }
          .doc-item.with-price { grid-template-columns: minmax(0, 1fr) 70px 40px; }
          .doc-item.with-price > :nth-child(3) { grid-column: 1 / 3; grid-row: 2; }
        }
        .doc-total { display: flex; justify-content: space-between; align-items: baseline; padding: 12px 14px; border-radius: 10px; background: var(--surface-2, rgba(127,127,127,.1)); }
        .doc-total strong { font-size: 1.2rem; }
        .doc-preview { position: relative; height: min(78vh, 760px); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: #e5e7eb; }
        .doc-preview iframe { width: 100%; height: 100%; border: 0; background: #fff; }
        .doc-status { position: absolute; top: 10px; right: 10px; padding: 4px 10px; border-radius: 999px; background: rgba(15,23,42,.8); color: #fff; font-size: .8rem; }
      `}</style>
    </div>
  );
}
