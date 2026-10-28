import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { ImageUp, Printer, Trash2 } from 'lucide-preact';
import JsBarcode from 'jsbarcode';
import { Field, Segmented, useStoredState, type Lang } from './shared/ui';

interface Sender {
  name: string;
  address: string;
  city: string;
  cp: string;
  phone: string;
  logo: string;
}

interface Recipient {
  name: string;
  address: string;
  city: string;
  province: string;
  cp: string;
  phone: string;
  order: string;
  packages: string;
  weight: string;
  notes: string;
  fragile: boolean;
}

type Format = 'thermal' | 'a4';

const EMPTY_SENDER: Sender = { name: '', address: '', city: '', cp: '', phone: '', logo: '' };
const EXAMPLE_RECIPIENT: Recipient = {
  name: 'María González',
  address: 'Av. Rivadavia 1234, piso 3 B',
  city: 'Ramos Mejía',
  province: 'Buenos Aires',
  cp: '1704',
  phone: '11 5555-1234',
  order: 'PED-000123',
  packages: '1',
  weight: '',
  notes: '',
  fragile: false,
};

const T = {
  es: {
    sender: 'Remitente',
    senderHint: 'Se guarda en este navegador para la próxima vez.',
    name: 'Nombre o empresa',
    address: 'Dirección',
    city: 'Localidad',
    province: 'Provincia',
    cp: 'Código postal',
    phone: 'Teléfono',
    logo: 'Logo',
    uploadLogo: 'Subir logo',
    removeLogo: 'Quitar logo',
    recipient: 'Destinatario',
    single: 'Una etiqueta',
    bulk: 'Varias (pegar desde Excel)',
    order: 'N.º de pedido o seguimiento',
    orderHint: 'Se imprime como código de barras.',
    packages: 'Bultos',
    weight: 'Peso (kg)',
    notes: 'Observaciones',
    fragile: 'Frágil',
    bulkHint:
      'Una fila por envío, columnas separadas por tabulación (copiado de Excel) o punto y coma, en este orden: Nombre; Dirección; Localidad; Provincia; CP; Teléfono; Pedido; Bultos; Observaciones.',
    format: 'Tamaño',
    thermal: '10 × 15 cm (térmica)',
    a4: 'A4 (4 por hoja)',
    print: 'Imprimir',
    preview: 'Vista previa',
    labels: (n: number) => (n === 1 ? '1 etiqueta' : `${n} etiquetas`),
    more: (n: number) => `y ${n} más al imprimir`,
    from: 'Remitente',
    to: 'Destinatario',
    pkg: 'Bulto',
    of: 'de',
    tel: 'Tel.',
    cpShort: 'CP',
    printTip: 'En el diálogo de impresión elegí escala 100 % y desactivá encabezados y pies de página.',
    noLabels: 'Completá al menos el nombre del destinatario.',
  },
  en: {
    sender: 'Sender',
    senderHint: 'Saved in this browser for next time.',
    name: 'Name or company',
    address: 'Address',
    city: 'City',
    province: 'State / province',
    cp: 'Postal code',
    phone: 'Phone',
    logo: 'Logo',
    uploadLogo: 'Upload logo',
    removeLogo: 'Remove logo',
    recipient: 'Recipient',
    single: 'One label',
    bulk: 'Many (paste from Excel)',
    order: 'Order or tracking number',
    orderHint: 'Printed as a barcode.',
    packages: 'Packages',
    weight: 'Weight (kg)',
    notes: 'Notes',
    fragile: 'Fragile',
    bulkHint:
      'One row per shipment, columns separated by tab (copied from Excel) or semicolon, in this order: Name; Address; City; State; Postal code; Phone; Order; Packages; Notes.',
    format: 'Size',
    thermal: '4 × 6 in (thermal)',
    a4: 'A4 (4 per sheet)',
    print: 'Print',
    preview: 'Preview',
    labels: (n: number) => (n === 1 ? '1 label' : `${n} labels`),
    more: (n: number) => `and ${n} more when printing`,
    from: 'From',
    to: 'Ship to',
    pkg: 'Package',
    of: 'of',
    tel: 'Tel.',
    cpShort: 'ZIP',
    printTip: 'In the print dialog choose 100% scale and turn off headers and footers.',
    noLabels: 'Fill in at least the recipient name.',
  },
};

const PREVIEW_MAX = 4;

