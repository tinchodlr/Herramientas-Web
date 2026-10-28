import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { Download, ImageUp, Printer, Trash2 } from 'lucide-preact';
import { CopyButton, Field, Segmented, downloadText, useStoredState, type Lang } from './shared/ui';
import { qrSvg } from './shared/qr';
import {
  SIZE_MM, addressText, expandPackages, senderLine, whatsappLink,
  type Format, type LabelItem, type LabelSize, type Recipient, type Sender,
} from './shipping/model';
import { buildZpl } from './shipping/zpl';

const EMPTY_SENDER: Sender = { business: '', owner: '', street: '', barrio: '', city: '', cp: '', logo: '' };
const EMPTY_RECIPIENT: Recipient = { order: '', name: '', street: '', floor: '', barrio: '', city: '', cp: '', phone: '', notes: '', packages: '1' };
const EXAMPLE: Record<Lang, Recipient> = {
  es: { order: '00123', name: 'María González', street: 'Av. Rivadavia 1234', floor: '3 B', barrio: 'Caballito', city: 'CABA', cp: '1406', phone: '11 5555-1234', notes: 'Tocar timbre 2 veces', packages: '1' },
  en: { order: '00123', name: 'Mary Johnson', street: '742 Evergreen Terrace', floor: 'Apt 3B', barrio: 'Downtown', city: 'Springfield', cp: '62704', phone: '+1 555 555 1234', notes: 'Ring twice', packages: '1' },
};

const PREFS = { format: 'a4-8x14' as Format, pos: 1, zplSize: '10x15' as LabelSize, dpi: 203 };

