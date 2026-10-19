import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Photo } from '../components/Photo';
import { PhotoButton, type ViewerItem } from '../components/PhotoViewer';
import { CostBar, Stamp } from '../components/PlanParts';
import { TripFields } from '../components/TripFields';
import { REGIONS, builderCountry, cityById, citiesOf, countriesIn, dishPhoto, originById, sightPhoto, type City } from '../data';
import { useI18n } from '../i18n';
import { buildPlan, flightPerPerson, rooms, type FlightOpt, type FoodLevel, type Tier, type TripInput } from '../lib/planner';
import { inputFromQuery, queryFromInput } from '../lib/query';
import { useStore } from '../lib/store';

const FLIGHTS: FlightOpt[] = ['saver', 'standard', 'flex'];
const TIERS: Tier[] = [3, 4, 5];
const FOODS: FoodLevel[] = [0, 1, 2];

const defaultSights = (city: City) => city.sights.filter((s) => !s.fullDay && !s.early).slice(0, 3).map((s) => s.id);

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
        {sub && <p className="mt-1 text-[15px] text-muted">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-sunset' : 'border-[#CDBDB5]'}`}>
      {on && <span className="h-2.5 w-2.5 rounded-full bg-sunset" />}
    </span>
  );
}

export function Build() {
  const { t, tn, pick, money, duration, weekday } = useI18n();
  const [query] = useSearchParams();
  const navigate = useNavigate();
  const { user, saveTrip, setPending } = useStore();

  const initial = inputFromQuery(query);
  const initialCountry = builderCountry(initial.country);
  const initialCity = citiesOf(initialCountry).some((c) => c.id === query.get('city')) ? query.get('city')! : citiesOf(initialCountry)[0].id;

  const [trip, setTrip] = useState<TripInput>({ ...initial, country: initialCountry });
  const [cityId, setCityId] = useState(initialCity);
  const [flight, setFlight] = useState<FlightOpt>((['saver', 'standard', 'flex'] as const).find((f) => f === query.get('flight')) ?? 'standard');
  const [tier, setTier] = useState<Tier>(([3, 4, 5] as const).find((n) => String(n) === query.get('tier')) ?? 4);
  const [food, setFood] = useState<FoodLevel>(([0, 1, 2] as const).find((n) => String(n) === query.get('food')) ?? 1);
  const [sights, setSights] = useState<string[]>(() => defaultSights(cityById(initialCity)));

  const city = cityById(cityId);
  const cities = citiesOf(trip.country);
  const sightItems: ViewerItem[] = city.sights.map((s) => ({
    id: sightPhoto(s),
    title: pick(s.n),
    note: [
      s.fullDay ? t('item.dayTrip') : '',
      duration(s.hours * 60),
      s.book ? t('item.book') : '',
      s.closed?.length ? t('item.closed', { days: s.closed.map(weekday).join(', ') }) : '',
    ]
      .filter(Boolean)
      .join(' · '),
    meta: s.pp ? money(s.pp) : t('item.free0'),
  }));
  const dishItems: ViewerItem[] = city.dishes.map((d) => ({ id: dishPhoto(d), title: d.n, note: pick(d.d), meta: `~${money(d.pp)}` }));

  const chooseCountry = (id: string) => {
    const first = citiesOf(id)[0];
    setTrip({ ...trip, country: id });
    setCityId(first.id);
    setSights(defaultSights(first));
  };
  const chooseCity = (c: City) => {
    setCityId(c.id);
    setSights(defaultSights(c));
  };

  const plan = useMemo(
    () => buildPlan({ ...trip, interests: [], pace: 'packed' }, { stops: [{ city: cityId, nights: trip.nights }], tier, food, flight, sights }),
    [trip, cityId, tier, food, flight, sights],
  );
  const left = trip.budget - plan.costs.total;
  const over = left < 0;

  const cityTotals = useMemo(
    () =>
      new Map(
        cities.map((c) => [
          c.id,
          buildPlan({ ...trip, interests: [], pace: 'packed' }, { stops: [{ city: c.id, nights: trip.nights }], tier, food, flight, sights: c.id === cityId ? sights : defaultSights(c) }).costs.total,
        ]),
      ),
    [cities, trip, tier, food, flight, sights, cityId],
  );

  const create = () => {
    if (!user) {
      setPending(plan, 'save');
      navigate('/signin');
      return;
    }
    navigate(`/trips/${saveTrip(plan)}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{t('build.title')}</h1>
          <p className="mt-3 text-lg text-muted">{t('build.sub')}</p>
        </div>
        <label className="flex min-w-[220px] flex-col gap-1 rounded-2xl bg-white px-4 py-2.5 shadow-card">
          <span className="text-[13px] font-semibold text-muted">{t('build.country')}</span>
          <select className="bg-transparent text-[17px] font-semibold outline-none" value={trip.country} onChange={(e) => chooseCountry(e.target.value)}>
            {REGIONS.map((r) => (
              <optgroup key={r} label={t(`region.${r}`)}>
                {countriesIn(r).map((c) => (
                  <option key={c.id} value={c.id}>
                    {pick(c.n)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-12">
          <Section title={t('build.city')} sub={t('build.citySub')}>
            <div className="grid gap-4 sm:grid-cols-2">
              {cities.map((c) => {
                const total = cityTotals.get(c.id) ?? 0;
                const on = c.id === cityId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => chooseCity(c)}
                    className={`overflow-hidden rounded-3xl border-2 bg-white text-left transition ${on ? 'border-sunset shadow-card' : 'border-line hover:border-sunset/40'}`}
                  >
                    <div className="relative h-40 overflow-hidden">
                      <Photo id={c.id} alt={pick(c.n)} className="h-full w-full" />
                      {on && <span className="absolute right-3 top-3 rounded-full bg-sunset px-3 py-1 text-xs font-bold text-white">{t('build.selected')}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="font-display text-xl font-semibold">{pick(c.n)}</p>
                        <p className="text-[15px] font-bold tabular-nums">{money(total)}</p>
                      </div>
                      {total <= trip.budget ? <Stamp>{t('build.fits')}</Stamp> : <Stamp tone="bad">{t('build.overBy', { amount: money(total - trip.budget) })}</Stamp>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title={t('build.trip')}>
            <TripFields idPrefix="build" value={trip} onChange={(next) => setTrip({ ...next, country: trip.country })} showCountry={false} className="sm:grid-cols-2 xl:grid-cols-5" />
          </Section>

          <Section title={t('build.flights')} sub={t('build.flightsSub', { origin: pick(originById(trip.origin).n), city: pick(city.n), code: city.airport })}>
            <div role="radiogroup" aria-label={t('build.flights')} className="grid gap-3">
              {FLIGHTS.map((f) => {
                const pp = flightPerPerson(city.id, trip.origin, f);
                const on = f === flight;
                return (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setFlight(f)}
                    className={`flex flex-wrap items-center gap-x-5 gap-y-2 rounded-3xl border-2 bg-white px-5 py-4 text-left ${on ? 'border-sunset' : 'border-line hover:border-sunset/40'}`}
                  >
                    <Radio on={on} />
                    <Icon name="plane" className="text-sunset" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-bold">{t(`flight.${f}`)}</span>
                      <span className="block text-[15px] text-muted">{t(`flight.${f}Note`)}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-xl font-bold tabular-nums">{money(pp)}</span>
                      <span className="block text-sm text-muted">{t('build.totalFor', { amount: money(pp * trip.travelers), travelers: tn('u.traveler', trip.travelers) })}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title={t('build.hotel', { city: pick(city.n) })} sub={t('build.hotelSub', { rooms: tn('u.traveler', trip.travelers) })}>
            <div role="radiogroup" aria-label={t('build.hotel', { city: pick(city.n) })} className="grid gap-3 md:grid-cols-3">
              {TIERS.map((n) => {
                const on = n === tier;
                const night = city.hotel[n - 3];
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setTier(n)}
                    className={`flex flex-col gap-3 rounded-3xl border-2 bg-white p-5 text-left ${on ? 'border-sunset' : 'border-line hover:border-sunset/40'}`}
                  >
                    <span className="flex w-full items-center justify-between">
                      <span className="text-lg tracking-widest text-[#E0A53A]">{'★'.repeat(n)}</span>
                      <Radio on={on} />
                    </span>
                    <span className="text-[17px] font-bold">{t(`tier.${n}`)}</span>
                    <span className="space-y-1 text-[15px] text-ink-soft">
                      <span className="flex items-center gap-2">
                        <Icon name="pin" size={16} className="text-muted" />
                        {t('build.area', { area: city.areas[n - 3] })}
                      </span>
                      <span className="flex items-center gap-2">
                        <Icon name={n >= 4 ? 'check' : 'bed'} size={16} className="text-muted" />
                        {n >= 4 ? t('build.breakfast') : t('build.roomOnly')}
                      </span>
                    </span>
                    <span className="mt-auto flex w-full items-baseline justify-between border-t border-line pt-3">
                      <span className="text-xl font-bold tabular-nums">
                        {money(night)}
                        <span className="text-sm font-normal text-muted"> {t('build.perNight')}</span>
                      </span>
                      <span className="text-sm tabular-nums text-muted">{money(night * trip.nights * rooms(trip.travelers))}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title={t('build.sights')} sub={t('build.sightsSub')}>
            <p className="-mt-2 flex items-center gap-2 text-sm text-muted">
              <Icon name="expand" size={14} />
              {t('viewer.hint')}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {city.sights.map((s, i) => {
                const on = sights.includes(s.id);
                return (
                  <div key={s.id} className={`overflow-hidden rounded-3xl border-2 bg-white transition ${on ? 'border-sunset shadow-card' : 'border-line'}`}>
                    <div className="relative">
                      <PhotoButton items={sightItems} index={i} className="aspect-[16/10] w-full" />
                      {on && (
                        <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-sunset px-3 py-1 text-xs font-bold text-white shadow">
                          <Icon name="check" size={13} strokeWidth={3} />
                          {t('build.selected')}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => setSights(on ? sights.filter((x) => x !== s.id) : [...sights, s.id])}
                      className="flex w-full items-start gap-3 p-4 text-left hover:bg-paper"
                    >
                      <span aria-hidden="true" className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 ${on ? 'border-sunset bg-sunset text-white' : 'border-[#CDBDB5]'}`}>
                        {on && <Icon name="check" size={15} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-semibold leading-snug">{pick(s.n)}</span>
                        <span className="mt-0.5 block text-sm text-muted">{sightItems[i].note}</span>
                      </span>
                      <span className="text-right">
                        <span className="block font-bold tabular-nums">{s.pp ? money(s.pp) : t('item.free0')}</span>
                        {s.pp > 0 && <span className="block text-sm tabular-nums text-muted">{money(s.pp * trip.travelers)}</span>}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title={t('build.food')} sub={t('build.foodSub')}>
            <div role="radiogroup" aria-label={t('build.food')} className="grid gap-3 md:grid-cols-3">
              {FOODS.map((n) => {
                const on = n === food;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setFood(n)}
                    className={`flex flex-col gap-1.5 rounded-3xl border-2 p-5 text-left ${on ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-sunset/40'}`}
                  >
                    <span className="text-[17px] font-bold">{t(`food.${n}`)}</span>
                    <span className="font-bold tabular-nums">
                      {money(city.food[n])} <span className={`text-sm font-normal ${on ? 'text-white/70' : 'text-muted'}`}>{t('build.perDay')}</span>
                    </span>
                    <span className={`text-sm ${on ? 'text-white/75' : 'text-muted'}`}>{t(`food.${n}note`)}</span>
                  </button>
                );
              })}
            </div>
            <h3 className="pt-2 text-lg font-bold">{t('build.mustTry', { city: pick(city.n) })}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {city.dishes.map((d, i) => (
                <div key={d.id} className="overflow-hidden rounded-3xl border border-line bg-white">
                  <PhotoButton items={dishItems} index={i} className="aspect-[4/3] w-full" />
                  <div className="p-4">
                    <p className="flex items-baseline justify-between gap-3 font-bold">
                      {d.n}
                      <span className="shrink-0 rounded-full bg-lagoon-light px-2.5 py-0.5 text-sm tabular-nums text-lagoon-dark">~{money(d.pp)}</span>
                    </p>
                    <p className="mt-1 text-sm text-muted">{pick(d.d)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <aside aria-label={t('build.meter')} className="space-y-4 rounded-3xl border border-line bg-white p-6 shadow-lift lg:sticky lg:top-24">
          <p className="text-[15px] font-bold text-muted">{t('build.meter')}</p>
          <div>
            <p className={`font-display text-5xl font-semibold tabular-nums ${over ? 'text-sunset-dark' : 'text-ink'}`}>
              {over ? '−' : ''}
              {money(Math.abs(left))}
            </p>
            <p className="mt-1 text-[15px] text-muted">{over ? t('build.overOf', { budget: money(trip.budget) }) : t('build.leftOf', { budget: money(trip.budget) })}</p>
          </div>
          <CostBar costs={plan.costs} budget={trip.budget} />
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <span className="font-bold">{t('cost.total')}</span>
            <span className="text-2xl font-bold tabular-nums">{money(plan.costs.total)}</span>
          </div>
          <p className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${over ? 'bg-sunset-light text-sunset-dark' : 'bg-lagoon-light text-lagoon-dark'}`}>
            {over ? t('build.adviceOver') : t('build.adviceOk')}
          </p>
          <button type="button" onClick={create} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-sunset font-bold text-white hover:bg-sunset-dark">
            {t('build.create')}
            <Icon name="arrow" size={18} />
          </button>
          <Link to={`/plan?${queryFromInput({ ...trip, interests: ['history', 'food'], pace: 'balanced' }, { go: '1' })}`} className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-line text-[15px] font-semibold hover:border-sunset/40">
            <Icon name="sparkle" size={16} className="text-sand" />
            {t('build.letPlanner')}
          </Link>
        </aside>
      </div>
    </div>
  );
}
