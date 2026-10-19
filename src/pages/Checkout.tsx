import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { CostBar, RouteStrip } from '../components/PlanParts';
import { Field, controlClass } from '../components/TripFields';
import { useI18n } from '../i18n';
import { planTitle } from '../lib/describe';
import { useStore } from '../lib/store';
import { NotFound } from './NotFound';
import { SignInPrompt } from './Trips';

const bookingRef = () => `WW-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

export function Checkout() {
  const { id = '' } = useParams();
  const i18n = useI18n();
  const { t, money } = i18n;
  const { user, trips, updateTrip } = useStore();
  const navigate = useNavigate();
  const trip = trips.find((x) => x.id === id);
  const [names, setNames] = useState<string[]>(() =>
    Array.from({ length: trip?.plan.input.travelers ?? 1 }, (_, i) => (i === 0 ? user?.name ?? '' : '')),
  );
  const [email, setEmail] = useState(user?.email ?? '');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState(false);

  if (!user) return <SignInPrompt />;
  if (!trip) return <NotFound message={t('trips.notFound')} />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!agree || names.some((n) => !n.trim())) {
      setError(true);
      return;
    }
    updateTrip(trip.id, { status: 'booked', ref: trip.ref ?? bookingRef(), names: names.map((n) => n.trim()), email: email.trim() });
    navigate(`/trips/${trip.id}?booked=1`);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t('checkout.title')}</h1>
      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-sand-light px-5 py-4 text-[15px] font-semibold text-sand-dark">
        <Icon name="info" size={20} className="mt-0.5 shrink-0" />
        {t('checkout.demo')}
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <fieldset className="space-y-3">
            <legend className="mb-3 text-lg font-bold">{t('checkout.names')}</legend>
            {names.map((n, i) => (
              <Field key={i} label={t('checkout.traveler', { n: i + 1 })} htmlFor={`name-${i}`}>
                <input
                  id={`name-${i}`}
                  autoComplete={i === 0 ? 'name' : 'off'}
                  className={controlClass}
                  value={n}
                  onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))}
                />
              </Field>
            ))}
          </fieldset>
          <Field label={t('checkout.email')} htmlFor="checkout-email">
            <input id="checkout-email" type="email" autoComplete="email" className={controlClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 text-[15px] font-semibold">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-5 w-5 accent-[#C2452D]" />
            {t('checkout.agree')}
          </label>
          {error && (
            <p role="alert" className="rounded-2xl bg-sunset-light px-4 py-3 text-[15px] font-semibold text-sunset-dark">
              {t('checkout.missing')}
            </p>
          )}
          <button type="submit" className="min-h-[54px] w-full rounded-2xl bg-sunset text-[17px] font-bold text-white hover:bg-sunset-dark">
            {t('checkout.confirm')} · {money(trip.plan.costs.total)}
          </button>
        </form>
        <aside className="h-fit space-y-4 rounded-3xl border border-line bg-white p-6">
          <p className="text-[15px] font-bold text-muted">{t('checkout.summary')}</p>
          <h2 className="font-display text-xl font-semibold leading-snug">{planTitle(trip.plan, i18n)}</h2>
          <CostBar costs={trip.plan.costs} budget={trip.plan.input.budget} />
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <span className="font-bold">{t('cost.total')}</span>
            <span className="text-2xl font-bold tabular-nums">{money(trip.plan.costs.total)}</span>
          </div>
        </aside>
      </div>
      <div className="mt-8">
        <RouteStrip plan={trip.plan} />
      </div>
    </div>
  );
}
