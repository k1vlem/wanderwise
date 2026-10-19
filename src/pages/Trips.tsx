import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Photo } from '../components/Photo';
import { cityById } from '../data';
import { useI18n } from '../i18n';
import { planTitle } from '../lib/describe';
import { addDays } from '../lib/planner';
import { todayIso } from '../lib/query';
import { useStore, type Trip } from '../lib/store';

export function daysUntil(iso: string): number {
  return Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${todayIso()}T12:00:00Z`)) / 86_400_000);
}

export function SignInPrompt() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold">{t('trips.title')}</h1>
      <p className="mt-3 text-lg text-muted">{t('result.signinToSave')}</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/signin" className="rounded-full border border-line bg-white px-6 py-3 font-bold">
          {t('nav.signin')}
        </Link>
        <Link to="/signup" className="rounded-full bg-sunset px-6 py-3 font-bold text-white">
          {t('nav.signup')}
        </Link>
      </div>
    </div>
  );
}

export function StatusPill({ trip }: { trip: Trip }) {
  const { t } = useI18n();
  return trip.status === 'booked' ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-lagoon-light px-3 py-1 text-sm font-bold text-lagoon-dark">
      <Icon name="check" size={14} strokeWidth={3} />
      {t('trips.booked')}
    </span>
  ) : (
    <span className="rounded-full bg-shell px-3 py-1 text-sm font-bold text-muted">{t('trips.draft')}</span>
  );
}

export function Trips() {
  const i18n = useI18n();
  const { t, tn, money, date } = i18n;
  const { user, trips } = useStore();
  if (!user) return <SignInPrompt />;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[15px] font-semibold text-muted">{t('trips.hi', { name: user.name })}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{t('trips.title')}</h1>
        </div>
        <Link to="/plan" className="inline-flex items-center gap-2 rounded-full bg-sunset px-6 py-3 font-bold text-white hover:bg-sunset-dark">
          <Icon name="sparkle" size={16} className="text-sand" />
          {t('trips.new')}
        </Link>
      </div>

      {trips.length === 0 ? (
        <p className="mt-10 rounded-3xl border border-dashed border-line p-12 text-center text-lg text-muted">{t('trips.empty')}</p>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {trips.map((trip) => {
            const plan = trip.plan;
            const first = cityById(plan.choice.stops[0].city);
            const until = daysUntil(plan.input.start);
            return (
              <Link key={trip.id} to={`/trips/${trip.id}`} className="group overflow-hidden rounded-3xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="relative h-44 overflow-hidden">
                  <Photo id={first.id} alt={i18n.pick(first.n)} className="h-full w-full transition duration-500 group-hover:scale-105" />
                  <span className="absolute left-4 top-4">
                    <StatusPill trip={trip} />
                  </span>
                </div>
                <div className="space-y-2 p-5">
                  <h2 className="font-display text-xl font-semibold leading-snug">{planTitle(plan, i18n)}</h2>
                  <p className="text-[15px] text-muted">
                    {date(plan.input.start)} – {date(addDays(plan.input.start, plan.input.nights), { day: 'numeric', month: 'short', year: 'numeric' })} · {tn('u.traveler', plan.input.travelers)}
                  </p>
                  <div className="flex items-center justify-between border-t border-line pt-3">
                    <span className="text-sm font-semibold text-sunset-dark">{until >= 0 ? t('trips.departsIn', { days: tn('u.day', until) }) : t('trips.past')}</span>
                    <span className="text-lg font-bold tabular-nums">{money(plan.costs.total)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
