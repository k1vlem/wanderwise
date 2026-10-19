import { cityById, countryById } from '../data';
import type { I18n } from '../i18n';
import type { Day, Item, Plan } from './planner';

export type Category = 'flight' | 'transit' | 'hotel' | 'sight' | 'food' | 'free';

export interface ItemText {
  category: Category;
  title: string;
  note: string;
  flags: string[];
  cost: string;
}

const CATEGORY: Record<Item['kind'], Category> = {
  flightIn: 'flight',
  flightOut: 'flight',
  transferIn: 'transit',
  transferOut: 'transit',
  intercity: 'transit',
  checkin: 'hotel',
  checkout: 'hotel',
  sight: 'sight',
  lunch: 'food',
  dinner: 'food',
  free: 'free',
};

export function describeItem(item: Item, plan: Plan, i18n: I18n): ItemText {
  const { t, tn, pick, money, duration, weekday } = i18n;
  const city = cityById(item.city);
  const cityName = pick(city.n);
  const out: ItemText = { category: CATEGORY[item.kind], title: '', note: '', flags: [], cost: item.cost > 0 ? money(item.cost) : '—' };

  switch (item.kind) {
    case 'flightIn':
      out.title = t('item.flightIn', { city: cityName, code: city.airport });
      out.note = t('item.flightInNote', { option: t(`flight.${plan.choice.flight}`) });
      break;
    case 'flightOut':
      out.title = t('item.flightOut', { city: cityName, code: city.airport });
      out.note = t('item.flightOutNote');
      out.cost = t('item.incl');
      break;
    case 'transferIn':
    case 'transferOut':
      out.title = t(item.kind === 'transferIn' ? 'item.transferIn' : 'item.transferOut', { mode: t(`mode.${city.transfer.mode}`) });
      out.note = t('item.transferNote', { mins: city.transfer.mins });
      break;
    case 'checkin': {
      const tier = plan.choice.tier;
      out.title = t('item.checkin', { tier, area: city.areas[tier - 3] });
      out.note = t(tier >= 4 ? 'item.checkinNote' : 'item.checkinNoteRoom', { nights: tn('u.night', item.nights ?? 1) });
      break;
    }
    case 'checkout':
      out.title = t('item.checkout');
      out.note = t('item.checkoutNote');
      break;
    case 'intercity': {
      const link = countryById(city.country)!.link;
      out.title = t('item.intercity', { mode: t(`mode.${link.mode}`), from: cityName, to: pick(cityById(item.to!).n) });
      out.note = t('item.intercityNote', { duration: duration(link.mins) });
      break;
    }
    case 'sight': {
      const sight = city.sights.find((s) => s.id === item.ref)!;
      out.title = pick(sight.n);
      out.note = sight.fullDay ? `${t('item.dayTrip')} · ${duration(sight.hours * 60)}` : duration(sight.hours * 60);
      if (sight.book) out.flags.push(t('item.book'));
      if (sight.dress) out.flags.push(t('item.dress'));
      if (sight.closed?.length) out.flags.push(t('item.closed', { days: sight.closed.map(weekday).join(', ') }));
      if (item.cost === 0) out.cost = t('item.free0');
      break;
    }
    case 'lunch':
    case 'dinner': {
      const dish = city.dishes[Number(item.ref)];
      out.title = t(item.kind === 'lunch' ? 'item.lunch' : 'item.dinner', { dish: dish.n });
      out.note = pick(dish.d);
      break;
    }
    case 'free':
      out.title = t('item.free', { city: cityName });
      out.note = t('item.freeNote');
      break;
  }
  return out;
}

export function dayTitle(day: Day, i18n: I18n): string {
  const { t, pick } = i18n;
  const city = cityById(day.city);
  switch (day.kind) {
    case 'arrival':
      return t('day.arrival', { city: pick(city.n) });
    case 'move':
      return t('day.move', { from: pick(cityById(day.from!).n), to: pick(city.n) });
    case 'departure':
      return t('day.departure');
    case 'free':
      return t('day.free', { city: pick(city.n) });
    default: {
      const sight = city.sights.find((s) => s.id === day.ref);
      return sight ? pick(sight.n) : pick(city.n);
    }
  }
}

export const dayCost = (day: Day) => day.items.reduce((n, i) => n + i.cost, 0);

export function planTitle(plan: Plan, i18n: I18n): string {
  const names = plan.choice.stops.map((s) => i18n.pick(cityById(s.city).n));
  const places = names.length === 2 ? i18n.t('result.and', { a: names[0], b: names[1] }) : names[0];
  return i18n.t('result.title', { days: i18n.tn('u.day', plan.days.length), places });
}
