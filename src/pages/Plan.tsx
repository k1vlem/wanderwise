import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { CostBar, RouteStrip, Schedule, Stamp } from '../components/PlanParts';
import { TripFields } from '../components/TripFields';
import { cityById, countryById, INTERESTS } from '../data';
import { useI18n } from '../i18n';
import { planTitle } from '../lib/describe';
import { addDays, planTrip, type Pace, type Plan as PlanT, type PlanOptions, type PlanResult, type TripInput } from '../lib/planner';
import { inputFromQuery, queryFromInput } from '../lib/query';
import { useStore } from '../lib/store';

const PACES: Pace[] = ['relaxed', 'balanced', 'packed'];

export function builderQuery(plan: PlanT): string {
  const { choice, input } = plan;
  const city = cityById(choice.stops[0].city);
  return queryFromInput(
    { ...input, country: city.country },
    { city: city.id, tier: String(choice.tier), food: String(choice.food), flight: choice.flight },
  );
}

export function PlanPage() {
  const i18n = useI18n();
  const { t, tn, money, date, pick } = i18n;
  const [query, setQuery] = useSearchParams();
  const navigate = useNavigate();
  const { user, saveTrip, setPending } = useStore();
  const [input, setInput] = useState<TripInput>(() => inputFromQuery(query));
  const [opts, setOpts] = useState<PlanOptions>({});
  const [result, setResult] = useState<PlanResult | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const run = (next: TripInput, nextOpts: PlanOptions = {}) => {
    setInput(next);
    setOpts(nextOpts);
    setResult(planTrip(next, nextOpts));
    setSavedId(null);
    setQuery(queryFromInput(next, { go: '1' }), { replace: true });
  };

  useEffect(() => {
    if (query.get('go') === '1') run(inputFromQuery(query));
    // Run once for links like /plan?country=italy&go=1
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleInterest = (i: (typeof INTERESTS)[number]) =>
    setInput((cur) => ({ ...cur, interests: cur.interests.includes(i) ? cur.interests.filter((x) => x !== i) : [...cur.interests, i] }));

  const plan = result?.plan;

  const save = (then: 'save' | 'book') => {
    if (!plan) return;
    if (!user) {
      setPending(plan, then);
      navigate('/signin');
      return;
    }
    const id = saveTrip(plan);
    if (then === 'book') navigate(`/checkout/${id}`);
    else setSavedId(id);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{t('plan.title')}</h1>
        <p className="mt-3 text-lg text-muted">{t('plan.sub')}</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(input);
        }}
        className="mt-8 space-y-5 rounded-[28px] border border-line bg-white p-4 shadow-card sm:p-6"
      >
        <TripFields idPrefix="plan" value={input} onChange={setInput} className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-muted">{t('plan.interests')}</legend>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => {
                const on = input.interests.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleInterest(i)}
                    className={`h-10 rounded-full border px-4 text-[15px] font-semibold transition ${on ? 'border-sunset bg-sunset text-white' : 'border-line bg-white text-ink hover:border-sunset/40'}`}
                  >
                    {t(`interest.${i}`)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-muted">{t('plan.pace')}</legend>
            <div className="inline-flex rounded-full bg-shell p-1">
              {PACES.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={input.pace === p}
                  onClick={() => setInput({ ...input, pace: p })}
                  className={`h-9 rounded-full px-4 text-[15px] font-semibold ${input.pace === p ? 'bg-ink text-white' : 'text-ink'}`}
                >
                  {t(`plan.pace.${p}`)}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <button type="submit" className="inline-flex min-h-[54px] items-center gap-2 rounded-2xl bg-sunset px-7 text-[17px] font-bold text-white hover:bg-sunset-dark">
          <Icon name="sparkle" size={18} className="text-sand" />
          {t('plan.go')}
        </button>
      </form>

      {!plan && <p className="mt-10 rounded-3xl border border-dashed border-line p-10 text-center text-lg text-muted">{t('plan.empty')}</p>}

      {plan && result && (
        <div className="mt-12 space-y-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 space-y-5">
              <div>
                <p className="text-[15px] font-semibold text-muted">
                  {date(plan.input.start, { weekday: 'short', day: 'numeric', month: 'long' })} – {date(addDays(plan.input.start, plan.input.nights), { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })} ·{' '}
                  {tn('u.traveler', plan.input.travelers)}
                </p>
                <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-[40px]">{planTitle(plan, i18n)}</h2>
              </div>
              <RouteStrip plan={plan} />
              <div className="flex flex-wrap gap-2">
                <RefineButton label={t('result.cheaper')} onClick={() => run(input, { budgetCap: Math.round(plan.costs.total * 0.85) })} />
                <RefineButton label={t('result.moreFood')} onClick={() => run({ ...input, interests: [...new Set([...input.interests, 'food' as const])] }, { minFood: Math.min(2, plan.choice.food + 1) as 0 | 1 | 2 })} />
                <RefineButton label={t('result.relaxed')} onClick={() => run({ ...input, pace: 'relaxed' }, opts)} />
                {result.options > 1 && <RefineButton label={t('result.another')} onClick={() => run(input, { ...opts, variant: (opts.variant ?? 0) + 1 })} />}
              </div>
              <div className="rounded-3xl bg-sand-light/60 p-5">
                <p className="flex items-center gap-2 font-bold text-sand-dark">
                  <Icon name="info" size={18} />
                  {t('result.why')}
                </p>
                <ul className="mt-2 space-y-1 text-[15px] text-ink-soft">
                  <li>· {t('result.whyTier', { tier: plan.choice.tier, food: t(`food.${plan.choice.food}`) })}</li>
                  <li>
                    ·{' '}
                    {plan.choice.stops.length === 2
                      ? t('result.whyTwo', {
                          a: pick(cityById(plan.choice.stops[0].city).n),
                          b: pick(cityById(plan.choice.stops[1].city).n),
                          mode: t(`mode.${countryById(cityById(plan.choice.stops[0].city).country)!.link.mode}`).toLowerCase(),
                        })
                      : t('result.whyOne', { a: pick(cityById(plan.choice.stops[0].city).n) })}
                  </li>
                  <li>· {t('result.whyFlight', { option: t(`flight.${plan.choice.flight}`) })}</li>
                  <li>· {t('result.whyClosed')}</li>
                </ul>
              </div>
            </div>

            <aside className="h-fit space-y-4 rounded-3xl bg-ink p-6 text-white lg:sticky lg:top-24">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[15px] font-semibold text-white/70">{t('result.total', { travelers: tn('u.traveler', plan.input.travelers) })}</span>
                {result.fits ? <Stamp>{t('build.fits')}</Stamp> : null}
              </div>
              <p className="font-display text-[44px] font-semibold leading-none tabular-nums">
                {money(plan.costs.total)} <span className="font-sans text-lg font-medium text-white/60">{t('result.of', { budget: money(plan.input.budget) })}</span>
              </p>
              <p className={`text-[15px] font-semibold ${result.fits ? 'text-sand' : 'text-[#FF9F87]'}`}>
                {result.fits
                  ? t('result.left', { amount: money(plan.input.budget - plan.costs.total) })
                  : t('result.over', { amount: money(plan.costs.total - plan.input.budget) })}
              </p>
              {!result.fits && <p className="text-sm text-white/75">{t('result.overHint')}</p>}
              <CostBar costs={plan.costs} budget={plan.input.budget} dark />
              <button type="button" onClick={() => save('book')} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-sunset font-bold hover:bg-sunset-dark">
                {t('result.book')} · {money(plan.costs.total)}
              </button>
              {savedId ? (
                <Link to={`/trips/${savedId}`} className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-white/10 text-[15px] font-semibold text-sand">
                  <Icon name="check" size={18} />
                  {t('result.saved')}
                </Link>
              ) : (
                <button type="button" onClick={() => save('save')} className="flex min-h-[46px] w-full items-center justify-center rounded-2xl border border-white/25 text-[15px] font-semibold hover:bg-white/10">
                  {t('result.save')}
                </button>
              )}
              <Link to={`/build?${builderQuery(plan)}`} className="block text-center text-[15px] font-semibold text-white/80 underline-offset-4 hover:underline">
                {t('result.edit')}
              </Link>
              {!user && <p className="text-center text-sm text-white/60">{t('result.signinToSave')}</p>}
            </aside>
          </div>

          <Schedule key={JSON.stringify(plan.choice)} plan={plan} />
        </div>
      )}
    </div>
  );
}

function RefineButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="h-10 rounded-full border border-line bg-white px-4 text-[15px] font-semibold hover:border-sunset/50 hover:text-sunset-dark">
      {label}
    </button>
  );
}

