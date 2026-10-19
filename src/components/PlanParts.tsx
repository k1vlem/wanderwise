import { Fragment, useState, type ReactNode } from 'react';
import { cityById, countryById, originById } from '../data';
import { useI18n } from '../i18n';
import { dayCost, dayTitle, describeItem, type Category } from '../lib/describe';
import type { Costs, Plan } from '../lib/planner';
import { Icon, type IconName } from './Icon';

export const COST_PARTS: { key: Exclude<keyof Costs, 'total'>; color: string }[] = [
  { key: 'flights', color: '#2B1E2F' },
  { key: 'hotels', color: '#F6C177' },
  { key: 'sights', color: '#C2452D' },
  { key: 'food', color: '#2A8C80' },
  { key: 'transport', color: '#B9A9B2' },
];

export const CATEGORY_STYLE: Record<Category, { chip: string; icon: IconName }> = {
  flight: { chip: 'bg-ink text-white', icon: 'plane' },
  transit: { chip: 'bg-lagoon-light text-lagoon-dark', icon: 'train' },
  hotel: { chip: 'bg-sand-light text-sand-dark', icon: 'bed' },
  sight: { chip: 'bg-sunset-light text-sunset-dark', icon: 'ticket' },
  food: { chip: 'bg-[#EFE7F3] text-[#5B3D6B]', icon: 'food' },
  free: { chip: 'bg-shell text-muted', icon: 'sun' },
};

// Flights are drawn in ink, which disappears on the dark summary card.
const partColor = (p: (typeof COST_PARTS)[number], dark: boolean) => (dark && p.key === 'flights' ? '#FFFFFF' : p.color);

