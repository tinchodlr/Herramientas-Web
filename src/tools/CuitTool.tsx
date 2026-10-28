import { useMemo, useState } from 'preact/hooks';
import { CircleCheck, CircleX, Info } from 'lucide-preact';
import { CopyButton, Field, Segmented, type Lang } from './shared/ui';

const T = {
  es: {
    validate: 'Validar',
    calculate: 'Calcular',
    inputLabel: 'CUIT / CUIL',
    inputHint: 'Pegá uno o varios (uno por línea). Con o sin guiones.',
    placeholder: '20-12345678-6',
    valid: 'Válido',
    invalid: 'Dígito verificador incorrecto',
    badLength: 'Tiene que tener 11 números',
    unknownPrefix: 'El prefijo no es uno de los usuales (20, 23, 24, 27, 30, 33, 34)',
    expected: (dv: number) => `El último dígito debería ser ${dv}`,
    person: 'Persona humana',
    company: 'Persona jurídica',
    doc: 'DNI / N° de documento',
    summary: (ok: number, total: number) => `${ok} de ${total} válidos`,
    dni: 'DNI',
    dniHint: 'Sin puntos. Si tiene menos de 8 números se completa con ceros.',
    kind: 'Tipo',
    male: 'Hombre',
    female: 'Mujer',
    legal: 'Empresa',
    result: 'Resultado',
    noResult: 'Ese DNI no genera un número válido con ese prefijo (probá con otro tipo).',
    note: 'Un CUIT/CUIL con el dígito verificador correcto es solo un número bien formado: no confirma que la persona o empresa esté inscripta. Para eso consultá la constancia de inscripción en ARCA.',
    prefixPick: 'Prefijo',
  },
  en: {
    validate: 'Validate',
    calculate: 'Calculate',
    inputLabel: 'CUIT / CUIL',
    inputHint: 'Paste one or many (one per line). With or without hyphens.',
    placeholder: '20-12345678-6',
    valid: 'Valid',
    invalid: 'Wrong check digit',
    badLength: 'It must have 11 digits',
    unknownPrefix: 'The prefix is not one of the usual ones (20, 23, 24, 27, 30, 33, 34)',
    expected: (dv: number) => `The last digit should be ${dv}`,
    person: 'Individual',
    company: 'Legal entity',
    doc: 'ID number (DNI)',
    summary: (ok: number, total: number) => `${ok} of ${total} valid`,
    dni: 'ID number (DNI)',
    dniHint: 'No dots. If it has fewer than 8 digits it is padded with zeros.',
    kind: 'Type',
    male: 'Male',
    female: 'Female',
    legal: 'Company',
    result: 'Result',
    noResult: 'That ID number does not produce a valid number with that prefix (try another type).',
    note: 'A CUIT/CUIL with a correct check digit is just a well-formed number: it does not confirm the person or company is registered. For that, check the registration certificate on ARCA.',
    prefixPick: 'Prefix',
  },
};

const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
const PERSON_PREFIXES = ['20', '23', '24', '27'];
const COMPANY_PREFIXES = ['30', '33', '34'];

/** Dígito verificador de los primeros 10 números: módulo 11 con pesos 5-4-3-2-7-6-5-4-3-2. */
export function checkDigit(first10: string) {
  const sum = [...first10].reduce((s, d, i) => s + Number(d) * WEIGHTS[i], 0);
  const mod = sum % 11;
  return mod === 0 ? 0 : mod === 1 ? 10 : 11 - mod;
}