export default function ShippingLabels({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [sender, setSender] = useStoredState<Sender>('labels-sender', EMPTY_SENDER);
  const [prefs, setPrefs] = useStoredState('labels-prefs', { format: 'thermal' as Format });
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [rec, setRec] = useState<Recipient>(EXAMPLE_RECIPIENT);
  const [bulkText, setBulkText] = useState('');
  const [printing, setPrinting] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  const setS = (k: keyof Sender, v: string) => setSender((p) => ({ ...p, [k]: v }));
  const setR = <K extends keyof Recipient>(k: K, v: Recipient[K]) => setRec((p) => ({ ...p, [k]: v }));

  const recipients = useMemo<Recipient[]>(() => {
    if (mode === 'single') return rec.name.trim() ? [rec] : [];
    return bulkText
      .split(/\r?\n/)
      .map((line) => line.split(line.includes('\t') ? '\t' : ';').map((c) => c.trim()))
      .filter((c) => c[0])
      .map(([name, address = '', city = '', province = '', cp = '', phone = '', order = '', packages = '1', notes = '']) => ({
        name, address, city, province, cp, phone, order, packages, notes, weight: '', fragile: false,
      }));
  }, [mode, rec, bulkText]);

  const labels = useMemo(
    () =>
      recipients.flatMap((r) => {
        const total = Math.min(Math.max(parseInt(r.packages, 10) || 1, 1), 50);
        return Array.from({ length: total }, (_, i) => ({ r, n: i + 1, total }));
      }),
    [recipients],
  );

  const onLogo = async (file: File) => {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 360 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    setS('logo', canvas.toDataURL('image/png'));
  };

  useEffect(() => {
    if (!printing) return;
    const style = document.createElement('style');
    style.textContent = prefs.format === 'thermal' ? '@page { size: 100mm 150mm; margin: 0; }' : '@page { size: A4; margin: 0; }';
    document.head.appendChild(style);
    document.body.classList.add('printing');
    const done = () => {
      document.body.classList.remove('printing');
      style.remove();
      setPrinting(false);
    };
    // Un respiro para que el portal y los códigos de barras terminen de dibujarse antes de imprimir.
    const id = setTimeout(() => {
      window.print();
      setTimeout(done, 300);
    }, 60);
    return () => clearTimeout(id);
  }, [printing]);

  const sheets = useMemo(() => {
    if (prefs.format === 'thermal') return labels.map((l) => [l]);
    const out: (typeof labels)[] = [];
    for (let i = 0; i < labels.length; i += 4) out.push(labels.slice(i, i + 4));
    return out;
  }, [labels, prefs.format]);

  return (
    <div class="tool-layout">
      <div class="stack">
        <section class="panel">
          <h2 class="panel-title">{t.sender}</h2>
          <div class="stack">
            <div class="form-grid">
              <Field label={t.name} htmlFor="s-name">
                <input id="s-name" class="input" value={sender.name} onInput={(e) => setS('name', e.currentTarget.value)} />
              </Field>
              <Field label={t.phone} htmlFor="s-phone">
                <input id="s-phone" class="input" type="tel" value={sender.phone} onInput={(e) => setS('phone', e.currentTarget.value)} />
              </Field>
            </div>
            <Field label={t.address} htmlFor="s-address">
              <input id="s-address" class="input" value={sender.address} onInput={(e) => setS('address', e.currentTarget.value)} />
            </Field>
            <div class="form-grid">
              <Field label={t.city} htmlFor="s-city">
                <input id="s-city" class="input" value={sender.city} onInput={(e) => setS('city', e.currentTarget.value)} />
              </Field>
              <Field label={t.cp} htmlFor="s-cp">
                <input id="s-cp" class="input" value={sender.cp} onInput={(e) => setS('cp', e.currentTarget.value)} />
              </Field>
            </div>
            <div class="logo-row">
              {sender.logo && <img src={sender.logo} alt="" class="logo-preview" />}
              <button type="button" class="btn btn-sm" onClick={() => logoInput.current?.click()}>
                <ImageUp aria-hidden="true" />
                {t.uploadLogo}
              </button>
              {sender.logo && (
                <button type="button" class="btn btn-sm btn-ghost btn-danger" onClick={() => setS('logo', '')}>
                  <Trash2 aria-hidden="true" />
                  {t.removeLogo}
                </button>
              )}
              <input
                ref={logoInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0];
                  if (f) onLogo(f);
                  e.currentTarget.value = '';
                }}
              />
            </div>
            <span class="hint">{t.senderHint}</span>
          </div>
        </section>

        <section class="panel">
          <div class="panel-head-row">
            <h2 class="panel-title" style="margin:0">{t.recipient}</h2>
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'single', label: t.single },
                { value: 'bulk', label: t.bulk },
              ]}
            />
          </div>

          {mode === 'single' ? (
            <div class="stack">
              <div class="form-grid">
                <Field label={t.name} htmlFor="r-name">
                  <input id="r-name" class="input" value={rec.name} onInput={(e) => setR('name', e.currentTarget.value)} />
                </Field>
                <Field label={t.phone} htmlFor="r-phone">
                  <input id="r-phone" class="input" type="tel" value={rec.phone} onInput={(e) => setR('phone', e.currentTarget.value)} />
                </Field>
              </div>
              <Field label={t.address} htmlFor="r-address">
                <input id="r-address" class="input" value={rec.address} onInput={(e) => setR('address', e.currentTarget.value)} />
              </Field>
              <div class="form-grid">
                <Field label={t.city} htmlFor="r-city">
                  <input id="r-city" class="input" value={rec.city} onInput={(e) => setR('city', e.currentTarget.value)} />
                </Field>
                <Field label={t.province} htmlFor="r-prov">
                  <input id="r-prov" class="input" value={rec.province} onInput={(e) => setR('province', e.currentTarget.value)} />
                </Field>
                <Field label={t.cp} htmlFor="r-cp">
                  <input id="r-cp" class="input" value={rec.cp} onInput={(e) => setR('cp', e.currentTarget.value)} />
                </Field>
              </div>
              <div class="form-grid">
                <Field label={t.order} htmlFor="r-order" hint={t.orderHint}>
                  <input id="r-order" class="input" value={rec.order} onInput={(e) => setR('order', e.currentTarget.value)} />
                </Field>
                <Field label={t.packages} htmlFor="r-pk">
                  <input id="r-pk" class="input" type="number" min={1} max={50} value={rec.packages} onInput={(e) => setR('packages', e.currentTarget.value)} />
                </Field>
                <Field label={t.weight} htmlFor="r-w">
                  <input id="r-w" class="input" inputMode="decimal" value={rec.weight} onInput={(e) => setR('weight', e.currentTarget.value)} />
                </Field>
              </div>
              <Field label={t.notes} htmlFor="r-notes">
                <input id="r-notes" class="input" value={rec.notes} onInput={(e) => setR('notes', e.currentTarget.value)} />
              </Field>
              <label class="check">
                <input type="checkbox" checked={rec.fragile} onChange={(e) => setR('fragile', e.currentTarget.checked)} />
                {t.fragile}
              </label>
            </div>
          ) : (
            <div class="stack">
              <span class="hint">{t.bulkHint}</span>
              <textarea
                class="textarea mono"
                rows={8}
                value={bulkText}
                onInput={(e) => setBulkText(e.currentTarget.value)}
                placeholder={'Juan Pérez; Belgrano 450; Morón; Buenos Aires; 1708; 11 4444-0000; PED-124; 1\nAna Ruiz; San Martín 99; Córdoba; Córdoba; 5000; 351 555-0000; PED-125; 2'}
              />
            </div>
          )}
        </section>
      </div>

      <div class="stack sticky">
        <section class="panel">
          <div class="panel-head-row">
            <h2 class="panel-title" style="margin:0">
              {t.preview} <span class="badge">{t.labels(labels.length)}</span>
            </h2>
            <button type="button" class="btn btn-primary" disabled={!labels.length} onClick={() => setPrinting(true)}>
              <Printer aria-hidden="true" />
              {t.print}
            </button>
          </div>
          <div class="stack">
            <div class="field">
              <span class="label">{t.format}</span>
              <Segmented
                value={prefs.format}
                onChange={(v) => setPrefs({ format: v })}
                options={[
                  { value: 'thermal', label: t.thermal },
                  { value: 'a4', label: t.a4 },
                ]}
              />
            </div>
            {labels.length === 0 ? (
              <p class="muted">{t.noLabels}</p>
            ) : (
              <div class="label-preview">
                {labels.slice(0, PREVIEW_MAX).map((l, i) => (
                  <div class="label-scale" key={i}>
                    <Label sender={sender} r={l.r} n={l.n} total={l.total} t={t} />
                  </div>
                ))}
                {labels.length > PREVIEW_MAX && <p class="hint">{t.more(labels.length - PREVIEW_MAX)}</p>}
              </div>
            )}
            <span class="hint">{t.printTip}</span>
          </div>
        </section>
      </div>

      {printing &&
        createPortal(
          <div class="print-root">
            {sheets.map((sheet, i) => (
              <div class={prefs.format === 'thermal' ? 'print-page thermal' : 'print-page a4'} key={i}>
                {sheet.map((l, j) => (
                  <Label key={j} sender={sender} r={l.r} n={l.n} total={l.total} t={t} />
                ))}
              </div>
            ))}
          </div>,
          document.body,
        )}

      <style>{LABEL_CSS}</style>
    </div>
  );
}

