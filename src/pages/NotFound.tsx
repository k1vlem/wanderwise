import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';

export function NotFound({ message }: { message?: string }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-4 py-28 text-center">
      <p className="font-display text-6xl font-semibold text-sunset">404</p>
      <h1 className="font-display text-2xl font-semibold">{message ?? t('notFound.title')}</h1>
      <Link to="/" className="rounded-full bg-sunset px-6 py-3 font-bold text-white hover:bg-sunset-dark">
        {t('notFound.back')}
      </Link>
    </div>
  );
}