export const formatCuit = (digits: string) => `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;

type Gender = 'male' | 'female' | 'legal';

/** Arma el CUIT/CUIL desde el DNI. Cuando el dígito da 10, el prefijo pasa a 23 con dígito 9 (hombre) o 4 (mujer). */
export function buildCuit(dni: string, gender: Gender) {
  const body = dni.replace(/\D/g, '').padStart(8, '0').slice(-8);
  const prefix = gender === 'male' ? '20' : gender === 'female' ? '27' : '30';
  const dv = checkDigit(prefix + body);
  if (dv < 10) return prefix + body + dv;
  if (gender === 'legal') return '';
  return '23' + body + (gender === 'male' ? 9 : 4);
}

interface Check {
  raw: string;
  digits: string;
  ok: boolean;
  problems: ('length' | 'dv' | 'prefix')[];
  expected?: number;
}

function validate(raw: string): Check {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 11) return { raw, digits, ok: false, problems: ['length'] };
  const expected = checkDigit(digits.slice(0, 10));
  const problems: Check['problems'] = [];
  if (expected !== Number(digits[10])) problems.push('dv');
  if (![...PERSON_PREFIXES, ...COMPANY_PREFIXES].includes(digits.slice(0, 2))) problems.push('prefix');
  return { raw, digits, ok: !problems.includes('dv'), problems, expected: expected === 10 ? undefined : expected };
}

export default function CuitTool({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [mode, setMode] = useState<'validate' | 'calculate'>('validate');
  const [text, setText] = useState('');
  const [dni, setDni] = useState('');
  const [gender, setGender] = useState<Gender>('male');

  const checks = useMemo(
    () =>
      text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map(validate),
    [text],
  );
  const okCount = checks.filter((c) => c.ok).length;

  const result = useMemo(() => (dni.replace(/\D/g, '') ? buildCuit(dni, gender) : ''), [dni, gender]);

  return (
    <div class="stack-lg">
      <Segmented
        value={mode}
        onChange={setMode}
        label={t.validate}
        options={[
          { value: 'validate', label: t.validate },
          { value: 'calculate', label: t.calculate },
        ]}
      />

      {mode === 'validate' ? (
        <div class="tool-layout">
          <section class="panel stack">
            <Field label={t.inputLabel} htmlFor="cuit-in" hint={t.inputHint}>
              <textarea id="cuit-in" class="textarea mono" rows={6} placeholder={t.placeholder} value={text} onInput={(e) => setText(e.currentTarget.value)} />
            </Field>
          </section>
          <section class="panel stack">
            {checks.length === 0 ? (
              <span class="muted">{t.placeholder}</span>
            ) : (
              <>
                {checks.length > 1 && <strong>{t.summary(okCount, checks.length)}</strong>}
                <ul class="cuit-list">
                  {checks.map((c, i) => (
                    <li key={i} class={c.ok ? 'is-ok' : 'is-bad'}>
                      {c.ok ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />}
                      <div>
                        <div class="mono cuit-num">{c.digits.length === 11 ? formatCuit(c.digits) : c.raw}</div>
                        <div class="small">
                          {c.problems.includes('length') && t.badLength}
                          {c.problems.includes('dv') && `${t.invalid}${c.expected !== undefined ? `. ${t.expected(c.expected)}` : ''}`}
                          {c.ok && `${t.valid} · ${COMPANY_PREFIXES.includes(c.digits.slice(0, 2)) ? t.company : t.person} · ${t.doc}: ${c.digits.slice(2, 10)}`}
                          {c.ok && c.problems.includes('prefix') && ` · ${t.unknownPrefix}`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      ) : (
        <div class="tool-layout">
          <section class="panel stack">
            <Field label={t.dni} htmlFor="cuit-dni" hint={t.dniHint}>
              <input id="cuit-dni" class="input mono" inputMode="numeric" maxLength={11} placeholder="12345678" value={dni} onInput={(e) => setDni(e.currentTarget.value)} />
            </Field>
            <div class="field">
              <span class="label">{t.kind}</span>
              <Segmented
                value={gender}
                onChange={setGender}
                options={[
                  { value: 'male', label: t.male },
                  { value: 'female', label: t.female },
                  { value: 'legal', label: t.legal },
                ]}
              />
            </div>
          </section>
          <section class="panel stack">
            <span class="label">{t.result}</span>
            {result ? (
              <>
                <div class="result-big mono">{formatCuit(result)}</div>
                <div class="btn-row">
                  <CopyButton lang={lang} class="btn" text={formatCuit(result)} />
                  <CopyButton lang={lang} class="btn btn-ghost" text={result} label={lang === 'es' ? 'Copiar sin guiones' : 'Copy without hyphens'} />
                </div>
              </>
            ) : (
              <span class="muted">{dni.replace(/\D/g, '') ? t.noResult : '—'}</span>
            )}
          </section>
        </div>
      )}

      <div class="alert">
        <Info aria-hidden="true" />
        <div>{t.note}</div>
      </div>

      <style>{`
        .cuit-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
        .cuit-list li { display: flex; gap: 10px; align-items: flex-start; }
        .cuit-list svg { width: 20px; height: 20px; flex: none; margin-top: 2px; }
        .cuit-list .is-ok svg { color: #16a34a; }
        .cuit-list .is-bad svg { color: #dc2626; }
        .cuit-num { font-size: 1.05rem; font-weight: 600; }
      `}</style>
    </div>
  );
}
