import { useMemo, useState } from 'preact/hooks';
import { CircleCheck, Lightbulb, TriangleAlert } from 'lucide-preact';
import { CopyButton, Field, Segmented, type Lang } from './shared/ui';
import { ML_TITLE_MAX, buildTitles, findPromo, reviewTitle, type CaseStyle } from '../lib/mlTitle';

const T = {
  es: {
    build: 'Armar título',
    review: 'Revisar títulos',
    product: 'Producto',
    productPh: 'Zapatillas running',
    brand: 'Marca',
    brandPh: 'Nike',
    model: 'Modelo',
    modelPh: 'Air Zoom Pegasus 40',
    attrs: 'Características',
    attrsPh: 'Hombre, Negro, Talle 42, Pack x2',
    attrsHint: 'Separadas por coma, de la más a la menos importante: si no entran, se van quitando desde el final.',
    caseStyle: 'Mayúsculas',
    title: 'Tipo título',
    sentence: 'Solo la primera',
    asis: 'Como lo escribí',
    options: 'Opciones de título',
    chars: (n: number) => `${n} / ${ML_TITLE_MAX}`,
    empty: 'Completá al menos el producto para ver las opciones.',
    promoRemoved: (list: string) => `Se sacaron palabras promocionales: ${list}.`,
    dropped: (n: number) => (n === 1 ? 'Se dejó afuera 1 característica para que entre.' : `Se dejaron afuera ${n} características para que entre.`),
    variant: { product: 'Producto primero', brand: 'Marca primero', 'attrs-first': 'Con característica clave adelante' } as Record<string, string>,
    pasteLabel: 'Tus títulos',
    pasteHint: 'Uno por línea.',
    pastePh: 'ZAPATILLAS NIKE !!! OFERTA ENVÍO GRATIS Nike Running Hombre',
    ok: 'Se ve bien',
    fixedTitle: 'Versión corregida',
    problem: {
      long: 'Pasa el límite de 60 caracteres',
      caps: 'Tiene muchas palabras en mayúsculas',
      promo: 'Tiene palabras promocionales',
      symbols: 'Tiene símbolos o emojis',
      repeated: 'Repite palabras',
      spaces: 'Tiene espacios de más',
    } as Record<string, string>,
    tipsTitle: 'Para que un título funcione mejor',
    tips: [
      'Seguí este orden: producto + marca + modelo + característica principal (color, medida, cantidad).',
      'Poné adelante lo que la gente realmente busca; lo que no entre es lo primero que sobra.',
      'No uses mayúsculas en todo, signos ni emojis, ni palabras como “oferta” o “envío gratis”: no describen el producto.',
      'No repitas palabras ni agregues marcas que no corresponden al producto.',
      'Las reglas de Mercado Libre pueden cambiar: confirmá las de tu categoría al publicar.',
    ],
  },
  en: {
    build: 'Build a title',
    review: 'Review titles',
    product: 'Product',
    productPh: 'Running shoes',
    brand: 'Brand',
    brandPh: 'Nike',
    model: 'Model',
    modelPh: 'Air Zoom Pegasus 40',
    attrs: 'Features',
    attrsPh: 'Men, Black, Size 42, Pack x2',
    attrsHint: 'Comma-separated, most to least important: if they do not fit, they are removed from the end.',
    caseStyle: 'Capitalization',
    title: 'Title Case',
    sentence: 'First word only',
    asis: 'As I typed it',
    options: 'Title options',
    chars: (n: number) => `${n} / ${ML_TITLE_MAX}`,
    empty: 'Fill in at least the product to see the options.',
    promoRemoved: (list: string) => `Promotional words were removed: ${list}.`,
    dropped: (n: number) => (n === 1 ? '1 feature was left out so it fits.' : `${n} features were left out so it fits.`),
    variant: { product: 'Product first', brand: 'Brand first', 'attrs-first': 'Key feature up front' } as Record<string, string>,
    pasteLabel: 'Your titles',
    pasteHint: 'One per line.',
    pastePh: 'NIKE SHOES !!! SALE FREE SHIPPING Nike Running Men',
    ok: 'Looks good',
    fixedTitle: 'Corrected version',
    problem: {
      long: 'It goes over the 60 character limit',
      caps: 'It has many words in capitals',
      promo: 'It has promotional words',
      symbols: 'It has symbols or emoji',
      repeated: 'It repeats words',
      spaces: 'It has extra spaces',
    } as Record<string, string>,
    tipsTitle: 'To make a title work better',
    tips: [
      'Follow this order: product + brand + model + main feature (color, size, quantity).',
      'Put up front what people really search for; what does not fit is the first thing to drop.',
      'Do not use all caps, symbols or emoji, or words like “sale” or “free shipping”: they do not describe the product.',
      'Do not repeat words or add brands that do not belong to the product.',
      'Mercado Libre rules can change: confirm the ones for your category when you publish.',
    ],
  },
};

function Counter({ n, label }: { n: number; label: string }) {
  const cls = n > ML_TITLE_MAX ? 'badge badge-danger' : n >= 50 ? 'badge badge-success' : 'badge';
  return <span class={cls}>{label}</span>;
}

