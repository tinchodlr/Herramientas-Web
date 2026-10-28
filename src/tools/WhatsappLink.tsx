import { useMemo, useState } from 'preact/hooks';
import { Download, ExternalLink } from 'lucide-preact';
import { CopyButton, Field, downloadBlob, type Lang } from './shared/ui';
import { qrMatrix, qrSvg } from './shared/qr';

const T = {
  es: {
    country: 'País',
    phone: 'Número de WhatsApp',
    phoneHint: 'Con código de área, sin 0 ni 15. También podés poner + y el código de país completo.',
    message: 'Mensaje (opcional)',
    messageHint: 'Aparece escrito en el chat cuando la persona abre el link.',
    templates: 'Plantillas',
    templateList: [
      ['Consulta por un producto', 'Hola! Quería consultar por este producto: '],
      ['Hacer un pedido', 'Hola! Quiero hacer un pedido.'],
      ['Consultar un envío', 'Hola! Quería consultar por el estado de mi envío. Mi número de pedido es: '],
      ['Pedir un presupuesto', 'Hola! Necesito un presupuesto para: '],
    ] as [string, string][],
    link: 'Tu link',
    open: 'Probar el link',
    alt: 'Link alternativo',
    altHint: 'Funciona igual, pero muestra una pantalla intermedia.',
    html: 'Botón para tu web (HTML)',
    qr: 'Código QR',
    png: 'PNG',
    svg: 'SVG',
    invalid: 'El número no parece completo. Revisá que tenga código de área.',
    fix: 'Número usado:',
    buttonText: 'Escribinos por WhatsApp',
    empty: 'Escribí un número para generar el link.',
  },
  en: {
    country: 'Country',
    phone: 'WhatsApp number',
    phoneHint: 'With area code, no leading 0. You can also use + and the full country code.',
    message: 'Message (optional)',
    messageHint: 'It shows up typed in the chat when the person opens the link.',
    templates: 'Templates',
    templateList: [
      ['Ask about a product', 'Hi! I wanted to ask about this product: '],
      ['Place an order', 'Hi! I would like to place an order.'],
      ['Ask about a shipment', 'Hi! I wanted to ask about my shipment. My order number is: '],
      ['Request a quote', 'Hi! I need a quote for: '],
    ] as [string, string][],
    link: 'Your link',
    open: 'Test the link',
    alt: 'Alternative link',
    altHint: 'It works the same, but shows an intermediate screen.',
    html: 'Button for your website (HTML)',
    qr: 'QR code',
    png: 'PNG',
    svg: 'SVG',
    invalid: 'The number does not look complete. Check that it includes the area code.',
    fix: 'Number used:',
    buttonText: 'Message us on WhatsApp',
    empty: 'Type a number to generate the link.',
  },
};

const COUNTRIES: { code: string; name: { es: string; en: string } }[] = [
  { code: '54', name: { es: 'Argentina (+54)', en: 'Argentina (+54)' } },
  { code: '598', name: { es: 'Uruguay (+598)', en: 'Uruguay (+598)' } },
  { code: '56', name: { es: 'Chile (+56)', en: 'Chile (+56)' } },
  { code: '595', name: { es: 'Paraguay (+595)', en: 'Paraguay (+595)' } },
  { code: '591', name: { es: 'Bolivia (+591)', en: 'Bolivia (+591)' } },
  { code: '55', name: { es: 'Brasil (+55)', en: 'Brazil (+55)' } },
  { code: '57', name: { es: 'Colombia (+57)', en: 'Colombia (+57)' } },
  { code: '52', name: { es: 'México (+52)', en: 'Mexico (+52)' } },
  { code: '51', name: { es: 'Perú (+51)', en: 'Peru (+51)' } },
  { code: '58', name: { es: 'Venezuela (+58)', en: 'Venezuela (+58)' } },
  { code: '593', name: { es: 'Ecuador (+593)', en: 'Ecuador (+593)' } },
  { code: '34', name: { es: 'España (+34)', en: 'Spain (+34)' } },
  { code: '1', name: { es: 'Estados Unidos / Canadá (+1)', en: 'United States / Canada (+1)' } },
];

/**
 * Arma el número en formato internacional que pide wa.me (solo dígitos).
 * Argentina: celular = 54 + 9 + área + número, sin el 0 inicial ni el 15.
 */