const T = {
  es: {
    sender: 'Remitente',
    senderHint: 'Se guarda en este navegador para la próxima vez. Nada se sube a ningún servidor.',
    logo: 'Logo (opcional)',
    uploadLogo: 'Subir logo',
    removeLogo: 'Quitar',
    business: 'Nombre del negocio',
    owner: 'Titular / responsable',
    street: 'Calle y altura',
    barrio: 'Barrio',
    city: 'Localidad',
    cp: 'CP',
    recipient: 'Destinatario',
    single: 'Una etiqueta',
    bulk: 'Varias (pegar desde Excel)',
    order: 'Número de pedido / referencia',
    name: 'Nombre del destinatario',
    floor: 'Piso / depto / timbre',
    phone: 'Teléfono / WhatsApp',
    phoneHint: 'Se imprime un QR que abre el chat. Si no es de Argentina, escribilo con + y código de país.',
    notes: 'Indicaciones (opcional)',
    packages: 'Bultos',
    date: 'Fecha de envío',
    bulkHint:
      'Una fila por envío, con columnas separadas por tabulación (copiadas de Excel) o punto y coma, en este orden: Pedido; Nombre; Calle y altura; Piso/depto; Barrio; Localidad; CP; Teléfono; Indicaciones; Bultos.',
    format: 'Formato de impresión',
    formats: {
      'a4-8x14': 'A4 · 8×14 (3 por hoja)',
      'a4-10x15': 'A4 · 10×15 (2 por hoja)',
      'term-10x15': 'Térmica 10×15',
      'term-8x14': 'Térmica 8×14',
      zpl: 'ZPL (Zebra)',
    } as Record<Format, string>,
    position: 'Posición en la hoja',
    positionHint: 'Para aprovechar una hoja ya usada: la primera etiqueta sale en esa posición.',
    zplSize: 'Tamaño',
    dpi: 'DPI de la impresora',
    print: 'Imprimir',
    downloadZpl: 'Descargar ZPL',
    preview: 'Vista previa',
    labels: (n: number) => (n === 1 ? '1 etiqueta' : `${n} etiquetas`),
    sheets: (n: number) => (n === 1 ? '1 hoja' : `${n} hojas`),
    more: (n: number) => `y ${n} más al imprimir`,
    printTip: 'En el diálogo de impresión elegí escala 100 % (tamaño real) y desactivá encabezados y pies de página.',
    zplTip: 'Mandá el archivo a la impresora Zebra (por ejemplo, con Zebra Setup Utilities). Para revisarlo antes, pegá el código en el visor de labelary.com.',
    zplApprox: 'Vista aproximada: la impresora dibuja el ZPL con sus propias fuentes.',
    noLabels: 'Completá al menos el nombre del destinatario.',
    l: {
      order: 'Pedido',
      shipping: 'ENVÍO',
      pkg: 'BULTO',
      sender: 'Remitente',
      recipient: 'Destinatario',
      addrQr: 'Dirección (QR)',
      barrio: 'Barrio',
      city: 'Localidad',
      floor: 'Dpto/timbre',
      notes: 'Indicaciones',
      ref: 'Referencia',
      address: 'Dirección',
      waClient: 'WhatsApp del cliente',
      tel: 'Tel.',
    },
  },
  en: {
    sender: 'Sender',
    senderHint: 'Saved in this browser for next time. Nothing is uploaded to any server.',
    logo: 'Logo (optional)',
    uploadLogo: 'Upload logo',
    removeLogo: 'Remove',
    business: 'Business name',
    owner: 'Owner / contact person',
    street: 'Street and number',
    barrio: 'Neighborhood',
    city: 'City',
    cp: 'ZIP',
    recipient: 'Recipient',
    single: 'One label',
    bulk: 'Many (paste from Excel)',
    order: 'Order number / reference',
    name: 'Recipient name',
    floor: 'Apt / floor / buzzer',
    phone: 'Phone / WhatsApp',
    phoneHint: 'A QR that opens the chat is printed. Write it with + and the country code.',
    notes: 'Delivery notes (optional)',
    packages: 'Packages',
    date: 'Ship date',
    bulkHint:
      'One row per shipment, columns separated by tab (copied from Excel) or semicolon, in this order: Order; Name; Street; Apt/floor; Neighborhood; City; ZIP; Phone; Notes; Packages.',
    format: 'Print format',
    formats: {
      'a4-8x14': 'A4 · 8×14 cm (3 per sheet)',
      'a4-10x15': 'A4 · 4×6 in (2 per sheet)',
      'term-10x15': 'Thermal 4×6 in',
      'term-8x14': 'Thermal 8×14 cm',
      zpl: 'ZPL (Zebra)',
    } as Record<Format, string>,
    position: 'Position on the sheet',
    positionHint: 'To reuse a partly used sheet: the first label prints in that position.',
    zplSize: 'Size',
    dpi: 'Printer DPI',
    print: 'Print',
    downloadZpl: 'Download ZPL',
    preview: 'Preview',
    labels: (n: number) => (n === 1 ? '1 label' : `${n} labels`),
    sheets: (n: number) => (n === 1 ? '1 sheet' : `${n} sheets`),
    more: (n: number) => `and ${n} more when printing`,
    printTip: 'In the print dialog choose 100% scale (actual size) and turn off headers and footers.',
    zplTip: 'Send the file to your Zebra printer (for example with Zebra Setup Utilities). To check it first, paste the code into the labelary.com viewer.',
    zplApprox: 'Approximate preview: the printer renders ZPL with its own fonts.',
    noLabels: 'Fill in at least the recipient name.',
    l: {
      order: 'Order',
      shipping: 'SHIPPING',
      pkg: 'PACKAGE',
      sender: 'Sender',
      recipient: 'Recipient',
      addrQr: 'Address (QR)',
      barrio: 'Area',
      city: 'City',
      floor: 'Apt',
      notes: 'Notes',
      ref: 'Notes',
      address: 'Address',
      waClient: 'Customer WhatsApp',
      tel: 'Tel.',
    },
  },
};

type Words = (typeof T)['es']['l'];

const isA4 = (f: Format) => f === 'a4-8x14' || f === 'a4-10x15';
const sizeOf = (f: Format, zplSize: LabelSize): LabelSize => (f === 'zpl' ? zplSize : f.endsWith('8x14') ? '8x14' : '10x15');
const MM = 96 / 25.4;

