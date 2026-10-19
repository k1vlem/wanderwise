import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Photo } from '../components/Photo';
import { CATEGORY_STYLE } from '../components/PlanParts';
import { TripFields } from '../components/TripFields';
import { COUNTRIES, cityById, countryPhoto } from '../data';
import { useI18n } from '../i18n';
import { describeItem } from '../lib/describe';
import { addDays, dealPerPerson, planTrip, weekFromPerPerson, type TripInput } from '../lib/planner';
import { DEFAULT_INPUT, defaultStart, queryFromInput, todayIso } from '../lib/query';

type DealTag = { kind: 'discount'; pct: number } | { kind: 'lastRooms' | 'new' | 'endsSoon' };

const DEALS: { city: string; inDays: number; nights: number; tag: DealTag }[] = [
  { city: 'barcelona', inDays: 24, nights: 7, tag: { kind: 'discount', pct: 24 } },
  { city: 'rome', inDays: 38, nights: 5, tag: { kind: 'lastRooms' } },
  { city: 'lisbon', inDays: 31, nights: 7, tag: { kind: 'discount', pct: 18 } },
  { city: 'santorini', inDays: 52, nights: 6, tag: { kind: 'endsSoon' } },
  { city: 'istanbul', inDays: 19, nights: 5, tag: { kind: 'new' } },
  { city: 'salzburg', inDays: 45, nights: 4, tag: { kind: 'discount', pct: 30 } },
];

function SearchCard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [input, setInput] = useState<TripInput>({ ...DEFAULT_INPUT, start: defaultStart() });

  const go = () => {
    if (mode === 'auto') navigate(`/plan?${queryFromInput(input, { go: '1' })}`);
    else navigate(`/build?${queryFromInput({ ...input, country: input.country === 'any' ? 'italy' : input.country })}`);
  };

  const tab = (on: boolean) =>
    `flex h-11 items-center gap-2 rounded-full px-5 text-[15px] font-semibold transition ${on ? 'bg-ink text-white' : 'bg-shell text-ink hover:bg-line'}`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
      aria-label={t('search.goAuto')}
      className="rounded-[28px] border border-line bg-white p-4 shadow-lift sm:p-5"
    >
      <div role="group" className="mb-4 flex flex-wrap gap-2">
        <button type="button" aria-pressed={mode === 'auto'} className={tab(mode === 'auto')} onClick={() => setMode('auto')}>
          <Icon name="sparkle" size={16} className="text-sand" />
          {t('search.modeAuto')}
        </button>
        <button type="button" aria-pressed={mode === 'manual'} className={tab(mode === 'manual')} onClick={() => setMode('manual')}>
          {t('search.modeManual')}
        </button>
      </div>
      <TripFields idPrefix="home" value={input} onChange={setInput} className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" />
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-[15px] text-muted">{mode === 'auto' ? t('search.hintAuto') : t('search.hintManual')}</p>
        <button type="submit" className="flex min-h-[56px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-sunset px-8 text-[17px] font-bold text-white hover:bg-sunset-dark">
          {mode === 'auto' ? t('search.goAuto') : t('search.goManual')}
          <Icon name="arrow" size={18} />
        </button>
      </div>
    </form>
  );
}