export function internationalNumber(raw: string, country: string) {
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return { number: '', ok: false };
  if (trimmed.startsWith('+') || digits.startsWith('00')) {
    digits = digits.replace(/^00/, '');
    return { number: digits, ok: digits.length >= 8 && digits.length <= 15 };
  }
  if (country !== '54') {
    digits = digits.replace(/^0+/, '');
    if (digits.startsWith(country) && digits.length > 10) digits = digits.slice(country.length);
    const number = country + digits;
    return { number, ok: number.length >= 9 && number.length <= 15 };
  }
  digits = digits.replace(/^0+/, '');
  if (digits.startsWith('549')) digits = digits.slice(3);
  else if (digits.startsWith('54') && digits.length > 10) digits = digits.slice(2);
  if (digits.length === 12) {
    // Área + 15 + número: se saca el 15 (el área tiene 2, 3 o 4 números).
    for (const area of [2, 3, 4]) {
      if (digits.slice(area, area + 2) === '15' && digits.length - 2 === 10) {
        digits = digits.slice(0, area) + digits.slice(area + 2);
        break;
      }
    }
  }
  return { number: `549${digits}`, ok: digits.length === 10 };
}

function qrPng(link: string, scale = 10) {
  const { size, data } = qrMatrix(link);
  const margin = 4;
  const px = (size + margin * 2) * scale;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = '#000';
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[y * size + x]) ctx.fillRect((x + margin) * scale, (y + margin) * scale, scale, scale);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export default function WhatsappLink({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [country, setCountry] = useState('54');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const { number, ok } = useMemo(() => internationalNumber(phone, country), [phone, country]);
  const text = message.trim() ? `?text=${encodeURIComponent(message.trim())}` : '';
  const link = number ? `https://wa.me/${number}${text}` : '';
  const alt = number ? `https://api.whatsapp.com/send?phone=${number}${message.trim() ? `&text=${encodeURIComponent(message.trim())}` : ''}` : '';
  const html = link ? `<a href="${link}" target="_blank" rel="noopener">${t.buttonText}</a>` : '';

  return (
    <div class="tool-layout">
      <section class="panel stack">
        <Field label={t.country} htmlFor="wa-country">
          <select id="wa-country" class="select" value={country} onChange={(e) => setCountry(e.currentTarget.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name[lang]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.phone} htmlFor="wa-phone" hint={t.phoneHint}>
          <input id="wa-phone" class="input" type="tel" inputMode="tel" placeholder={country === '54' ? '11 2345-6789' : ''} value={phone} onInput={(e) => setPhone(e.currentTarget.value)} />
        </Field>
        <Field label={t.message} htmlFor="wa-msg" hint={t.messageHint}>
          <textarea id="wa-msg" class="textarea" rows={4} value={message} onInput={(e) => setMessage(e.currentTarget.value)} />
        </Field>
        <div class="field">
          <span class="label">{t.templates}</span>
          <div class="btn-row">
            {t.templateList.map(([label, body]) => (
              <button type="button" key={label} class="btn btn-sm" onClick={() => setMessage(body)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section class="panel stack">
        {!link ? (
          <span class="muted">{t.empty}</span>
        ) : (
          <>
            {!ok && <div class="alert alert-warning">{t.invalid}</div>}
            <div class="field">
              <span class="label">{t.link}</span>
              <div class="output mono wa-out">{link}</div>
              <span class="hint">
                {t.fix} +{number}
              </span>
            </div>
            <div class="btn-row">
              <CopyButton lang={lang} class="btn btn-primary" text={link} />
              <a class="btn" href={link} target="_blank" rel="noopener">
                <ExternalLink aria-hidden="true" />
                {t.open}
              </a>
            </div>

            <div class="field">
              <span class="label">{t.qr}</span>
              <div class="wa-qr" dangerouslySetInnerHTML={{ __html: qrSvg(link) }} />
              <div class="btn-row">
                <button
                  type="button"
                  class="btn btn-sm"
                  onClick={async () => {
                    const b = await qrPng(link);
                    if (b) downloadBlob(b, 'whatsapp-qr.png');
                  }}
                >
                  <Download aria-hidden="true" />
                  {t.png}
                </button>
                <button type="button" class="btn btn-sm" onClick={() => downloadBlob(new Blob([qrSvg(link).replace('width="100%" height="100%"', 'width="512" height="512"')], { type: 'image/svg+xml' }), 'whatsapp-qr.svg')}>
                  <Download aria-hidden="true" />
                  {t.svg}
                </button>
              </div>
            </div>

            <div class="field">
              <span class="label">{t.html}</span>
              <div class="output mono wa-out">{html}</div>
              <div>
                <CopyButton lang={lang} text={html} />
              </div>
            </div>

            <div class="field">
              <span class="label">{t.alt}</span>
              <div class="output mono wa-out">{alt}</div>
              <span class="hint">{t.altHint}</span>
              <div>
                <CopyButton lang={lang} text={alt} />
              </div>
            </div>
          </>
        )}
      </section>

      <style>{`
        .wa-out { word-break: break-all; }
        .wa-qr { width: 180px; height: 180px; padding: 10px; background: #fff; border: 1px solid var(--border); border-radius: 10px; }
      `}</style>
    </div>
  );
}
