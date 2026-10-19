import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Photo } from '../components/Photo';
import { cityById, countryById } from '../data';
import { useI18n } from '../i18n';
import { weekFromPerPerson } from '../lib/planner';
import { NotFound } from './NotFound';

export function Country() {
  const { id = '' } = useParams();
  const { t, pick, money, duration } = useI18n();
  const country = countryById(id);
  if (!country) return <NotFound message={t('country.notFound')} />;
  const cities = country.cities.map(cityById);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <div className="relative isolate overflow-hidden rounded-[32px]">
        <Photo id={cities[0].id} size="lg" eager alt={pick(cities[0].n)} className="absolute inset-0 -z-10 h-full w-full" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#2B1E2F]/85 via-[#2B1E2F]/35 to-transparent" />
        <div className="flex min-h-[380px] flex-col justify-end gap-4 p-6 text-white sm:p-10">
          <Link to="/#destinations" className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur hover:bg-white/25">
            <Icon name="back" size={16} />
            {t('dest.all')}
          </Link>
          <h1 className="font-display text-[30px] font-semibold tracking-tight sm:text-6xl">{pick(country.n)}</h1>
          <p className="max-w-2xl text-lg text-white/90">{pick(country.blurb)}</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link to={`/plan?country=${country.id}&go=1`} className="inline-flex items-center gap-2 rounded-full bg-sunset px-6 py-3 font-bold text-white hover:bg-sunset-dark">
              <Icon name="sparkle" size={16} className="text-sand" />
              {t('country.planAuto')}
            </Link>
            <Link to={`/build?country=${country.id}`} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-ink hover:bg-shell">
              {t('country.planManual')}
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-muted">
        <span className="flex items-center gap-2">
          <Icon name="wallet" size={18} />
          {t('country.currency', { code: country.currency })}
        </span>
        <span className="flex items-center gap-2">
          <Icon name={country.link.mode === 'flight' ? 'plane' : 'train'} size={18} />
          {t('country.getThere', { mode: t(`mode.${country.link.mode}`), a: pick(cities[0].n), b: pick(cities[1].n), duration: duration(country.link.mins) })}
        </span>
      </div>

      <h2 className="mt-12 font-display text-2xl font-semibold sm:text-3xl">{t('country.cities')}</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {cities.map((city) => (
          <article key={city.id} className="overflow-hidden rounded-3xl border border-line bg-white">
            <div className="h-64 overflow-hidden">
              <Photo id={city.id} alt={pick(city.n)} className="h-full w-full" />
            </div>
            <div className="space-y-5 p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-2xl font-semibold">{pick(city.n)}</h3>
                <span className="text-[15px] text-muted">{t('country.weekFrom', { price: money(weekFromPerPerson(city)) })}</span>
              </div>
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted">{t('country.sights')}</h4>
                <ul className="mt-2 divide-y divide-line">
                  {city.sights.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
                      <span className="min-w-0">{pick(s.n)}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{s.pp ? money(s.pp) : t('item.free0')}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted">{t('country.food')}</h4>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {city.dishes.map((d) => (
                    <li key={d.n} className="rounded-2xl bg-shell p-3">
                      <p className="flex items-baseline justify-between gap-2 font-semibold">
                        {d.n}
                        <span className="text-sm tabular-nums text-lagoon-dark">~{money(d.pp)}</span>
                      </p>
                      <p className="mt-0.5 text-sm text-muted">{pick(d.d)}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <Link to={`/build?country=${country.id}&city=${city.id}`} className="inline-flex items-center gap-2 font-bold text-sunset hover:text-sunset-dark">
                {t('country.planManual')}
                <Icon name="arrow" size={16} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
