import type { ReactNode } from 'react';
import { ORIGINS, REGIONS, countriesIn, regionDest } from '../data';
import { useI18n } from '../i18n';
import type { TripInput } from '../lib/planner';
import { todayIso } from '../lib/query';

const NIGHTS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14];
const TRAVELERS = [1, 2, 3, 4, 5, 6];

export function Field({ label, htmlFor, children, accent = false }: { label: string; htmlFor: string; children: ReactNode; accent?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 rounded-2xl px-4 py-2.5 ${accent ? 'bg-sand-light' : 'bg-shell'}`}>
      <label htmlFor={htmlFor} className={`text-[13px] font-semibold ${accent ? 'text-sand-dark' : 'text-muted'}`}>
        {label}
      </label>
      {children}
    </div>
  );
}

export const controlClass = 'w-full min-w-0 bg-transparent text-[17px] font-semibold text-ink outline-none';

interface Props {
  idPrefix: string;
  value: TripInput;
  onChange: (next: TripInput) => void;
  showCountry?: boolean;
  className?: string;
}

/** Origin, destination, dates, travelers and budget. */
export function TripFields({ idPrefix, value, onChange, showCountry = true, className = '' }: Props) {
  const { t, pick } = useI18n();
  const set = <K extends keyof TripInput>(key: K, v: TripInput[K]) => onChange({ ...value, [key]: v });
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className={`grid gap-2.5 ${className}`}>
      <Field label={t('search.from')} htmlFor={id('origin')}>
        <select id={id('origin')} className={controlClass} value={value.origin} onChange={(e) => set('origin', e.target.value)}>
          {ORIGINS.map((o) => (
            <option key={o.id} value={o.id}>
              {pick(o.n)}
            </option>
          ))}
        </select>
      </Field>
      {showCountry && (
        <Field label={t('search.to')} htmlFor={id('country')}>
          <select id={id('country')} className={controlClass} value={value.country} onChange={(e) => set('country', e.target.value)}>
            <option value="any">{t('search.anywhere')}</option>
            {REGIONS.map((r) => (
              <optgroup key={r} label={t(`region.${r}`)}>
                <option value={regionDest(r)}>{t(`search.anyIn.${r}`)}</option>
                {countriesIn(r).map((c) => (
                  <option key={c.id} value={c.id}>
                    {pick(c.n)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
      )}
      <Field label={t('search.start')} htmlFor={id('start')}>
        <input id={id('start')} type="date" min={todayIso()} className={controlClass} value={value.start} onChange={(e) => e.target.value && set('start', e.target.value)} />
      </Field>
      <Field label={t('search.nights')} htmlFor={id('nights')}>
        <select id={id('nights')} className={controlClass} value={value.nights} onChange={(e) => set('nights', Number(e.target.value))}>
          {NIGHTS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('search.travelers')} htmlFor={id('travelers')}>
        <select id={id('travelers')} className={controlClass} value={value.travelers} onChange={(e) => set('travelers', Number(e.target.value))}>
          {TRAVELERS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('search.budget')} htmlFor={id('budget')} accent>
        <input
          id={id('budget')}
          type="number"
          inputMode="numeric"
          min={200}
          step={100}
          className={controlClass}
          value={value.budget || ''}
          onChange={(e) => set('budget', Math.max(0, Number(e.target.value)))}
        />
      </Field>
    </div>
  );
}