function Label({ sender, r, n, total, t }: { sender: Sender; r: Recipient; n: number; total: number; t: (typeof T)['es'] }) {
  const cityLine = [r.city, r.province].filter(Boolean).join(', ');
  const senderLine = [sender.address, [sender.city, sender.cp && `${t.cpShort} ${sender.cp}`].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
  return (
    <div class="ship-label">
      <div class="sl-from">
        {sender.logo && <img src={sender.logo} alt="" class="sl-logo" />}
        <div>
          <div class="sl-cap">{t.from}</div>
          <div class="sl-from-name">{sender.name || '—'}</div>
          {senderLine && <div>{senderLine}</div>}
          {sender.phone && (
            <div>
              {t.tel} {sender.phone}
            </div>
          )}
        </div>
      </div>
      <div class="sl-to">
        <div class="sl-cap">{t.to}</div>
        <div class="sl-to-name">{r.name}</div>
        {r.address && <div class="sl-addr">{r.address}</div>}
        {cityLine && <div class="sl-addr">{cityLine}</div>}
        {r.cp && (
          <div class="sl-cp">
            {t.cpShort} {r.cp}
          </div>
        )}
        {r.phone && (
          <div class="sl-phone">
            {t.tel} {r.phone}
          </div>
        )}
      </div>
      <div class="sl-meta">
        <span>
          {t.pkg} <b>{n}</b> {t.of} <b>{total}</b>
        </span>
        {r.weight && <span>{r.weight} kg</span>}
        {r.fragile && <span class="sl-fragile">{t.fragile.toUpperCase()}</span>}
      </div>
      {r.order && (
        <div class="sl-barcode">
          <Barcode value={r.order} />
        </div>
      )}
      {r.notes && <div class="sl-notes">{r.notes}</div>}
    </div>
  );
}

function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, { format: 'CODE128', height: 64, margin: 0, fontSize: 14, width: 2, background: 'transparent' });
    } catch {
      ref.current.innerHTML = '';
    }
  }, [value]);
  return <svg ref={ref} />;
}

