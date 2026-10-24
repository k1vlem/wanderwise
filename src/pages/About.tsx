import { Link, NavLink } from 'react-router-dom';
import { Icon, Logo, type IconName } from '../components/Icon';
import { Photo } from '../components/Photo';
import { COUNTRIES, cityById } from '../data';
import { useI18n } from '../i18n';

type Kind = 'mission' | 'vision';

// One city from each part of the world, for the "whole world" strip.
const WORLD = ['paris', 'tokyo', 'newyork', 'marrakech', 'bangkok', 'mexicocity'];

// What each part of the vision means on the site today.
const PROMISES = [
  { icon: 'wallet', title: 'about.v1t', text: 'about.v1' },
  { icon: 'globe', title: 'about.v2t', text: 'about.v2' },
  { icon: 'camera', title: 'about.v3t', text: 'about.v3' },
  { icon: 'ticket', title: 'about.v4t', text: 'about.v4' },
] as const satisfies readonly { icon: IconName; title: string; text: string }[];

function PlanButton() {
  const { t } = useI18n();
  return (
    <Link to="/plan" className="inline-flex items-center gap-2 rounded-full bg-sunset px-6 py-3.5 text-[16px] font-bold text-white hover:bg-sunset-dark">
      {t('search.goAuto')}
      <Icon name="arrow" size={18} />
    </Link>
  );
}

// Our only income: a service fee on the trip price. Hotels and tours pay us nothing.
const SERVICE_FEE = 0.05;

function HowWeEarn() {
  const { t, money, locale } = useI18n();
  const stats = [
    { value: new Intl.NumberFormat(locale, { style: 'percent' }).format(SERVICE_FEE), label: t('about.earnFee') },
    { value: money(0), label: t('about.earnHotels') },
  ];
  return (
    <section className="mt-16 grid gap-8 rounded-3xl border border-line bg-white p-6 sm:p-10 lg:grid-cols-[1.5fr_1fr] lg:items-center">
      <div className="space-y-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sunset-light text-sunset-dark">
          <Icon name="wallet" size={22} />
        </span>
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t('about.earnTitle')}</h2>
        <p className="text-[17px] leading-relaxed text-ink-soft">{t('about.earnText')}</p>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <li key={s.label} className="rounded-2xl bg-shell p-5">
            <p className="font-display text-3xl font-semibold text-sunset sm:text-4xl">{s.value}</p>
            <p className="mt-2 text-[15px] leading-snug text-muted">{s.label}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Mission() {
  const { t, tn, pick } = useI18n();
  return (
    <>
      <section className="grid gap-10 pt-14 lg:grid-cols-[1fr_1.25fr] lg:items-start">
        <div className="space-y-7">
          <p className="text-xl leading-relaxed text-ink-soft">{t('about.missionText')}</p>
          <PlanButton />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">{t('about.world', { countries: tn('u.country', COUNTRIES.length) })}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {WORLD.map((id) => {
              const city = cityById(id);
              return (
                <li key={id}>
                  <Link to={`/country/${city.country}`} className="group relative block aspect-[4/3] overflow-hidden rounded-2xl">
                    <Photo id={id} alt="" className="h-full w-full transition duration-500 group-hover:scale-105" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10 text-[15px] font-semibold text-white">
                      {pick(city.n)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      <HowWeEarn />
    </>
  );
}

function Vision() {
  const { t } = useI18n();
  return (
    <section className="pt-14">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROMISES.map((p) => (
          <li key={p.title} className="space-y-3 rounded-3xl border border-line bg-white p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sunset-light text-sunset-dark">
              <Icon name={p.icon} size={22} />
            </span>
            <h2 className="text-xl font-bold">{t(p.title)}</h2>
            <p className="text-[16px] leading-relaxed text-muted">{t(p.text)}</p>
          </li>
        ))}
      </ul>
      <div className="mt-10">
        <PlanButton />
      </div>
    </section>
  );
}

/** Mission and vision, as two tabs that are also links in the header. */
export function About({ kind }: { kind: Kind }) {
  const { t } = useI18n();
  const tab = ({ isActive }: { isActive: boolean }) =>
    `flex h-11 items-center rounded-full px-5 text-[15px] font-semibold transition ${isActive ? 'bg-white text-ink' : 'text-white hover:bg-white/15'}`;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <section className="relative isolate overflow-hidden rounded-[32px]">
        <Photo id={kind === 'mission' ? 's-balloon' : 's-halong'} size="lg" eager alt="" className="absolute inset-0 -z-10 h-full w-full" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#2B1E2F]/90 via-[#2B1E2F]/55 to-[#2B1E2F]/25" />
        <div className="flex min-h-[460px] flex-col justify-between gap-16 p-5 text-white sm:min-h-[540px] sm:p-8 lg:px-14 lg:pb-14">
          <nav aria-label={t('about.tabs')} className="flex w-fit gap-1 rounded-full bg-black/25 p-1 backdrop-blur">
            <NavLink to="/mission" className={tab}>
              {t('nav.mission')}
            </NavLink>
            <NavLink to="/vision" className={tab}>
              {t('nav.vision')}
            </NavLink>
          </nav>
          <div className="max-w-4xl">
            <p className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-sand">
              <Logo size={24} />
              {t(kind === 'mission' ? 'about.missionLabel' : 'about.visionLabel')}
            </p>
            {kind === 'mission' ? (
              <h1 className="mt-5 text-balance break-words font-display text-[40px] font-semibold leading-[1.05] tracking-tight [hyphens:auto] sm:text-6xl lg:text-7xl">
                {t('about.mission1')} <span className="text-sand">{t('about.mission2')}</span>
              </h1>
            ) : (
              <h1 className="mt-5 text-balance break-words font-display text-[23px] font-medium leading-[1.3] tracking-tight [hyphens:auto] sm:text-[34px] sm:leading-[1.25] lg:text-[40px]">
                {t('about.vision')}
              </h1>
            )}
          </div>
        </div>
      </section>
      {kind === 'mission' ? <Mission /> : <Vision />}
    </div>
  );
}