/** Stacked bar of the trip cost against the budget, with a legend. */
export function CostBar({ costs, budget, dark = false }: { costs: Costs; budget: number; dark?: boolean }) {
  const { t, money } = useI18n();
  const scale = Math.max(costs.total, budget, 1);
  return (
    <div className="space-y-3">
      <div className="relative py-1.5">
        <div className={`flex h-3.5 overflow-hidden rounded-full ${dark ? 'bg-white/15' : 'bg-line'}`}>
          {COST_PARTS.map((p) => (
            <div key={p.key} style={{ width: `${(costs[p.key] / scale) * 100}%`, background: partColor(p, dark) }} className="h-full" />
          ))}
        </div>
        {costs.total > budget && (
          <div aria-hidden="true" style={{ left: `${(budget / scale) * 100}%` }} className={`absolute inset-y-0 w-[3px] rounded ${dark ? 'bg-white' : 'bg-ink'}`} />
        )}
      </div>
      <ul className="grid grid-cols-1 gap-x-5 gap-y-2 text-[15px] sm:grid-cols-2">
        {COST_PARTS.map((p) => (
          <li key={p.key} className="flex items-center gap-2.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: partColor(p, dark) }} />
            <span className={dark ? 'text-white/80' : 'text-ink-soft'}>{t(`cost.${p.key}`)}</span>
            <span className="ml-auto font-semibold tabular-nums">{money(costs[p.key])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "Almaty ✈ Rome · 4 nights 🚆 Florence · 3 nights ✈ home" */
export function RouteStrip({ plan }: { plan: Plan }) {
  const { t, tn, pick } = useI18n();
  const country = countryById(cityById(plan.choice.stops[0].city).country)!;
  const Dots = () => <span aria-hidden="true" className="h-0 min-w-6 flex-1 border-t-2 border-dotted border-[#D7C3BA]" />;
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-line bg-white px-4 py-3 text-[15px] font-semibold">
      <span className="text-ink-soft">{pick(originById(plan.input.origin).n)}</span>
      <Dots />
      <Icon name="plane" size={18} className="text-sunset" />
      <Dots />
      {plan.choice.stops.map((s, i) => (
        <Fragment key={s.city}>
          {i > 0 && (
            <>
              <Dots />
              <span title={t(`mode.${country.link.mode}`)} className="text-sunset">
                <Icon name={country.link.mode === 'flight' ? 'plane' : 'train'} size={18} />
              </span>
              <Dots />
            </>
          )}
          <span className="rounded-full bg-sand-light px-3 py-1 text-sand-dark">
            {pick(cityById(s.city).n)} · {tn('u.night', s.nights)}
          </span>
        </Fragment>
      ))}
      <Dots />
      <Icon name="plane" size={18} className="text-sunset" />
      <Dots />
      <span className="text-ink-soft">{t('day.departure')}</span>
    </div>
  );
}

/** Day list plus the hour-by-hour timeline of the selected day. */
export function Schedule({ plan, tickets = false }: { plan: Plan; tickets?: boolean }) {
  const i18n = useI18n();
  const { t, money, date, pick } = i18n;
  const [sel, setSel] = useState(0);
  const day = plan.days[Math.min(sel, plan.days.length - 1)];

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div role="tablist" aria-label={t('trips.schedule')} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {plan.days.map((d, i) => {
          const on = i === sel;
          return (
            <button
              key={d.date}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setSel(i)}
              className={`flex min-w-[170px] shrink-0 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition lg:min-w-0 ${
                on ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-sunset/40'
              }`}
            >
              <span className="min-w-0">
                <span className={`block text-[13px] font-semibold ${on ? 'text-white/70' : 'text-muted'}`}>
                  {t('day.label', { n: i + 1 })} · {date(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                <span className="block truncate text-[16px] font-bold">{dayTitle(d, i18n)}</span>
              </span>
              <span className="text-sm font-semibold tabular-nums">{money(dayCost(d))}</span>
            </button>
          );
        })}
      </div>

      <section aria-live="polite" className="rounded-3xl border border-line bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
          <div>
            <p className="text-sm font-semibold text-muted">
              {t('day.label', { n: sel + 1 })} · {date(day.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {pick(cityById(day.city).n)}
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-[28px]">{dayTitle(day, i18n)}</h3>
          </div>
          <span className="rounded-full bg-shell px-3 py-1.5 text-sm font-bold tabular-nums">
            {t('result.dayTotal')}: {money(dayCost(day))}
          </span>
        </div>
        <ol>
          {day.items.map((item, i) => {
            const d = describeItem(item, plan, i18n);
            const style = CATEGORY_STYLE[d.category];
            const showTicket = tickets && item.kind === 'sight' && cityById(item.city).sights.find((s) => s.id === item.ref)?.book;
            return (
              <li key={i} className="grid grid-cols-[52px_40px_minmax(0,1fr)] gap-3 border-t border-line py-4 sm:grid-cols-[60px_44px_minmax(0,1fr)_auto] sm:gap-4">
                <span className="pt-2 text-[15px] font-bold tabular-nums">{item.time}</span>
                <span className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-full ${style.chip}`} title={t(`kind.${d.category}`)}>
                  <Icon name={style.icon} size={18} />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[16px] font-semibold leading-snug">{d.title}</p>
                  <p className="mt-0.5 text-[15px] leading-relaxed text-muted">{d.note}</p>
                  {d.flags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {d.flags.map((f) => (
                        <span key={f} className="rounded-full bg-shell px-2.5 py-1 text-xs font-semibold text-ink-soft">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-1.5 text-sm font-bold tabular-nums sm:hidden">{d.cost}</p>
                </div>
                <div className="hidden flex-col items-end gap-2 pt-2 sm:flex">
                  <span className="text-[15px] font-bold tabular-nums">{d.cost}</span>
                  {showTicket && (
                    <span className="flex items-center gap-1 rounded-full bg-lagoon-light px-2.5 py-1 text-xs font-bold text-lagoon-dark">
                      <Icon name="ticket" size={14} />
                      {t('item.ticket')}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

/** Small rotated "passport stamp" badge. */
export function Stamp({ children, tone = 'good' }: { children: ReactNode; tone?: 'good' | 'bad' }) {
  return (
    <span
      className={`inline-block -rotate-3 whitespace-nowrap rounded-lg border-2 border-dashed px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] ${
        tone === 'good' ? 'border-lagoon text-lagoon-dark' : 'border-sunset text-sunset-dark'
      }`}
    >
      {children}
    </span>
  );
}
