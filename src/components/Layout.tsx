import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LANGS } from '../data/types';
import { LANG_NAMES, useI18n } from '../i18n';
import { useStore } from '../lib/store';
import { Icon, Logo } from './Icon';

function LangSwitcher() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('nav.language')}
        className="flex h-11 items-center gap-2 rounded-full border border-line bg-white px-3 text-sm font-semibold text-ink hover:border-sunset/40"
      >
        <Icon name="globe" size={18} />
        <span className="uppercase">{lang}</span>
        <Icon name="down" size={16} />
      </button>
      {open && (
        <ul role="listbox" aria-label={t('nav.language')} className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-line bg-white py-1 shadow-lift">
          {LANGS.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={l === lang}
                lang={l}
                onClick={() => {
                  setLang(l);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[15px] hover:bg-shell ${l === lang ? 'font-bold text-sunset' : 'text-ink'}`}
              >
                {LANG_NAMES[l]}
                <span className="text-xs uppercase text-muted">{l}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Header() {
  const { t } = useI18n();
  const { user, signOut } = useStore();
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMenu(false), [pathname]);

  const links = [
    { to: '/#destinations', label: t('nav.destinations') },
    { to: '/plan', label: t('nav.plan') },
    { to: '/build', label: t('nav.build') },
    { to: '/trips', label: t('nav.trips') },
  ];
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3 py-2 text-[15px] font-medium ${isActive ? 'text-sunset' : 'text-ink-soft hover:text-ink'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Wanderwise">
          <Logo />
          <span className="font-display text-[22px] font-bold tracking-tight text-ink">wanderwise</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {links.map((l) =>
            l.to.includes('#') ? (
              <Link key={l.to} to={l.to} className="rounded-full px-3 py-2 text-[15px] font-medium text-ink-soft hover:text-ink">
                {l.label}
              </Link>
            ) : (
              <NavLink key={l.to} to={l.to} className={navClass}>
                {l.label}
              </NavLink>
            ),
          )}
        </nav>
        <div className="flex items-center gap-2">
          <LangSwitcher />
          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/trips" className="flex h-11 items-center gap-2 rounded-full bg-shell pl-1.5 pr-4 text-sm font-semibold text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sand text-xs font-bold text-ink">
                  {user.name.slice(0, 2).toUpperCase()}
                </span>
                {user.name}
              </Link>
              <button type="button" onClick={signOut} className="h-11 rounded-full px-3 text-sm font-medium text-muted hover:text-ink">
                {t('nav.signout')}
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-1 sm:flex">
              <Link to="/signin" className="px-3 py-2 text-[15px] font-semibold text-ink">
                {t('nav.signin')}
              </Link>
              <Link to="/signup" className="rounded-full bg-sunset px-5 py-2.5 text-[15px] font-bold text-white hover:bg-sunset-dark">
                {t('nav.signup')}
              </Link>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMenu((m) => !m)}
            aria-expanded={menu}
            aria-label={t('nav.menu')}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line lg:hidden"
          >
            <Icon name={menu ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
      {menu && (
        <nav aria-label="Mobile" className="border-t border-line bg-white px-4 pb-4 pt-2 lg:hidden">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="block rounded-xl px-3 py-3 text-base font-medium text-ink hover:bg-shell">
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-2 border-t border-line pt-3 sm:hidden">
            {user ? (
              <button type="button" onClick={signOut} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold">
                {t('nav.signout')}
              </button>
            ) : (
              <>
                <Link to="/signin" className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold">
                  {t('nav.signin')}
                </Link>
                <Link to="/signup" className="rounded-full bg-sunset px-4 py-2.5 text-sm font-bold text-white">
                  {t('nav.signup')}
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-24 bg-ink text-[#D9CCD3]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="font-display text-xl font-bold text-white">wanderwise</span>
          </div>
          <p className="max-w-xs text-[15px] leading-relaxed">{t('footer.tagline')}</p>
        </div>
        <div className="space-y-2.5 text-[15px]">
          <p className="font-semibold text-white">{t('footer.plan')}</p>
          <Link className="block hover:text-white" to="/plan">{t('nav.plan')}</Link>
          <Link className="block hover:text-white" to="/build">{t('nav.build')}</Link>
          <Link className="block hover:text-white" to="/#destinations">{t('nav.destinations')}</Link>
        </div>
        <div className="space-y-2.5 text-[15px]">
          <p className="font-semibold text-white">{t('footer.account')}</p>
          <Link className="block hover:text-white" to="/signin">{t('nav.signin')}</Link>
          <Link className="block hover:text-white" to="/trips">{t('nav.trips')}</Link>
        </div>
        <div className="space-y-2.5 text-[15px]">
          <p className="font-semibold text-white">{t('footer.about')}</p>
          <Link className="block hover:text-white" to="/credits">{t('footer.credits')}</Link>
          <a className="block hover:text-white" href="https://github.com/k1vlem/wanderwise" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-6 text-sm sm:px-6 lg:px-8">© 2026 Wanderwise · {t('footer.demo')}</p>
      </div>
    </footer>
  );
}

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-paper font-sans text-ink">
      <ScrollManager />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
