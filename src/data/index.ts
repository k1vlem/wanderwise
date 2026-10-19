import { CITIES } from './cities';
import { COUNTRIES, ORIGINS } from './countries';
import type { City, Country, Dish, Origin, Sight } from './types';

export * from './types';
export { CITIES, COUNTRIES, ORIGINS };

const cityMap = new Map(CITIES.map((c) => [c.id, c]));
const countryMap = new Map(COUNTRIES.map((c) => [c.id, c]));
const originMap = new Map(ORIGINS.map((o) => [o.id, o]));

export const cityById = (id: string): City => {
  const c = cityMap.get(id);
  if (!c) throw new Error(`Unknown city ${id}`);
  return c;
};
export const countryById = (id: string): Country | undefined => countryMap.get(id);
export const originById = (id: string): Origin => originMap.get(id) ?? ORIGINS[0];
export const citiesOf = (countryId: string): City[] => CITIES.filter((c) => c.country === countryId);

/** Photo files are downloaded by scripts/fetch-photos.mjs into public/photos. */
export const photoUrl = (id: string, size: 'sm' | 'lg' = 'sm') =>
  `${import.meta.env.BASE_URL}photos/${id}${size === 'sm' ? '-sm' : ''}.jpg`;

/** The photo used for a country card. */
export const countryPhoto = (c: Country) => c.cities[0];
export const sightPhoto = (s: Sight) => `s-${s.id}`;
export const dishPhoto = (d: Dish) => `d-${d.id}`;
