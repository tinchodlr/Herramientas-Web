import { useState } from 'preact/hooks';
import { CopyButton, Field, NumInput, Segmented, fmtMoney, fmtNum, parseNum, type Lang } from './shared/ui';

const RATES = ['21', '10,5', '27', '5', '2,5'];

const T = {
  es: {
    amount: 'Monto',
    mode: '¿Qué querés hacer?',
    add: 'Sumar IVA (tengo el neto)',
    remove: 'Quitar IVA (tengo el total)',
    rate: 'Alícuota',
    custom: 'Otra',
    net: 'Neto (sin IVA)',
    iva: 'IVA',
    total: 'Total (con IVA)',
    ratesHint: '21 % general · 10,5 % alimentos básicos y otros · 27 % servicios a empresas (luz, gas, telefonía).',
  },
  en: {
    amount: 'Amount',
    mode: 'What do you want to do?',
    add: 'Add VAT (I have the net)',
    remove: 'Remove VAT (I have the total)',
    rate: 'Rate',
    custom: 'Other',
    net: 'Net (before VAT)',
    iva: 'VAT',
    total: 'Total (with VAT)',
    ratesHint: 'Argentina: 21% general · 10.5% basic food and others · 27% utilities for businesses.',
  },
};

export default function IvaCalculator({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [amount, setAmount] = useState('10000');
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [rate, setRate] = useState('21');
  const [custom, setCustom] = useState('');

  const a = parseNum(amount, lang);
  const r = parseNum(rate === 'custom' ? custom : rate, 'es') / 100;
  const net = mode === 'add' ? a : a / (1 + r);
  const total = mode === 'add' ? a * (1 + r) : a;
  const iva = total - net;
  const ok = Number.isFinite(net) && Number.isFinite(r);

  return (
    <div class="tool-layout">
      <section class="panel stack">
        <Field label={t.amount} htmlFor="iva-amount">
          <NumInput id="iva-amount" prefix="$" value={amount} onValue={setAmount} />
        </Field>
        <div class="field">
          <span class="label">{t.mode}</span>
          <Segmented value={mode} onChange={setMode} options={[{ value: 'add', label: t.add }, { value: 'remove', label: t.remove }]} />
        </div>
        <div class="field">
          <span class="label">{t.rate}</span>
          <Segmented
            value={rate}
            onChange={setRate}
            options={[...RATES.map((x) => ({ value: x, label: `${lang === 'es' ? x : x.replace(',', '.')} %` })), { value: 'custom', label: t.custom }]}
          />
          {rate === 'custom' && (
            <div style="max-width:160px">
              <NumInput value={custom} onValue={setCustom} suffix="%" aria-label={t.custom} autoFocus />
            </div>
          )}
          <span class="hint">{t.ratesHint}</span>
        </div>
      </section>

      <section class="panel stack">
        {[
          { label: t.net, value: net, strong: mode === 'remove' },
          { label: `${t.iva} (${fmtNum(r * 100, lang, 2)} %)`, value: iva },
          { label: t.total, value: total, strong: mode === 'add' },
        ].map((row) => (
          <div class={`iva-row ${row.strong ? 'is-main' : ''}`} key={row.label}>
            <div>
              <div class="stat-label">{row.label}</div>
              <div class={row.strong ? 'result-big' : 'stat-value'}>{ok ? fmtMoney(row.value, lang) : '—'}</div>
            </div>
            <CopyButton lang={lang} class="btn btn-sm btn-ghost" text={ok ? fmtNum(row.value, lang, 2, 2) : ''} />
          </div>
        ))}
      </section>

      <style>{`
        .iva-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-radius: 12px; background: var(--surface-2); }
        .iva-row.is-main { background: var(--accent-soft); }
      `}</style>
    </div>
  );
}
