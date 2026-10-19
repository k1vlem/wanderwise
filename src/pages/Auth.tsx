import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Icon';
import { Field, controlClass } from '../components/TripFields';
import { useI18n } from '../i18n';
import { useStore, type AuthError } from '../lib/store';

export function Auth({ mode }: { mode: 'signin' | 'signup' }) {
  const { t } = useI18n();
  const { user, signIn, signUp, takePending, saveTrip } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<AuthError | null>(null);
  const [busy, setBusy] = useState(false);

  // Once signed in, finish whatever the visitor started (save or book a plan).
  useEffect(() => {
    if (!user) return;
    const pending = takePending();
    if (pending) {
      const id = saveTrip(pending.plan);
      navigate(pending.then === 'book' ? `/checkout/${id}` : `/trips/${id}`, { replace: true });
    } else {
      navigate('/trips', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(mode === 'signup' ? await signUp(name, email, password) : await signIn(email, password));
    setBusy(false);
  };

  const signup = mode === 'signup';
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-[28px] border border-line bg-white p-6 shadow-lift sm:p-8">
        <Logo size={40} />
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">{signup ? t('auth.signupTitle') : t('auth.signinTitle')}</h1>
        <form onSubmit={submit} className="mt-6 space-y-3" noValidate>
          {signup && (
            <Field label={t('auth.name')} htmlFor="auth-name">
              <input id="auth-name" autoComplete="name" className={controlClass} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          )}
          <Field label={t('auth.email')} htmlFor="auth-email">
            <input id="auth-email" type="email" autoComplete="email" className={controlClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label={t('auth.password')} htmlFor="auth-password">
            <input
              id="auth-password"
              type="password"
              autoComplete={signup ? 'new-password' : 'current-password'}
              className={controlClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && (
            <p role="alert" className="rounded-2xl bg-sunset-light px-4 py-3 text-[15px] font-semibold text-sunset-dark">
              {t(error)}
            </p>
          )}
          <button type="submit" disabled={busy} className="min-h-[52px] w-full rounded-2xl bg-sunset font-bold text-white hover:bg-sunset-dark disabled:opacity-60">
            {signup ? t('auth.signup') : t('auth.signin')}
          </button>
        </form>
        <p className="mt-5 text-center text-[15px] text-muted">
          {signup ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
          <Link to={signup ? '/signin' : '/signup'} className="font-bold text-sunset hover:text-sunset-dark">
            {signup ? t('auth.signin') : t('auth.signup')}
          </Link>
        </p>
        <p className="mt-5 rounded-2xl bg-shell px-4 py-3 text-sm leading-relaxed text-muted">{t('auth.demoNote')}</p>
      </div>
    </div>
  );
}