const LABEL_CSS = `
  .panel-head-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  .logo-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .logo-preview { height: 40px; width: auto; border-radius: 6px; background: #fff; padding: 3px; border: 1px solid var(--border); }
  .label-preview { display: flex; flex-direction: column; align-items: center; gap: 14px; max-height: 720px; overflow: auto; padding: 4px; }
  .label-scale { width: 100%; max-width: 100mm; }
  .label-scale .ship-label { box-shadow: var(--shadow); border-radius: 6px; width: 100%; height: auto; aspect-ratio: 2 / 3; }

  .ship-label {
    background: #fff; color: #000; width: 100mm; height: 150mm; padding: 5mm;
    display: flex; flex-direction: column; gap: 3.5mm; font-family: Arial, Helvetica, sans-serif;
    font-size: 9pt; line-height: 1.3; overflow: hidden; border: 0.3mm solid #000;
  }
  .sl-cap { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 1mm; }
  .sl-from { display: flex; gap: 3mm; align-items: flex-start; padding-bottom: 3mm; border-bottom: 0.4mm solid #000; }
  .sl-logo { max-height: 14mm; max-width: 26mm; object-fit: contain; }
  .sl-from-name { font-weight: 700; font-size: 10pt; }
  .sl-to { flex: 1; display: flex; flex-direction: column; gap: 0.8mm; }
  .sl-to-name { font-size: 17pt; font-weight: 800; line-height: 1.15; margin-bottom: 1mm; overflow-wrap: anywhere; }
  .sl-addr { font-size: 12pt; }
  .sl-cp { font-size: 20pt; font-weight: 800; margin-top: 1.5mm; }
  .sl-phone { font-size: 11pt; }
  .sl-meta { display: flex; gap: 4mm; align-items: center; justify-content: space-between; border-top: 0.4mm solid #000; padding-top: 2.5mm; font-size: 11pt; }
  .sl-fragile { border: 0.5mm solid #000; padding: 0.5mm 2mm; font-weight: 800; letter-spacing: .06em; }
  .sl-barcode { display: flex; justify-content: center; }
  .sl-barcode svg { max-width: 100%; height: auto; }
  .sl-notes { font-size: 9pt; border: 0.3mm dashed #000; padding: 1.5mm 2mm; }

  .print-root { display: none; }
  @media print {
    .print-page { break-after: page; page-break-after: always; overflow: hidden; }
    .print-page:last-child { break-after: auto; page-break-after: auto; }
    .print-page.thermal { width: 100mm; height: 150mm; }
    .print-page.thermal .ship-label { border: 0; }
    .print-page.a4 { width: 210mm; height: 297mm; display: grid; grid-template-columns: 105mm 105mm; grid-template-rows: 148.5mm 148.5mm; }
    .print-page.a4 .ship-label { width: 105mm; height: 148.5mm; border: 0.2mm dashed #999; }
    .ship-label { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;