export default function MlTitleGenerator({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [mode, setMode] = useState<'build' | 'review'>('build');
  const [product, setProduct] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [attrs, setAttrs] = useState('');
  const [style, setStyle] = useState<CaseStyle>('title');
  const [pasted, setPasted] = useState('');

  const promoInputs = useMemo(() => [...new Set([product, brand, model, attrs].flatMap(findPromo))], [product, brand, model, attrs]);
  const titles = useMemo(
    () => buildTitles({ product, brand, model, attributes: attrs.split(',').map((a) => a.trim()).filter(Boolean), style }),
    [product, brand, model, attrs, style],
  );
  const reviews = useMemo(
    () =>
      pasted
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map(reviewTitle),
    [pasted],
  );

  return (
    <div class="stack-lg">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'build', label: t.build },
          { value: 'review', label: t.review },
        ]}
      />

      {mode === 'build' ? (
        <div class="tool-layout">
          <section class="panel stack">
            <Field label={t.product} htmlFor="mt-product">
              <input id="mt-product" class="input" placeholder={t.productPh} value={product} onInput={(e) => setProduct(e.currentTarget.value)} />
            </Field>
            <div class="form-grid">
              <Field label={t.brand} htmlFor="mt-brand">
                <input id="mt-brand" class="input" placeholder={t.brandPh} value={brand} onInput={(e) => setBrand(e.currentTarget.value)} />
              </Field>
              <Field label={t.model} htmlFor="mt-model">
                <input id="mt-model" class="input" placeholder={t.modelPh} value={model} onInput={(e) => setModel(e.currentTarget.value)} />
              </Field>
            </div>
            <Field label={t.attrs} htmlFor="mt-attrs" hint={t.attrsHint}>
              <input id="mt-attrs" class="input" placeholder={t.attrsPh} value={attrs} onInput={(e) => setAttrs(e.currentTarget.value)} />
            </Field>
            <div class="field">
              <span class="label">{t.caseStyle}</span>
              <Segmented
                value={style}
                onChange={setStyle}
                options={[
                  { value: 'title', label: t.title },
                  { value: 'sentence', label: t.sentence },
                  { value: 'asis', label: t.asis },
                ]}
              />
            </div>
          </section>

          <section class="panel stack">
            <span class="label">{t.options}</span>
            {titles.length === 0 ? (
              <span class="muted">{t.empty}</span>
            ) : (
              titles.map((x) => (
                <div class="mt-option" key={x.id}>
                  <div class="mt-head">
                    <span class="small muted">{t.variant[x.id]}</span>
                    <Counter n={x.title.length} label={t.chars(x.title.length)} />
                  </div>
                  <div class="mt-title">{x.title}</div>
                  {x.dropped > 0 && <span class="hint">{t.dropped(x.dropped)}</span>}
                  <div>
                    <CopyButton lang={lang} text={x.title} />
                  </div>
                </div>
              ))
            )}
            {promoInputs.length > 0 && <div class="alert alert-warning">{t.promoRemoved(promoInputs.join(', '))}</div>}
          </section>
        </div>
      ) : (
        <div class="tool-layout">
          <section class="panel stack">
            <Field label={t.pasteLabel} htmlFor="mt-paste" hint={t.pasteHint}>
              <textarea id="mt-paste" class="textarea" rows={8} placeholder={t.pastePh} value={pasted} onInput={(e) => setPasted(e.currentTarget.value)} />
            </Field>
          </section>
          <section class="panel stack">
            {reviews.length === 0 && <span class="muted">{t.pastePh}</span>}
            {reviews.map((r, i) => (
              <div class="mt-option" key={i}>
                <div class="mt-head">
                  <span class="small muted">#{i + 1}</span>
                  <Counter n={r.length} label={t.chars(r.length)} />
                </div>
                <div class="mt-title">{r.title}</div>
                {r.problems.length === 0 ? (
                  <div class="mt-ok">
                    <CircleCheck aria-hidden="true" />
                    {t.ok}
                  </div>
                ) : (
                  <ul class="mt-problems">
                    {r.problems.map((p) => (
                      <li key={p}>
                        <TriangleAlert aria-hidden="true" />
                        <span>
                          {t.problem[p]}
                          {p === 'promo' && `: ${r.promo.join(', ')}`}
                          {p === 'repeated' && `: ${r.repeated.join(', ')}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {r.problems.length > 0 && r.fixed && (
                  <div class="mt-fixed">
                    <span class="small muted">{t.fixedTitle} · {t.chars(r.fixed.length)}</span>
                    <div class="mt-title">{r.fixed}</div>
                    <div>
                      <CopyButton lang={lang} text={r.fixed} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>
        </div>
      )}

      <section class="panel">
        <h2 class="panel-title">
          <Lightbulb aria-hidden="true" style="width:18px;height:18px;vertical-align:-3px;margin-right:6px" />
          {t.tipsTitle}
        </h2>
        <ul class="mt-tips">
          {t.tips.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>

      <style>{`
        .mt-option { display: grid; gap: 8px; padding: 14px; border: 1px solid var(--border); border-radius: 12px; }
        .mt-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .mt-title { font-size: 1.05rem; font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; }
        .mt-ok { display: flex; gap: 8px; align-items: center; color: #16a34a; font-weight: 500; }
        .mt-ok svg, .mt-problems svg { width: 18px; height: 18px; flex: none; }
        .mt-problems { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
        .mt-problems li { display: flex; gap: 8px; align-items: flex-start; color: #b45309; font-size: .92rem; }
        .mt-fixed { display: grid; gap: 6px; padding-top: 10px; border-top: 1px dashed var(--border-strong); }
        .mt-tips { margin: 0; padding-left: 20px; display: grid; gap: 6px; }
      `}</style>
    </div>
  );
}
