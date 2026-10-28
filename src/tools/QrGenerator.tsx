import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Download, ImageUp, Trash2, TriangleAlert } from 'lucide-preact';
import QRCode from 'qrcode';
import { Field, downloadBlob, downloadText, type Lang } from './shared/ui';

type Kind = 'url' | 'whatsapp' | 'wifi' | 'email' | 'phone' | 'vcard';
type Ecc = 'L' | 'M' | 'Q' | 'H';

const T = {
  es: {
    type: 'Tipo de QR',
    kinds: { url: 'Enlace o texto', whatsapp: 'WhatsApp', wifi: 'WiFi', email: 'Email', phone: 'Teléfono', vcard: 'Contacto' } as Record<Kind, string>,
    content: 'Enlace o texto',
    phone: 'Número con código de país',
    phoneHint: 'Ej.: 5491155551234 (54 = Argentina, 9 = celular).',
    message: 'Mensaje (opcional)',
    ssid: 'Nombre de la red (SSID)',
    password: 'Contraseña',
    security: 'Seguridad',
    noPass: 'Sin contraseña',
    hidden: 'Red oculta',
    to: 'Para',
    subject: 'Asunto',
    body: 'Mensaje',
    fullName: 'Nombre y apellido',
    org: 'Empresa',
    email: 'Email',
    web: 'Sitio web',
    design: 'Diseño',
    size: 'Tamaño',
    margin: 'Margen',
    fg: 'Color del código',
    bg: 'Fondo',
    ecc: 'Corrección de errores',
    eccHint: 'Más alta = se lee aunque esté dañado o tenga logo, pero el código es más denso.',
    logo: 'Logo en el centro',
    addLogo: 'Agregar logo',
    removeLogo: 'Quitar',
    png: 'Descargar PNG',
    svg: 'Descargar SVG',
    lowContrast: 'El código tiene poco contraste con el fondo: algunos celulares podrían no leerlo.',
    empty: 'Completá los datos para generar el código.',
    tooLong: 'El contenido es demasiado largo para un código QR.',
  },
  en: {
    type: 'QR type',
    kinds: { url: 'Link or text', whatsapp: 'WhatsApp', wifi: 'WiFi', email: 'Email', phone: 'Phone', vcard: 'Contact' } as Record<Kind, string>,
    content: 'Link or text',
    phone: 'Number with country code',
    phoneHint: 'E.g. 15551234567 (1 = USA).',
    message: 'Message (optional)',
    ssid: 'Network name (SSID)',
    password: 'Password',
    security: 'Security',
    noPass: 'No password',
    hidden: 'Hidden network',
    to: 'To',
    subject: 'Subject',
    body: 'Message',
    fullName: 'Full name',
    org: 'Company',
    email: 'Email',
    web: 'Website',
    design: 'Design',
    size: 'Size',
    margin: 'Margin',
    fg: 'Code color',
    bg: 'Background',
    ecc: 'Error correction',
    eccHint: 'Higher = readable even if damaged or with a logo, but the code gets denser.',
    logo: 'Center logo',
    addLogo: 'Add logo',
    removeLogo: 'Remove',
    png: 'Download PNG',
    svg: 'Download SVG',
    lowContrast: 'The code has low contrast with the background: some phones may not read it.',
    empty: 'Fill in the data to generate the code.',
    tooLong: 'The content is too long for a QR code.',
  },
};

