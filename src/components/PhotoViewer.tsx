import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';
import { usePhotoCredits } from '../lib/credits';
import { Icon } from './Icon';
import { Photo } from './Photo';

export interface ViewerItem {
  /** Photo id in public/photos */
  id: string;
  title: string;
  note?: string;
  /** Short facts under the note, e.g. "2 h · €18" */
  meta?: string;
}

interface Viewer {
  open: (items: ViewerItem[], index?: number) => void;
}

const Ctx = createContext<Viewer | null>(null);

export function usePhotoViewer(): Viewer {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePhotoViewer outside PhotoViewerProvider');
  return ctx;
}

function ViewerDialog({ items, start, onClose }: { items: ViewerItem[]; start: number; onClose: () => void }) {
  const { t } = useI18n();
  const credits = usePhotoCredits();
  const [index, setIndex] = useState(start);
  const closeRef = useRef<HTMLButtonElement>(null);
  const item = items[index];
  const many = items.length > 1;
  const go = useCallback((step: number) => setIndex((i) => (i + step + items.length) % items.length), [items.length]);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, [go, onClose]);

  const credit = credits?.[item.id];
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      className="fixed inset-0 z-[100] flex flex-col bg-[#170f19]/95 text-white"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <span className="text-sm font-semibold tabular-nums text-white/60">{many ? `${index + 1} / ${items.length}` : ''}</span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t('viewer.close')}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
        >
          <Icon name="close" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 sm:px-20" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <Photo key={item.id} id={item.id} size="lg" alt={item.title} contain className="max-h-full w-full rounded-2xl" />
        {many && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t('viewer.prev')}
              className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25 sm:left-5"
            >
              <Icon name="back" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t('viewer.next')}
              className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25 sm:right-5"
            >
              <Icon name="arrow" />
            </button>
          </>
        )}
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-1.5 px-5 pb-6 pt-4 text-center">
        <h2 className="font-display text-xl font-semibold sm:text-2xl">{item.title}</h2>
        {item.note && <p className="text-[16px] text-white/80">{item.note}</p>}
        {item.meta && <p className="text-sm font-semibold text-sand">{item.meta}</p>}
        {credit && (
          <p className="pt-1 text-xs text-white/50">
            {t('credits.by', { author: credit.author })} ·{' '}
            {credit.licenseUrl ? (
              <a href={credit.licenseUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-white/80">
                {credit.license}
              </a>
            ) : (
              credit.license
            )}{' '}
            ·{' '}
            <a href={credit.source} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-white/80">
              Wikimedia Commons
            </a>
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function PhotoViewerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ items: ViewerItem[]; index: number } | null>(null);
  const open = useCallback((items: ViewerItem[], index = 0) => items.length > 0 && setState({ items, index }), []);
  const close = useCallback(() => setState(null), []);
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {state && <ViewerDialog items={state.items} start={state.index} onClose={close} />}
    </Ctx.Provider>
  );
}

/** A photo that opens the viewer when clicked. */
export function PhotoButton({
  items,
  index = 0,
  size = 'sm',
  className = '',
  imgClassName = '',
}: {
  items: ViewerItem[];
  index?: number;
  size?: 'sm' | 'lg';
  className?: string;
  imgClassName?: string;
}) {
  const { t } = useI18n();
  const viewer = usePhotoViewer();
  const item = items[index];
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        viewer.open(items, index);
      }}
      aria-label={t('viewer.open', { title: item.title })}
      className={`group/photo relative block overflow-hidden ${className}`}
    >
      <Photo id={item.id} size={size} alt="" className={`h-full w-full transition duration-500 group-hover/photo:scale-105 ${imgClassName}`} />
      <span aria-hidden="true" className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur transition group-hover/photo:opacity-100">
        <Icon name="expand" size={14} />
      </span>
    </button>
  );
}
