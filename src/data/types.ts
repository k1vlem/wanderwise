export const LANGS = ['en', 'ru', 'es', 'de', 'fr', 'it', 'tr'] as const;
export type Lang = (typeof LANGS)[number];

// One string per language, in the order of LANGS.
export type L7 = readonly [string, string, string, string, string, string, string];

export type Interest = 'history' | 'art' | 'food' | 'nature' | 'views' | 'nightlife' | 'beach' | 'shopping';
export const INTERESTS: Interest[] = ['history', 'art', 'food', 'nature', 'views', 'nightlife', 'beach', 'shopping'];

export type Mode = 'train' | 'tram' | 'bus' | 'metro' | 'ferry' | 'flight';

export interface Sight {
  id: string;
  n: L7;
  /** Ticket price per person, EUR */
  pp: number;
  hours: number;
  tags: Interest[];
  /** Days of the week it is closed, 0 = Sunday */
  closed?: number[];
  book?: boolean;
  dress?: boolean;
  /** Best at sunset or in the evening */
  evening?: boolean;
  /** Takes the whole day (day trip) */
  fullDay?: boolean;
  /** Starts before sunrise */
  early?: boolean;
}

export interface Dish {
  id: string;
  n: string;
  d: L7;
  /** Typical price per person, EUR */
  pp: number;
  meal: 'lunch' | 'dinner' | 'any';
}

export interface City {
  id: string;
  country: string;
  n: L7;
  airport: string;
  /** Hotel room per night for 3★, 4★, 5★ */
  hotel: readonly [number, number, number];
  /** Neighbourhood for 3★, 4★, 5★ */
  areas: readonly [string, string, string];
  /** Food per person per day: street food, restaurants, foodie */
  food: readonly [number, number, number];
  /** Public transport per person per day */
  local: number;
  transfer: { mode: Mode; mins: number; pp: number };
  sights: Sight[];
  dishes: Dish[];
}

export interface Country {
  id: string;
  n: L7;
  blurb: L7;
  /** Return economy fare per person from elsewhere in Europe */
  fare: number;
  currency: string;
  level: 1 | 2 | 3 | 4;
  cities: [string, string];
  /** How to get between the two cities */
  link: { mode: Mode; mins: number; pp: number };
}

export interface Origin {
  id: string;
  n: L7;
  /** Fare multiplier compared with flying from elsewhere in Europe */
  mult: number;
}