export default function ShippingLabels({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [sender, setSender] = useStoredState<Sender>('shipping-sender', EMPTY_SENDER);
  const [prefs, setPrefs] = useStoredState('shipping-prefs', PREFS);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [rec, setRec] = useState<Recipient>(EXAMPLE[lang]);
  const [bulkText, setBulkText] = useState('');
  const [date, setDate] = useState('');
  const [printing, setPrinting] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => setDate(new Date().toLocaleDateString('sv')), []);

  const setS = (k: keyof Sender, v: string) => setSender((p) => ({ ...p, [k]: v }));
  const setR = (k: keyof Recipient, v: string) => setRec((p) => ({ ...p, [k]: v }));
  const setP = <K extends keyof typeof PREFS>(k: K, v: (typeof PREFS)[K]) => setPrefs((p) => ({ ...p, [k]: v }));

  const format = prefs.format;
  const size = sizeOf(format, prefs.zplSize);
  const perSheet = format === 'a4-8x14' ? 3 : 2;
  const pos = Math.min(prefs.pos, perSheet);
  const dateText = useMemo(() => {
    const [y, m, d] = date.split('-').map(Number);
    return y ? new Date(y, m - 1, d).toLocaleDateString(lang === 'es' ? 'es-AR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  }, [date, lang]);

  const recipients = useMemo<Recipient[]>(() => {
    if (mode === 'single') return rec.name.trim() ? [rec] : [];
    return bulkText
      .split(/\r?\n/)
      .map((line) => line.split(line.includes('\t') ? '\t' : ';').map((c) => c.trim()))
      .filter((c) => c.some(Boolean))
      .map(([order = '', name = '', street = '', floor = '', barrio = '', city = '', cp = '', phone = '', notes = '', packages = '1']) => ({
        order, name, street, floor, barrio, city, cp, phone, notes, packages,
      }))
      .filter((r) => r.name);
  }, [mode, rec, bulkText]);

  const items = useMemo(() => expandPackages(recipients), [recipients]);

  /** Hojas A4 con huecos al principio según la posición elegida. */
  const sheets = useMemo(() => {
    const slots: (LabelItem | null)[] = [...Array(pos - 1).fill(null), ...items];
    const out: (LabelItem | null)[][] = [];
    for (let i = 0; i < slots.length; i += perSheet) out.push(slots.slice(i, i + perSheet));
    return out;
  }, [items, pos, perSheet]);

  const zpl = useMemo(
    () => (format === 'zpl' && items.length ? buildZpl(items, sender, dateText, prefs.zplSize, prefs.dpi, lang, t.l) : ''),
    [format, items, sender, dateText, prefs.zplSize, prefs.dpi, lang],
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
    const [w, h] = SIZE_MM[size];
    const style = document.createElement('style');
    style.textContent = isA4(format) ? '@page { size: 297mm 210mm; margin: 0; }' : `@page { size: ${w}mm ${h}mm; margin: 0; }`;
    document.head.appendChild(style);
    document.body.classList.add('printing');
    // Un respiro para que el portal termine de dibujarse antes de abrir el diálogo.
    const id = setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing');
        style.remove();
        setPrinting(false);
      }, 300);
    }, 60);
    return () => clearTimeout(id);
  }, [printing]);

  const label = (item: LabelItem) =>
    isA4(format) ? <SheetLabel item={item} s={sender} date={dateText} size={size} lang={lang} w={t.l} /> : <ThermalLabel item={item} s={sender} date={dateText} size={size} lang={lang} w={t.l} />;

  const [lw, lh] = SIZE_MM[size];

  return (
    <div class="tool-layout">
      <div class="stack">
        <section class="panel">
          <h2 class="panel-title">{t.sender}</h2>
          <div class="stack">
            <div class="logo-row">
              <div class="logo-prev">{sender.logo ? <img src={sender.logo} alt="" /> : <ImageUp aria-hidden="true" />}</div>
              <div class="btn-row">
                <button type="button" class="btn btn-sm" onClick={() => logoInput.current?.click()}>
                  {t.uploadLogo}
                </button>
                {sender.logo && (
                  <button type="button" class="btn btn-sm btn-ghost btn-danger" onClick={() => setS('logo', '')}>
                    <Trash2 aria-hidden="true" />
                    {t.removeLogo}
                  </button>
                )}
              </div>
              <input
                ref={logoInput}
                type="file"
                accept="image/*"
                hidden
                aria-label={t.logo}
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0];
                  if (f) onLogo(f);
                  e.currentTarget.value = '';
                }}
              />
            </div>
            <div class="form-grid">
              <TextField id="s-business" label={t.business} value={sender.business} onInput={(v) => setS('business', v)} />
              <TextField id="s-owner" label={t.owner} value={sender.owner} onInput={(v) => setS('owner', v)} />
            </div>
            <TextField id="s-street" label={t.street} value={sender.street} onInput={(v) => setS('street', v)} />
            <div class="grid-3">
              <TextField id="s-barrio" label={t.barrio} value={sender.barrio} onInput={(v) => setS('barrio', v)} />
              <TextField id="s-city" label={t.city} value={sender.city} onInput={(v) => setS('city', v)} />
              <TextField id="s-cp" label={t.cp} value={sender.cp} onInput={(v) => setS('cp', v)} />
            </div>
            <span class="hint">{t.senderHint}</span>
          </div>
        </section>

        <section class="panel">
          <div class="panel-head-row">
            <h2 class="panel-title" style="margin:0">{t.recipient}</h2>
            <Segmented value={mode} onChange={setMode} options={[{ value: 'single', label: t.single }, { value: 'bulk', label: t.bulk }]} />
          </div>
          {mode === 'single' ? (
            <div class="stack">
              <div class="form-grid">
                <TextField id="r-order" label={t.order} value={rec.order} onInput={(v) => setR('order', v)} />
                <TextField id="r-name" label={t.name} value={rec.name} onInput={(v) => setR('name', v)} />
              </div>
              <div class="form-grid">
                <TextField id="r-street" label={t.street} value={rec.street} onInput={(v) => setR('street', v)} />
                <TextField id="r-floor" label={t.floor} value={rec.floor} onInput={(v) => setR('floor', v)} />
              </div>
              <div class="grid-3">
                <TextField id="r-barrio" label={t.barrio} value={rec.barrio} onInput={(v) => setR('barrio', v)} />
                <TextField id="r-city" label={t.city} value={rec.city} onInput={(v) => setR('city', v)} />
                <TextField id="r-cp" label={t.cp} value={rec.cp} onInput={(v) => setR('cp', v)} />
              </div>
              <div class="form-grid">
                <TextField id="r-phone" label={t.phone} value={rec.phone} onInput={(v) => setR('phone', v)} type="tel" hint={t.phoneHint} />
                <TextField id="r-notes" label={t.notes} value={rec.notes} onInput={(v) => setR('notes', v)} />
              </div>
              <div class="btn-row" style="justify-content:space-between">
                <div style="width:120px">
                  <TextField id="r-pk" label={t.packages} value={rec.packages} onInput={(v) => setR('packages', v)} type="number" />
                </div>
                <button type="button" class="btn btn-sm btn-ghost btn-danger" onClick={() => setRec(EMPTY_RECIPIENT)}>
                  <Trash2 aria-hidden="true" />
                  {lang === 'es' ? 'Vaciar' : 'Clear'}
                </button>
              </div>
            </div>
          ) : (
            <div class="stack">
              <span class="hint">{t.bulkHint}</span>
              <textarea
                class="textarea mono"
                rows={8}
                value={bulkText}
                onInput={(e) => setBulkText(e.currentTarget.value)}
                placeholder={'00124; Juan Pérez; Belgrano 450; PB; Centro; Morón; 1708; 1144440000; ; 1\n00125; Ana Ruiz; San Martín 99; 2 A; Nueva Córdoba; Córdoba; 5000; 3515550000; Portero 2A; 2'}
              />
            </div>
          )}
        </section>
      </div>

      <div class="stack sticky">
        <section class="panel stack">
          <div class="field">
            <span class="label">{t.format}</span>
            <div class="segmented">
              {(Object.keys(t.formats) as Format[]).map((f) => (
                <button type="button" key={f} aria-pressed={format === f} onClick={() => setP('format', f)}>
                  {t.formats[f]}
                </button>
              ))}
            </div>
          </div>

          <div class="form-grid">
            <Field label={t.date} htmlFor="ship-date">
              <input id="ship-date" class="input" type="date" value={date} onInput={(e) => setDate(e.currentTarget.value)} />
            </Field>
            {isA4(format) && (
              <Field label={t.position} htmlFor="ship-pos" hint={t.positionHint}>
                <select id="ship-pos" class="select" value={pos} onChange={(e) => setP('pos', Number(e.currentTarget.value))}>
                  {Array.from({ length: perSheet }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {format === 'zpl' && (
              <>
                <Field label={t.zplSize} htmlFor="zpl-size">
                  <select id="zpl-size" class="select" value={prefs.zplSize} onChange={(e) => setP('zplSize', e.currentTarget.value as LabelSize)}>
                    <option value="10x15">10×15 cm</option>
                    <option value="8x14">8×14 cm</option>
                  </select>
                </Field>
                <Field label={t.dpi} htmlFor="zpl-dpi">
                  <select id="zpl-dpi" class="select" value={prefs.dpi} onChange={(e) => setP('dpi', Number(e.currentTarget.value))}>
                    {[152, 203, 300, 600].map((d) => (
                      <option key={d} value={d}>
                        {d} dpi
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}
          </div>

          <div class="panel-head-row" style="margin:0">
            <span class="label">
              {t.preview} <span class="badge">{t.labels(items.length)}</span>
              {isA4(format) && items.length > 0 && <span class="badge" style="margin-left:4px">{t.sheets(sheets.length)}</span>}
            </span>
            {format === 'zpl' ? (
              <button type="button" class="btn btn-primary" disabled={!zpl} onClick={() => downloadText(zpl, `etiquetas-${date}-${prefs.zplSize}-${prefs.dpi}dpi.zpl`)}>
                <Download aria-hidden="true" />
                {t.downloadZpl}
              </button>
            ) : (
              <button type="button" class="btn btn-primary" disabled={!items.length} onClick={() => setPrinting(true)}>
                <Printer aria-hidden="true" />
                {t.print}
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p class="muted">{t.noLabels}</p>
          ) : isA4(format) ? (
            <Scaled widthMm={297} heightMm={210}>
              <Sheet slots={sheets[0]} size={size} render={label} />
            </Scaled>
          ) : (
            <div class="stack">
              {items.slice(0, 2).map((item, i) => (
                <Scaled key={i} widthMm={lw} heightMm={lh} max={1}>
                  <div class="lb-page" style={{ width: `${lw}mm`, height: `${lh}mm` }}>
                    {label(item)}
                  </div>
                </Scaled>
              ))}
              {items.length > 2 && <p class="hint">{t.more(items.length - 2)}</p>}
            </div>
          )}

          {format === 'zpl' && zpl && (
            <div class="stack" style="gap:8px">
              <span class="hint">{t.zplApprox}</span>
              <textarea class="textarea mono" rows={6} readOnly value={zpl} aria-label="ZPL" style="min-height:120px;font-size:12px" />
              <div class="btn-row">
                <CopyButton lang={lang} text={zpl} />
              </div>
              <span class="hint">{t.zplTip}</span>
            </div>
          )}
          {format !== 'zpl' && <span class="hint">{t.printTip}</span>}
        </section>
      </div>

      {printing &&
        createPortal(
          <div class="print-root">
            {isA4(format)
              ? sheets.map((slots, i) => <Sheet key={i} slots={slots} size={size} render={label} />)
              : items.map((item, i) => (
                  <div key={i} class="lb-page" style={{ width: `${lw}mm`, height: `${lh}mm` }}>
                    {label(item)}
                  </div>
                ))}
          </div>,
          document.body,
        )}

      <style>{CSS}</style>
    </div>
  );
}

function TextField(props: { id: string; label: string; value: string; onInput: (v: string) => void; type?: 'text' | 'tel' | 'number'; hint?: string }) {
  return (
    <Field label={props.label} htmlFor={props.id} hint={props.hint}>
      <input
        id={props.id}
        class="input"
        type="text"
        inputMode={props.type === 'number' ? 'numeric' : props.type === 'tel' ? 'tel' : undefined}
        value={props.value}
        onInput={(e) => props.onInput(e.currentTarget.value)}
      />
    </Field>
  );
}

/** Muestra un bloque en milímetros reales achicado para que entre en el ancho disponible. */
function Scaled({ widthMm, heightMm, max = 1, children }: { widthMm: number; heightMm: number; max?: number; children: ComponentChildren }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(Math.min(max, el.clientWidth / (widthMm * MM)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [widthMm, max]);
  return (
    <div ref={box} class="lb-scaled" style={{ height: `${heightMm * MM * scale}px` }}>
      <div style={{ width: `${widthMm}mm`, height: `${heightMm}mm`, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
    </div>
  );
}

function Sheet({ slots, size, render }: { slots: (LabelItem | null)[]; size: LabelSize; render: (item: LabelItem) => ComponentChildren }) {
  const [w, h] = SIZE_MM[size];
  const perSheet = size === '8x14' ? 3 : 2;
  const filled = [...slots, ...Array(perSheet - slots.length).fill(null)];
  return (
    <div class="lb-sheet lb-page">
      {filled.map((item, i) => (
        <div key={i} class={`lb-slot ${item ? '' : 'is-empty'}`} style={{ width: `${w}mm`, height: `${h}mm` }}>
          {item && render(item)}
        </div>
      ))}
    </div>
  );
}

interface LabelProps {
  item: LabelItem;
  s: Sender;
  date: string;
  size: LabelSize;
  lang: Lang;
  w: Words;
}

const Qr = ({ text, class: cls }: { text: string; class: string }) => <div class={cls} dangerouslySetInnerHTML={{ __html: qrSvg(text) }} />;

/** Plantilla para hoja A4 (diseño de plaquitas.online). */
function SheetLabel({ item: { r, n, total }, s, date, size, lang, w }: LabelProps) {
  const sl = senderLine(s);
  const wa = whatsappLink(r.phone);
  const area = [r.barrio && ['barrio', r.barrio], r.city && ['city', r.city]].filter(Boolean) as [keyof Words, string][];
  return (
    <div class={`lb lb-nl s${size}`}>
      <div class="h">
        <div class="logo">{s.logo ? <img src={s.logo} alt="" /> : <b>{s.business}</b>}</div>
        {r.order && (
          <div class="ped">
            {w.order}
            <br />
            <b>{r.order}</b>
          </div>
        )}
      </div>
      <div class="tag">
        <span>{total > 1 ? `${w.pkg} ${n}/${total}` : w.shipping}</span>
        <span>{date}</span>
      </div>
      {sl && (
        <div class="rem">
          <span class="rot">{w.sender}</span> {sl}
        </div>
      )}
      <div class="dv" />
      <div class="qr">
        <Qr class="qb" text={addressText(s, r, lang)} />
        <div class="cpx">
          {r.cp && (
            <div class="cp">
              CP <b>{r.cp}</b>
            </div>
          )}
          {r.barrio && <div class="bar">{r.barrio}</div>}
          {r.city && <div class="loc">{r.city}</div>}
          <div class="qh">← {w.addrQr}</div>
        </div>
      </div>
      <div class="dv" />
      <div class="dest">
        <span class="rot">{w.recipient}</span>
        <div class="dn">{r.name}</div>
        {(r.street || r.floor) && (
          <div class="dl">
            {r.street}
            {r.floor && ` · ${w.floor}: ${r.floor}`}
          </div>
        )}
        {area.length > 0 && (
          <div class="dl">
            {area.map(([k, v], i) => (
              <span key={k}>
                {i > 0 && '  ·  '}
                <b>{w[k]}:</b> {v}
              </span>
            ))}
          </div>
        )}
        {r.phone && (
          <div class="dl">
            {w.tel} {r.phone}
          </div>
        )}
      </div>
      {r.notes && (
        <div class="ind">
          <span class="rot">{w.notes}</span> {r.notes}
        </div>
      )}
      {wa && (
        <div class="wa">
          <Qr class="qb" text={wa} />
          <div class="wx">
            <b>{w.waClient}</b>
            <br />
            {r.phone}
          </div>
        </div>
      )}
    </div>
  );
}

/** Plantilla para impresora térmica (diseño de plaquitas.online, con el remitente completo). */
function ThermalLabel({ item: { r, n, total }, s, date, size, lang, w }: LabelProps) {
  const sl = senderLine(s);
  const wa = whatsappLink(r.phone);
  return (
    <div class={`lb lb-tl s${size}`}>
      <div class="sec">
        <div class="nm">
          {s.logo && <img src={s.logo} alt="" />}
          <b>{s.business}</b>
        </div>
        {r.order && (
          <div class="ped">
            {w.order} <b>{r.order}</b>
          </div>
        )}
        {sl && (
          <div class="sm">
            {w.sender}: {sl}
          </div>
        )}
      </div>
      <div class="row">
        <div>{total > 1 ? `${w.pkg} ${n}/${total}` : w.shipping}</div>
        <div>{date}</div>
      </div>
      <div class="qr">
        <Qr class="qb" text={addressText(s, r, lang)} />
        {r.cp && (
          <div class="cp">
            CP: <b>{r.cp}</b>
          </div>
        )}
        {(r.barrio || r.city) && <div class="bl">{[r.barrio, r.city].filter(Boolean).join(' · ')}</div>}
      </div>
      <div class="dest">
        {r.street && (
          <div>
            <span class="k">{w.address}:</span> {r.street}
          </div>
        )}
        {r.floor && (
          <div>
            <span class="k">{w.floor}:</span> {r.floor}
          </div>
        )}
        {r.notes && (
          <div>
            <span class="k">{w.ref}:</span> {r.notes}
          </div>
        )}
        <div class="dd">
          <span class="k">{w.recipient}:</span> <b>{r.name}</b>
        </div>
      </div>
      {wa && (
        <div class="wa">
          <Qr class="qb" text={wa} />
          <div class="wx">
            <b>{w.waClient}</b>
            <br />
            {r.phone}
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
  .panel-head-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  .grid-3 { display: grid; gap: 14px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  @media (max-width: 520px) { .grid-3 { grid-template-columns: 1fr 1fr; } }
  .logo-row { display: flex; align-items: center; gap: 12px; }
  .logo-prev {
    width: 56px; height: 56px; flex: none; display: grid; place-items: center; overflow: hidden;
    border: 1.5px dashed var(--border-strong); border-radius: 10px; background: #fff; color: #94a3b8;
  }
  .logo-prev img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .logo-prev svg { width: 22px; height: 22px; }
  .lb-scaled { width: 100%; overflow: hidden; }
  .lb-scaled > div { box-shadow: var(--shadow); }

  .lb-sheet { width: 297mm; height: 210mm; background: #fff; padding: 6mm; display: flex; gap: 5mm; align-items: flex-start; }
  .lb-slot { flex: none; }
  .lb-slot.is-empty { border: 1px dashed #d4d4d8; border-radius: 1mm; }
  .lb-page { background: #fff; overflow: hidden; }

  .lb { width: 100%; height: 100%; background: #fff; color: #111; font-family: Arial, Helvetica, sans-serif; overflow: hidden; line-height: 1.25; }
  .lb * { box-sizing: border-box; }
  .lb .qb svg { display: block; width: 100%; height: 100%; }
  .lb .rot { font-size: 7pt; color: #555; text-transform: uppercase; letter-spacing: .3px; display: block; }
  .lb .dv { border-top: 1px dashed #999; margin: 2mm 0; }
  .lb .wx { font-size: 9.5pt; line-height: 1.3; }
  .lb .wx b { font-size: 10pt; }

  .lb-nl { border: 1.5px solid #111; border-radius: 1mm; padding: 3.5mm 4mm; display: flex; flex-direction: column; }
  .lb-nl .h { display: flex; justify-content: space-between; align-items: center; gap: 3mm; }
  .lb-nl .logo { min-width: 0; }
  .lb-nl .logo img { max-height: 15mm; max-width: 46mm; object-fit: contain; display: block; }
  .lb-nl .logo b { font-size: 15pt; overflow-wrap: anywhere; }
  .lb-nl .ped { text-align: right; font-size: 7pt; line-height: 1.15; flex: none; }
  .lb-nl .ped b { font-size: 13.5pt; white-space: nowrap; }
  .lb-nl .tag { display: flex; border: 1.3px solid #111; border-radius: .6mm; margin-top: 2mm; font-weight: bold; }
  .lb-nl .tag span { flex: 1; text-align: center; padding: 1.4mm; font-size: 12pt; }
  .lb-nl .tag span:first-child { border-right: 1.3px solid #111; }
  .lb-nl .rem { font-size: 7.5pt; line-height: 1.3; margin-top: 2mm; }
  .lb-nl .rem .rot { display: inline; margin-right: 1mm; }
  .lb-nl .qr { display: flex; align-items: center; gap: 2.5mm; }
  .lb-nl .qr .qb { width: 30mm; height: 30mm; flex: none; }
  .lb-nl .cpx { min-width: 0; }
  .lb-nl .cpx .cp { font-size: 12pt; }
  .lb-nl .cpx .cp b { font-size: 22pt; }
  .lb-nl .cpx .bar { font-weight: bold; font-size: 16pt; line-height: 1.05; overflow-wrap: anywhere; }
  .lb-nl .cpx .loc { font-weight: bold; font-size: 13pt; }
  .lb-nl .cpx .qh { font-size: 7pt; color: #777; margin-top: 1mm; }
  .lb-nl .dest { margin-top: .5mm; }
  .lb-nl .dn { font-size: 17pt; font-weight: bold; line-height: 1.1; overflow-wrap: anywhere; }
  .lb-nl .dl { font-size: 11.5pt; line-height: 1.4; }
  .lb-nl .ind { margin-top: 2mm; font-size: 10pt; line-height: 1.3; }
  .lb-nl .ind .rot { margin-bottom: .3mm; }
  .lb-nl .wa { margin-top: auto; display: flex; align-items: center; gap: 2.5mm; border-top: 1px dashed #999; padding-top: 2mm; }
  .lb-nl .wa .qb { width: 16mm; height: 16mm; flex: none; }
  .lb-nl.s10x15 .qr .qb { width: 36mm; height: 36mm; }
  .lb-nl.s10x15 .dn { font-size: 19pt; }
  .lb-nl.s10x15 .wa .qb { width: 18mm; height: 18mm; }

  .lb-tl { border: 1.5px solid #111; display: flex; flex-direction: column; }
  .lb-tl .sec { padding: 2mm 3mm; border-bottom: 1.5px solid #111; }
  .lb-tl .nm { font-size: 13pt; font-weight: bold; display: flex; align-items: center; gap: 2mm; }
  .lb-tl .nm img { max-height: 9mm; max-width: 34mm; object-fit: contain; }
  .lb-tl .ped { font-size: 13pt; font-weight: bold; margin-top: .5mm; }
  .lb-tl .sm { font-size: 7.5pt; color: #333; margin-top: .5mm; line-height: 1.25; }
  .lb-tl .row { display: flex; border-bottom: 1.5px solid #111; }
  .lb-tl .row div { flex: 1; text-align: center; padding: 2mm; font-size: 15pt; font-weight: bold; }
  .lb-tl .row div:first-child { border-right: 1.5px solid #111; }
  .lb-tl .qr { text-align: center; padding: 2mm 0 1.5mm; border-bottom: 1.5px solid #111; }
  .lb-tl .qr .qb { width: 40mm; height: 40mm; margin: 0 auto; }
  .lb-tl .qr .cp { font-size: 12pt; margin-top: 1mm; }
  .lb-tl .qr .cp b { font-size: 26pt; }
  .lb-tl .qr .bl { font-size: 14pt; font-weight: bold; letter-spacing: .3px; }
  .lb-tl .dest { padding: 1.5mm 3mm; font-size: 10pt; line-height: 1.4; flex: 1; overflow: hidden; }
  .lb-tl .k { font-weight: bold; }
  .lb-tl .dd { margin-top: .5mm; font-size: 11.5pt; }
  .lb-tl .wa { display: flex; align-items: center; gap: 2.5mm; padding: 2mm 3mm; border-top: 1.5px solid #111; }
  .lb-tl .wa .qb { width: 15mm; height: 15mm; flex: none; }
  .lb-tl.s8x14 .qr .qb { width: 34mm; height: 34mm; }
  .lb-tl.s8x14 .row div { font-size: 13pt; }
  .lb-tl.s8x14 .qr .cp b { font-size: 22pt; }

  .print-root { display: none; }
  @media print {
    .print-root .lb-page { break-after: page; page-break-after: always; box-shadow: none; }
    .print-root .lb-page:last-child { break-after: auto; page-break-after: auto; }
    .print-root .lb-slot.is-empty { border: 0; }
    .lb { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;
