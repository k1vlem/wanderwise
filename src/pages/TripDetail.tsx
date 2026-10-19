import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Photo } from '../components/Photo';
import { CostBar, RouteStrip, Schedule } from '../components/PlanParts';
import { cityById } from '../data';
import { useI18n } from '../i18n';
import { planTitle } from '../lib/describe';
import { addDays } from '../lib/planner';
import { useStore } from '../lib/store';
import { NotFound } from './NotFound';
import { SignInPrompt, StatusPill, daysUntil } from './Trips';
import { builderQuery } from './Plan';

export function TripDetail() {
  const { id = '' } = useParams();
  const [query] = useSearchParams();
  const i18n = useI18n();
  const { t, tn, money, date, pick } = i18n;
  const { user, trips, removeTrip } = useStore();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  if (!user) return <SignInPrompt />;
  const trip = trips.find((x) => x.id === id);
  if (!trip) return <NotFound message={t('trips.notFound')} />;

  const plan = trip.plan;
  const first = cityById(plan.choice.stops[0].city);
  const until = daysUntil(plan.input.start);
  const booked = trip.status === 'booked';
  const timedTickets = plan.days.flatMap((d) => d.items).filter((i) => i.kind === 'sight' && cityById(i.city).sights.find((s) => s.id === i.ref)?.book).length;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <Link to="/trips" className="inline-flex items-center gap-2 text-[15px] font-semibold text-muted hover:text-ink">
        <Icon name="back" size={16} />
        {t('trips.back')}
      </Link>

      {query.get('booked') === '1' && booked && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-2xl bg-lagoon-light px-5 py-4 font-semibold text-lagoon-dark">
          <Icon name="check" size={20} strokeWidth={3} />
          {t('checkout.done')}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-[28px] border border-line bg-white shadow-card md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="relative min-h-[220px]">
          <Photo id={first.id} size="lg" alt={pick(first.n)} className="absolute inset-0 h-full w-full" />
        </div>
        <div className="space-y-5 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusPill trip={trip} />
            {trip.ref && <span className="text-sm font-semibold text-muted">{t('trips.ref', { ref: trip.ref })}</span>}
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{planTitle(plan, i18n)}</h1>
          <dl className="grid grid-cols-2 gap-4 border-t-2 border-dashed border-line pt-5 sm:grid-cols-4">
            <div>
              <dt className="text-[13px] font-semibold text-muted">{t('trips.dates')}</dt>
              <dd className="font-bold">
                {date(plan.input.start)} – {date(addDays(plan.input.start, plan.input.nights))}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] font-semibold text-muted">{t('trips.travelers')}</dt>
              <dd className="font-bold">{trip.names?.join(', ') || tn('u.traveler', plan.input.travelers)}</dd>
            </div>
            <div>
              <dt className="text-[13px] font-semibold text-muted">{t('trips.total')}</dt>
              <dd className="font-bold tabular-nums">{money(plan.costs.total)}</dd>
            </div>
            <div>
              <dt className="text-[13px] font-semibold text-muted">{until >= 0 ? t('trips.departsIn', { days: '' }).trim() : t('trips.past')}</dt>
              <dd className="font-bold text-sunset-dark">{until >= 0 ? tn('u.day', until) : '—'}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3">
            {!booked && (
              <Link to={`/checkout/${trip.id}`} className="inline-flex items-center gap-2 rounded-full bg-sunset px-6 py-3 font-bold text-white hover:bg-sunset-dark">
                {t('trips.book')} · {money(plan.costs.total)}
              </Link>
            )}
            {!booked && (
              <Link to={`/build?${builderQuery(plan)}`} className="inline-flex items-center rounded-full border border-line px-5 py-3 font-semibold hover:border-sunset/40">
                {t('result.edit')}
              </Link>
            )}
            {confirming ? (
              <span className="inline-flex flex-wrap items-center gap-2 rounded-2xl bg-sunset-light px-4 py-2 text-[15px] font-semibold text-sunset-dark">
                {t('trips.deleteConfirm')}
                <button
                  type="button"
                  onClick={() => {
                    removeTrip(trip.id);
                    navigate('/trips');
                  }}
                  className="rounded-full bg-sunset px-4 py-1.5 font-bold text-white"
                >
                  {t('trips.deleteYes')}
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="rounded-full px-3 py-1.5 font-semibold text-ink">
                  {t('trips.cancel')}
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className="inline-flex items-center gap-2 rounded-full px-4 py-3 font-semibold text-muted hover:text-sunset-dark">
                <Icon name="trash" size={18} />
                {t('trips.delete')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {booked && (
          <section className="rounded-3xl border border-line bg-white p-6">
            <h2 className="font-display text-xl font-semibold">{t('trips.whatsBooked')}</h2>
            <ul className="mt-4 space-y-3 text-[15px]">
              {[
                t('trips.bookedFlights', { travelers: tn('u.traveler', plan.input.travelers) }),
                t('trips.bookedHotels', {
                  list: plan.choice.stops.map((s) => `${pick(cityById(s.city).n)} (${tn('u.night', s.nights)})`).join(', '),
                }),
                t('trips.bookedTransport'),
                t('trips.bookedTickets', { count: tn('u.ticket', timedTickets) }),
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lagoon-light text-lagoon-dark">
                    <Icon name="check" size={14} strokeWidth={3} />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className={`rounded-3xl border border-line bg-white p-6 ${booked ? '' : 'lg:col-span-2'}`}>
          <h2 className="font-display text-xl font-semibold">{t('trips.costs')}</h2>
          <div className="mt-4">
            <CostBar costs={plan.costs} budget={plan.input.budget} />
          </div>
        </section>
      </div>

      <div className="mt-8 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t('trips.schedule')}</h2>
          <span className="text-[15px] text-muted">{t('trips.localTime')}</span>
        </div>
        <RouteStrip plan={plan} />
        <Schedule plan={plan} tickets={booked} />
      </div>
    </div>
  );
}