const wifiEscape = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export default function QrGenerator({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [kind, setKind] = useState<Kind>('url');
  const [f, setF] = useState({
    url: 'https://',
    waPhone: '',
    waMsg: '',
    ssid: '',
    wifiPass: '',
    wifiSec: 'WPA',
    wifiHidden: false,
    mailTo: '',
    mailSubject: '',
    mailBody: '',
    tel: '',
    vName: '',
    vOrg: '',
    vPhone: '',
    vEmail: '',
    vUrl: '',
  });
  const [size, setSize] = useState(512);
  const [margin, setMargin] = useState(2);
  const [fg, setFg] = useState('#111111');
  const [bg, setBg] = useState('#ffffff');
  const [ecc, setEcc] = useState<Ecc>('M');
  const [logo, setLogo] = useState('');
  const [error, setError] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const text = useMemo(() => {
    switch (kind) {
      case 'url':
        return f.url.trim() === 'https://' ? '' : f.url.trim();
      case 'whatsapp': {
        const digits = f.waPhone.replace(/\D/g, '');
        if (!digits) return '';
        return `https://wa.me/${digits}${f.waMsg.trim() ? `?text=${encodeURIComponent(f.waMsg.trim())}` : ''}`;
      }
      case 'wifi':
        if (!f.ssid.trim()) return '';
        return `WIFI:T:${f.wifiSec === 'nopass' ? 'nopass' : f.wifiSec};S:${wifiEscape(f.ssid)};${f.wifiSec === 'nopass' ? '' : `P:${wifiEscape(f.wifiPass)};`}${f.wifiHidden ? 'H:true;' : ''};`;
      case 'email': {
        if (!f.mailTo.trim()) return '';
        const q = new URLSearchParams();
        if (f.mailSubject) q.set('subject', f.mailSubject);
        if (f.mailBody) q.set('body', f.mailBody);
        const qs = q.toString().replace(/\+/g, '%20');
        return `mailto:${f.mailTo.trim()}${qs ? `?${qs}` : ''}`;
      }
      case 'phone':
        return f.tel.replace(/[^\d+]/g, '') ? `tel:${f.tel.replace(/[^\d+]/g, '')}` : '';
      case 'vcard': {
        if (!f.vName.trim()) return '';
        const parts = f.vName.trim().split(/\s+/);
        const last = parts.length > 1 ? parts.pop()! : '';
        return [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `N:${last};${parts.join(' ')};;;`,
          `FN:${f.vName.trim()}`,
          f.vOrg && `ORG:${f.vOrg}`,
          f.vPhone && `TEL;TYPE=CELL:${f.vPhone}`,
          f.vEmail && `EMAIL:${f.vEmail}`,
          f.vUrl && `URL:${f.vUrl}`,
          'END:VCARD',
        ]
          .filter(Boolean)
          .join('\n');
      }
    }
  }, [kind, f]);

  const effectiveEcc: Ecc = logo ? 'H' : ecc;

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    if (!text) {
      el.getContext('2d')?.clearRect(0, 0, el.width, el.height);
      setError('');
      return;
    }
    QRCode.toCanvas(el, text, { width: size, margin, color: { dark: fg, light: bg }, errorCorrectionLevel: effectiveEcc })
      .then(async () => {
        setError('');
        if (!logo) return;
        const img = new Image();
        img.src = logo;
        await img.decode();
        const ctx = el.getContext('2d')!;
        const box = Math.round(el.width * 0.22);
        const x = (el.width - box) / 2;
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.roundRect(x - 6, x - 6, box + 12, box + 12, 12);
        ctx.fill();
        const scale = Math.min(box / img.width, box / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (el.width - w) / 2, (el.height - h) / 2, w, h);
      })
      .catch(() => setError(t.tooLong));
  }, [text, size, margin, fg, bg, effectiveEcc, logo]);

  const downloadPng = () => canvas.current?.toBlob((b) => b && downloadBlob(b, 'codigo-qr.png'), 'image/png');

  const downloadSvg = async () => {
    let svg = await QRCode.toString(text, { type: 'svg', width: size, margin, color: { dark: fg, light: bg }, errorCorrectionLevel: effectiveEcc });
    if (logo) {
      const vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
      const n = vb ? Number(vb[1]) : size;
      const box = n * 0.22;
      const x = (n - box) / 2;
      svg = svg.replace(
        '</svg>',
        `<rect x="${x - n * 0.012}" y="${x - n * 0.012}" width="${box + n * 0.024}" height="${box + n * 0.024}" rx="${n * 0.02}" fill="${bg}"/><image href="${logo}" x="${x}" y="${x}" width="${box}" height="${box}" preserveAspectRatio="xMidYMid meet"/></svg>`,
      );
    }
    downloadText(svg, 'codigo-qr.svg', 'image/svg+xml');
  };

  const lowContrast = (() => {
    const [a, b] = [luminance(fg), luminance(bg)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) < 3 || a > b;
  })();

  const input = (k: keyof typeof f, label: string, props: Record<string, unknown> = {}) => (
    <Field label={label} htmlFor={`qr-${k}`}>
      <input id={`qr-${k}`} class="input" value={f[k] as string} onInput={(e) => set(k, e.currentTarget.value)} {...props} />
    </Field>
  );

  return (
    <div class="tool-layout wide-left">
      <div class="stack">
        <section class="panel">
          <h2 class="panel-title">{t.type}</h2>
          <div class="stack">
            <div class="segmented">
              {(Object.keys(t.kinds) as Kind[]).map((k) => (
                <button type="button" key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>
                  {t.kinds[k]}
                </button>
              ))}
            </div>

            {kind === 'url' && (
              <Field label={t.content} htmlFor="qr-url">
                <textarea id="qr-url" class="textarea" rows={3} style="min-height:90px" value={f.url} onInput={(e) => set('url', e.currentTarget.value)} />
              </Field>
            )}
            {kind === 'whatsapp' && (
              <>
                <Field label={t.phone} htmlFor="qr-waPhone" hint={t.phoneHint}>
                  <input id="qr-waPhone" class="input" type="tel" value={f.waPhone} onInput={(e) => set('waPhone', e.currentTarget.value)} />
                </Field>
                <Field label={t.message} htmlFor="qr-waMsg">
                  <textarea id="qr-waMsg" class="textarea" rows={3} style="min-height:90px" value={f.waMsg} onInput={(e) => set('waMsg', e.currentTarget.value)} />
                </Field>
              </>
            )}
            {kind === 'wifi' && (
              <>
                <div class="form-grid">
                  {input('ssid', t.ssid)}
                  <Field label={t.security} htmlFor="qr-sec">
                    <select id="qr-sec" class="select" value={f.wifiSec} onChange={(e) => set('wifiSec', e.currentTarget.value)}>
                      <option value="WPA">WPA / WPA2 / WPA3</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">{t.noPass}</option>
                    </select>
                  </Field>
                </div>
                {f.wifiSec !== 'nopass' && input('wifiPass', t.password)}
                <label class="check">
                  <input type="checkbox" checked={f.wifiHidden} onChange={(e) => set('wifiHidden', e.currentTarget.checked)} />
                  {t.hidden}
                </label>
              </>
            )}
            {kind === 'email' && (
              <>
                {input('mailTo', t.to, { type: 'email' })}
                {input('mailSubject', t.subject)}
                <Field label={t.body} htmlFor="qr-mailBody">
                  <textarea id="qr-mailBody" class="textarea" rows={3} style="min-height:90px" value={f.mailBody} onInput={(e) => set('mailBody', e.currentTarget.value)} />
                </Field>
              </>
            )}
            {kind === 'phone' && input('tel', t.phone, { type: 'tel' })}
            {kind === 'vcard' && (
              <div class="form-grid">
                {input('vName', t.fullName)}
                {input('vOrg', t.org)}
                {input('vPhone', t.phone, { type: 'tel' })}
                {input('vEmail', t.email, { type: 'email' })}
                {input('vUrl', t.web, { type: 'url' })}
              </div>
            )}
          </div>
        </section>

        <section class="panel">
          <h2 class="panel-title">{t.design}</h2>
          <div class="stack">
            <div class="form-grid">
              <Field label={`${t.size}: ${size} px`} htmlFor="qr-size">
                <input id="qr-size" type="range" min={128} max={2048} step={64} value={size} onInput={(e) => setSize(Number(e.currentTarget.value))} />
              </Field>
              <Field label={`${t.margin}: ${margin}`} htmlFor="qr-margin">
                <input id="qr-margin" type="range" min={0} max={8} value={margin} onInput={(e) => setMargin(Number(e.currentTarget.value))} />
              </Field>
            </div>
            <div class="form-grid">
              <Field label={t.fg} htmlFor="qr-fg">
                <div class="color-row">
                  <input id="qr-fg" type="color" value={fg} onInput={(e) => setFg(e.currentTarget.value)} />
                  <span class="mono muted">{fg}</span>
                </div>
              </Field>
              <Field label={t.bg} htmlFor="qr-bg">
                <div class="color-row">
                  <input id="qr-bg" type="color" value={bg} onInput={(e) => setBg(e.currentTarget.value)} />
                  <span class="mono muted">{bg}</span>
                </div>
              </Field>
              <Field label={t.ecc} htmlFor="qr-ecc" hint={t.eccHint}>
                <select id="qr-ecc" class="select" value={effectiveEcc} disabled={!!logo} onChange={(e) => setEcc(e.currentTarget.value as Ecc)}>
                  <option value="L">L · 7 %</option>
                  <option value="M">M · 15 %</option>
                  <option value="Q">Q · 25 %</option>
                  <option value="H">H · 30 %</option>
                </select>
              </Field>
            </div>
            <div class="field">
              <span class="label">{t.logo}</span>
              <div class="btn-row">
                {logo && <img src={logo} alt="" style="height:40px;width:40px;object-fit:contain;border-radius:8px;border:1px solid var(--border);background:#fff" />}
                <button type="button" class="btn btn-sm" onClick={() => logoInput.current?.click()}>
                  <ImageUp aria-hidden="true" />
                  {t.addLogo}
                </button>
                {logo && (
                  <button type="button" class="btn btn-sm btn-ghost btn-danger" onClick={() => setLogo('')}>
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
                    const file = e.currentTarget.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setLogo(String(reader.result));
                    reader.readAsDataURL(file);
                    e.currentTarget.value = '';
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="stack sticky">
        <section class="panel qr-out">
          <div class="qr-canvas-wrap" style={{ background: text ? bg : undefined }}>
            <canvas ref={canvas} hidden={!text || !!error} />
            {!text && <p class="muted small">{t.empty}</p>}
            {error && <p class="negative small">{error}</p>}
          </div>
          {text && !error && lowContrast && (
            <div class="alert alert-warning">
              <TriangleAlert aria-hidden="true" />
              <span>{t.lowContrast}</span>
            </div>
          )}
          <div class="btn-row qr-actions">
            <button type="button" class="btn btn-primary" disabled={!text || !!error} onClick={downloadPng}>
              <Download aria-hidden="true" />
              {t.png}
            </button>
            <button type="button" class="btn" disabled={!text || !!error} onClick={downloadSvg}>
              <Download aria-hidden="true" />
              {t.svg}
            </button>
          </div>
        </section>
      </div>

      <style>{`
        .color-row { display: flex; align-items: center; gap: 10px; }
        .qr-out { display: flex; flex-direction: column; gap: 14px; }
        .qr-canvas-wrap {
          display: grid; place-items: center; aspect-ratio: 1; border-radius: 14px;
          background: var(--surface-2); padding: 16px; overflow: hidden; text-align: center;
        }
        .qr-canvas-wrap canvas { width: 100% !important; height: auto !important; max-width: 420px; image-rendering: pixelated; }
        .qr-actions .btn { flex: 1; }
      `}</style>
    </div>
  );
}
