import { EUROPE_CITIES } from './cities';
import { EUROPE_COUNTRIES, ORIGINS } from './countries';
import type { City, Country, Dish, Origin, Region, Sight } from './types';
import { WORLD_CITIES, WORLD_COUNTRIES } from './world';

export * from './types';
export { ORIGINS };

export const COUNTRIES: Country[] = [...EUROPE_COUNTRIES, ...WORLD_COUNTRIES];
export const CITIES: City[] = [...EUROPE_CITIES, ...WORLD_CITIES];

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
export const countriesIn = (region: Region): Country[] => COUNTRIES.filter((c) => c.region === region);

// A trip destination is a country id, a whole region ("r:asia") or "any".
export const regionDest = (region: Region) => `r:${region}`;
const destRegion = (dest: string) => (dest.startsWith('r:') ? (dest.slice(2) as Region) : undefined);

export function isDestination(dest: string): boolean {
  const region = destRegion(dest);
  return dest === 'any' || countryMap.has(dest) || (!!region && countriesIn(region).length > 0);
}

/** Every city a destination covers. */
export function citiesFor(dest: string): City[] {
  if (countryMap.has(dest)) return citiesOf(dest);
  const region = destRegion(dest);
  return region ? CITIES.filter((c) => countryById(c.country)?.region === region) : CITIES;
}

/** A single country to start the trip builder with. */
export function builderCountry(dest: string): string {
  if (countryMap.has(dest)) return dest;
  const region = destRegion(dest);
  return (region && countriesIn(region)[0]?.id) || 'italy';
}

/** Photo files are downloaded by scripts/fetch-photos.mjs into public/photos. */
export const photoUrl = (id: string, size: 'sm' | 'lg' = 'sm') =>
  `${import.meta.env.BASE_URL}photos/${id}${size === 'sm' ? '-sm' : ''}.jpg`;

/** The photo used for a country card. */
export const countryPhoto = (c: Country) => c.cities[0];
export const sightPhoto = (s: Sight) => `s-${s.id}`;
export const dishPhoto = (d: Dish) => `d-${d.id}`;
