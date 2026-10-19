import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LANGS, type L7, type Lang } from '../data/types';
import { de } from './de';
import { en, type Dict, type Key, type Plural } from './en';
import { es } from './es';
import { fr } from './fr';
import { it } from './it';
import { ru } from './ru';
import { tr } from './tr';

const DICTS: Record<Lang, Dict> = { en, ru, es, de, fr, it, tr };

export const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
  tr: 'Türkçe',
};

const LOCALES: Record<Lang, string> = {
  en: 'en-GB',
  ru: 'ru-RU',
  es: 'es-ES',
  de: 'de-DE',
  fr: 'fr-FR',
  it: 'it-IT',
  tr: 'tr-TR',
};

const STORAGE_KEY = 'ww.lang';

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (LANGS as readonly string[]).includes(saved)) return saved as Lang;
  } catch {
    // Storage can be blocked; fall back to the browser language.
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.slice(0, 2).toLowerCase();
    if ((LANGS as readonly string[]).includes(base)) return base as Lang;
  }
  return 'en';
}

type Vars = Record<string, string | number>;

const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;

export interface I18n {
  lang: Lang;
  locale: string;
  setLang: (lang: Lang) => void;
  t: (key: Key, vars?: Vars) => string;
  /** Plural form: "{n} nights" */
  tn: (key: Key, n: number) => string;
  /** Pick the current language out of a 7-language tuple */
  pick: (l: L7) => string;
  money: (eur: number) => string;
  date: (iso: string, opts?: Intl.DateTimeFormatOptions) => string;
  weekday: (day: number) => string;
  duration: (mins: number) => string;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not saved; the choice still applies for this visit.
    }
  }, []);

  const value = useMemo<I18n>(() => {
    const dict = DICTS[lang];
    const locale = LOCALES[lang];
    const index = LANGS.indexOf(lang);
    const plural = new Intl.PluralRules(locale);
    const moneyFmt = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

    const raw = (key: Key) => dict[key] ?? en[key];
    const t = (key: Key, vars?: Vars) => {
      const msg = raw(key);
      return fill(typeof msg === 'string' ? msg : msg.other, vars);
    };
    const tn = (key: Key, n: number) => {
      const msg = raw(key);
      if (typeof msg === 'string') return fill(msg, { n });
      const form = plural.select(n) as keyof Plural;
      return fill(msg[form] ?? msg.other, { n });
    };
    const duration = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = Math.round(mins % 60);
      if (h === 0) return t('dur.min', { n: m });
      if (m === 0) return t('dur.h', { n: h });
      return t('dur.hmin', { h, m });
    };

    return {
      lang,
      locale,
      setLang,
      t,
      tn,
      pick: (l) => l[index] || l[0],
      money: (eur) => moneyFmt.format(Math.round(eur)),
      date: (iso, opts = { day: 'numeric', month: 'short' }) =>
        new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...opts }).format(new Date(`${iso}T12:00:00Z`)),
      // 7 Jan 2024 was a Sunday, so day 0 = Sunday like Date.getDay().
      weekday: (day) =>
        new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 7 + day, 12))),
      duration,
    };
  }, [lang, setLang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = value.t('meta.title');
  }, [lang, value]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n outside I18nProvider');
  return ctx;
}
