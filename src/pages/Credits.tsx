import { Photo } from '../components/Photo';
import { useI18n } from '../i18n';
import { usePhotoCredits } from '../lib/credits';

export function Credits() {
  const { t } = useI18n();
  const credits = usePhotoCredits();

  const list = Object.entries(credits ?? {});
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t('credits.title')}</h1>
      <p className="mt-3 text-lg text-muted">{t('credits.sub')}</p>
      {credits && list.length === 0 && <p className="mt-8 text-muted">{t('credits.none')}</p>}
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {list.map(([id, c]) => (
          <li key={id} className="flex gap-4 rounded-3xl border border-line bg-white p-3">
            <Photo id={id} alt="" className="h-20 w-28 shrink-0 rounded-2xl" />
            <div className="min-w-0 text-[15px]">
              <p className="truncate font-semibold">{c.file.replace(/^File:/, '')}</p>
              <p className="text-muted">{t('credits.by', { author: c.author })}</p>
              <p className="text-muted">
                {c.licenseUrl ? (
                  <a href={c.licenseUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                    {c.license}
                  </a>
                ) : (
                  c.license
                )}{' '}
                ·{' '}
                <a href={c.source} target="_blank" rel="noreferrer" className="font-semibold text-sunset underline-offset-2 hover:underline">
                  {t('credits.source')}
                </a>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
