import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Photo } from '../components/Photo';
import { PhotoButton, type ViewerItem } from '../components/PhotoViewer';
import { cityById, countryById, dishPhoto, sightPhoto } from '../data';
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

      <p className="mt-10 flex items-center gap-2 text-sm text-muted">
        <Icon name="expand" size={14} />
        {t('viewer.hint')}
      </p>
      <div className="mt-4 space-y-16">
        {cities.map((city) => {
          const sightItems: ViewerItem[] = city.sights.map((s) => ({
            id: sightPhoto(s),
            title: pick(s.n),
            note: `${s.fullDay ? `${t('item.dayTrip')} · ` : ''}${duration(s.hours * 60)}`,
            meta: s.pp ? money(s.pp) : t('item.free0'),
          }));
          const dishItems: ViewerItem[] = city.dishes.map((d) => ({ id: dishPhoto(d), title: d.n, note: pick(d.d), meta: `~${money(d.pp)}` }));
          return (
            <section key={city.id} aria-labelledby={`city-${city.id}`}>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <div className="relative min-h-[260px] overflow-hidden rounded-3xl">
                  <Photo id={city.id} size="lg" alt={pick(city.n)} className="absolute inset-0 h-full w-full" />
                </div>
                <div className="flex flex-col justify-center gap-4 rounded-3xl bg-white p-6 sm:p-8">
                  <h2 id={`city-${city.id}`} className="font-display text-3xl font-semibold tracking-tight">{pick(city.n)}</h2>
                  <p className="text-[16px] text-muted">{t('country.weekFrom', { price: money(weekFromPerPerson(city)) })}</p>
                  <div className="flex flex-wrap gap-3">
                    <Link to={`/build?country=${country.id}&city=${city.id}`} className="inline-flex items-center gap-2 rounded-full bg-sunset px-5 py-2.5 font-bold text-white hover:bg-sunset-dark">
                      {t('country.planManual')}
                      <Icon name="arrow" size={16} />
                    </Link>
                  </div>
                </div>
              </div>

              <h3 className="mt-8 font-display text-xl font-semibold">{t('country.sights')}</h3>
              <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                {city.sights.map((s, i) => (
                  <li key={s.id} className="min-w-0">
                    <PhotoButton items={sightItems} index={i} className="aspect-[4/3] w-full rounded-2xl" />
                    <p className="mt-2 text-[15px] font-semibold leading-snug">{pick(s.n)}</p>
                    <p className="text-sm text-muted">
                      {sightItems[i].note} · <span className="font-semibold text-ink">{sightItems[i].meta}</span>
                    </p>
                  </li>
                ))}
              </ul>

              <h3 className="mt-10 font-display text-xl font-semibold">{t('country.food')}</h3>
              <ul className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {city.dishes.map((d, i) => (
                  <li key={d.id} className="min-w-0 overflow-hidden rounded-3xl border border-line bg-white">
                    <PhotoButton items={dishItems} index={i} className="aspect-[4/3] w-full" />
                    <div className="p-4">
                      <p className="flex items-baseline justify-between gap-2 font-semibold">
                        <span className="min-w-0">{d.n}</span>
                        <span className="shrink-0 text-sm tabular-nums text-lagoon-dark">~{money(d.pp)}</span>
                      </p>
                      <p className="mt-1 text-sm text-muted">{pick(d.d)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