function Deals() {
  const { t, pick, money, date } = useI18n();
  const today = todayIso();
  return (
    <section id="deals" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-20 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t('deals.title')}</h2>
          <p className="mt-2 text-[16px] text-muted">{t('deals.sub')}</p>
        </div>
      </div>
      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {DEALS.map((d) => {
          const city = cityById(d.city);
          const start = addDays(today, d.inDays);
          const base = dealPerPerson(city, d.nights);
          const price = d.tag.kind === 'discount' ? Math.round(base * (1 - d.tag.pct / 100)) : base;
          const label =
            d.tag.kind === 'discount' ? `−${d.tag.pct}%` : t(d.tag.kind === 'lastRooms' ? 'deals.lastRooms' : d.tag.kind === 'new' ? 'deals.new' : 'deals.endsSoon');
          return (
            <Link
              key={d.city}
              to={`/build?country=${city.country}&city=${city.id}&nights=${d.nights}&start=${start}`}
              className="group overflow-hidden rounded-3xl border border-line bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="relative h-52 overflow-hidden">
                <Photo id={city.id} alt={pick(city.n)} className="h-full w-full transition duration-500 group-hover:scale-105" />
                <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-sunset-dark shadow">{label}</span>
              </div>
              <div className="flex items-end justify-between gap-3 p-5">
                <div className="min-w-0">
                  <h3 className="font-display text-xl font-semibold">{pick(city.n)}</h3>
                  <p className="mt-1 text-[15px] text-muted">
                    {date(start)} – {date(addDays(start, d.nights))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted">{t('deals.from')}</p>
                  <p className="font-display text-2xl font-semibold tabular-nums">{money(price)}</p>
                  {d.tag.kind === 'discount' && <p className="text-sm tabular-nums text-muted line-through">{money(base)}</p>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Destinations() {
  const { t, pick, money } = useI18n();
  return (
    <section id="destinations" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-20 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t('dest.title')}</h2>
        <p className="mt-2 text-[16px] leading-relaxed text-muted">{t('dest.sub')}</p>
      </div>
      <div className="mt-7 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {COUNTRIES.map((c) => {
          const from = Math.min(...c.cities.map((id) => weekFromPerPerson(cityById(id))));
          return (
            <Link key={c.id} to={`/country/${c.id}`} className="group overflow-hidden rounded-3xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="h-40 overflow-hidden">
                <Photo id={countryPhoto(c)} alt={pick(c.n)} className="h-full w-full transition duration-500 group-hover:scale-105" />
              </div>
              <div className="space-y-2 p-4">
                <h3 className="font-display text-lg font-semibold">{pick(c.n)}</h3>
                <p className="text-sm text-muted">{c.cities.map((id) => pick(cityById(id).n)).join(' · ')}</p>
                <div className="flex items-baseline justify-between gap-2 border-t border-line pt-3">
                  <span className="text-sm text-muted">
                    {t('dest.from')} <b className="text-[16px] tabular-nums text-ink">{money(from)}</b>
                  </span>
                  <span aria-label={t('dest.level', { n: c.level })} className="text-sm font-bold tracking-wider">
                    {'€'.repeat(c.level)}
                    <span className="text-line">{'€'.repeat(4 - c.level)}</span>
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    ['how.s1t', 'how.s1'],
    ['how.s2t', 'how.s2'],
    ['how.s3t', 'how.s3'],
    ['how.s4t', 'how.s4'],
  ] as const;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
      <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t('how.title')}</h2>
      <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([title, text], i) => (
          <li key={title} className="space-y-3">
            <span className={`flex h-12 w-12 items-center justify-center rounded-full font-display text-lg font-semibold ${i === 3 ? 'bg-sunset text-white' : 'bg-sunset-light text-sunset-dark'}`}>
              {i + 1}
            </span>
            <h3 className="text-xl font-bold">{t(title)}</h3>
            <p className="text-[16px] leading-relaxed text-muted">{t(text)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PlannerTeaser() {
  const i18n = useI18n();
  const { t, money, pick, date } = i18n;
  const sample = useMemo(
    () => planTrip({ ...DEFAULT_INPUT, country: 'italy', budget: 3200, start: defaultStart(), interests: ['history', 'food'] }).plan,
    [],
  );
  const day = sample.days[1];
  return (
    <section className="mt-20 bg-shell">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="min-w-0 space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-sunset-dark">
            <Icon name="sparkle" size={14} className="text-sand" />
            {t('teaser.badge')}
          </span>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t('teaser.title')}</h2>
          <p className="max-w-xl text-[17px] leading-relaxed text-ink-soft">{t('teaser.text')}</p>
          <Link to="/plan" className="inline-flex items-center gap-2 rounded-full bg-sunset px-6 py-3.5 text-[16px] font-bold text-white hover:bg-sunset-dark">
            {t('teaser.cta')}
            <Icon name="arrow" size={18} />
          </Link>
        </div>
        <div className="min-w-0 rounded-3xl bg-white p-5 shadow-lift sm:p-6">
          <p className="text-sm font-semibold text-muted">
            {t('day.label', { n: 2 })} · {date(day.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {pick(cityById(day.city).n)}
          </p>
          <ol className="mt-3">
            {day.items.map((item, i) => {
              const d = describeItem(item, sample, i18n);
              const style = CATEGORY_STYLE[d.category];
              return (
                <li key={i} className="flex items-center gap-3 border-t border-line py-3">
                  <span className="w-12 text-sm font-bold tabular-nums">{item.time}</span>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.chip}`}>
                    <Icon name={style.icon} size={15} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{d.title}</span>
                  <span className="text-sm font-bold tabular-nums">{item.cost ? money(item.cost) : d.cost}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function Home() {
  const { t } = useI18n();
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-[32px]">
          <Photo id="hero" size="lg" eager alt={t('home.heroCaption')} className="absolute inset-0 -z-10 h-full w-full" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#2B1E2F]/85 via-[#2B1E2F]/45 to-transparent" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[#2B1E2F]/35 sm:hidden" />
          <div className="max-w-2xl px-6 pb-36 pt-14 text-white sm:px-10 sm:pb-40 sm:pt-20 lg:px-14">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-sand" />
              {t('home.badge')}
            </span>
            <h1 className="mt-5 text-balance break-words font-display text-[26px] font-semibold leading-[1.12] tracking-tight [hyphens:auto] min-[420px]:text-[30px] sm:text-[44px] lg:text-[52px]">
              {t('home.title1')} <span className="text-sand">{t('home.title2')}</span>
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/85 sm:text-lg">{t('home.lead')}</p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[15px] font-semibold">
              {(['home.perk1', 'home.perk2', 'home.perk3'] as const).map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <Icon name="check" size={18} className="text-sand" />
                  {t(k)}
                </li>
              ))}
            </ul>
          </div>
          <p className="absolute right-5 top-4 hidden rounded-full bg-black/25 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur sm:block">{t('home.heroCaption')}</p>
        </div>
        <div className="relative z-10 -mt-24 px-2 sm:px-6">
          <SearchCard />
        </div>
      </section>
      <Deals />
      <Destinations />
      <HowItWorks />
      <PlannerTeaser />
    </>
  );
}
