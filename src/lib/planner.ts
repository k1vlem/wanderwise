import { cityById, citiesFor, countryById, originById } from '../data';
import type { City, Interest, LatLon, Mode, Sight } from '../data';

export type Tier = 3 | 4 | 5;
export type FoodLevel = 0 | 1 | 2;
export type FlightOpt = 'saver' | 'standard' | 'flex';
export type Pace = 'relaxed' | 'balanced' | 'packed';

export interface TripInput {
  /** Country id, a region such as "r:asia", or "any" */
  country: string;
  origin: string;
  /** YYYY-MM-DD */
  start: string;
  nights: number;
  travelers: number;
  budget: number;
  interests: Interest[];
  pace: Pace;
}

export interface Stop {
  city: string;
  nights: number;
}

export interface Choice {
  stops: Stop[];
  tier: Tier;
  food: FoodLevel;
  flight: FlightOpt;
  /** Trip builder: only these sights */
  sights?: string[];
}

export type ItemKind =
  | 'flightIn'
  | 'flightOut'
  | 'transferIn'
  | 'transferOut'
  | 'checkin'
  | 'checkout'
  | 'intercity'
  | 'sight'
  | 'lunch'
  | 'dinner'
  | 'free';

export interface Item {
  time: string;
  kind: ItemKind;
  city: string;
  /** Sight id, or dish index for meals */
  ref?: string;
  /** Destination city for intercity trips */
  to?: string;
  nights?: number;
  cost: number;
}

export type DayKind = 'arrival' | 'explore' | 'dayTrip' | 'move' | 'departure' | 'free';

export interface Day {
  date: string;
  city: string;
  kind: DayKind;
  /** Previous city on a move day */
  from?: string;
  /** Main sight of the day, used as its title */
  ref?: string;
  items: Item[];
}

export interface Costs {
  flights: number;
  hotels: number;
  sights: number;
  food: number;
  transport: number;
  total: number;
}

export interface Plan {
  input: TripInput;
  choice: Choice;
  days: Day[];
  costs: Costs;
}

export const FLIGHT_MULT: Record<FlightOpt, number> = { saver: 0.8, standard: 1, flex: 1.35 };
const LUNCH_SHARE = 0.4;

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export const rooms = (travelers: number) => Math.ceil(travelers / 2);

const toMin = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const hhmm = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
const roundUp = (mins: number, step = 15) => Math.ceil(mins / step) * step;

/** Great-circle distance in km. */
export function distanceKm([lat1, lon1]: LatLon, [lat2, lon2]: LatLon): number {
  const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

// Very short hops are priced like a regional flight.
const flightKm = (cityId: string, originId: string) => Math.max(300, distanceKm(originById(originId).at, cityById(cityId).at));

/** Return fare per person to the city's airport, rounded to 5 EUR. Long-haul kilometres cost less than short-haul ones. */
export function flightPerPerson(cityId: string, originId: string, opt: FlightOpt): number {
  const km = flightKm(cityId, originId);
  const base = 110 + 0.1 * Math.min(km, 4000) + 0.06 * Math.max(0, km - 4000);
  return Math.round((base * FLIGHT_MULT[opt]) / 5) * 5;
}

/** Time in the air one way, in minutes, rounded to 5. */
export function flightMinutes(cityId: string, originId: string): number {
  return Math.round((flightKm(cityId, originId) / 780 + 0.5) * 12) * 5;
}

/** After a flight this long the first afternoon is kept for rest. */
const LONG_HAUL_MINS = 6 * 60;

// Getting to the station, port or airport and through it, on top of the ride itself.
const DOOR_TO_DOOR: Record<Mode, number> = { flight: 150, ferry: 60, train: 30, bus: 30, tram: 15, metro: 15 };

export function hotelTotal(city: City, tier: Tier, nights: number, travelers: number): number {
  return city.hotel[tier - 3] * nights * rooms(travelers);
}

/** Sights in the order the planner should try them. */
function sightQueue(city: City, interests: Interest[], only?: string[]): Sight[] {
  if (only) return city.sights.filter((s) => only.includes(s.id));
  return city.sights
    .map((s, i) => ({ s, score: (city.sights.length - i) * 2 + s.tags.filter((t) => interests.includes(t)).length * 6 }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.s);
}

function takeSight(queue: Sight[], test: (s: Sight) => boolean): Sight | undefined {
  const i = queue.findIndex(test);
  return i === -1 ? undefined : queue.splice(i, 1)[0];
}

export function buildPlan(input: TripInput, choice: Choice): Plan {
  const T = input.travelers;
  const firstCity = cityById(choice.stops[0].city);
  const countryId = firstCity.country;
  const country = countryById(countryId)!;
  const totalNights = choice.stops.reduce((n, s) => n + s.nights, 0);
  const flights = flightPerPerson(firstCity.id, input.origin, choice.flight) * T;
  const longHaul = flightMinutes(firstCity.id, input.origin) >= LONG_HAUL_MINS;

  const queues = new Map<string, Sight[]>();
  const dishTurn = new Map<string, { lunch: number; dinner: number }>();
  for (const stop of choice.stops) {
    queues.set(stop.city, sightQueue(cityById(stop.city), input.interests, choice.sights));
    dishTurn.set(stop.city, { lunch: 0, dinner: 0 });
  }

  const meal = (city: City, kind: 'lunch' | 'dinner', time: string): Item => {
    const turn = dishTurn.get(city.id)!;
    const options = city.dishes.map((d, i) => ({ d, i })).filter(({ d }) => d.meal === kind || d.meal === 'any');
    const pick = options[turn[kind] % options.length];
    turn[kind] += 1;
    const share = kind === 'lunch' ? LUNCH_SHARE : 1 - LUNCH_SHARE;
    return { time, kind, city: city.id, ref: String(pick.i), cost: Math.round(city.food[choice.food] * share) * T };
  };
  const sightItem = (city: City, s: Sight, time: string): Item => ({ time, kind: 'sight', city: city.id, ref: s.id, cost: s.pp * T });

  const days: Day[] = [];
  let dayNo = 0;

  choice.stops.forEach((stop, si) => {
    const city = cityById(stop.city);
    const queue = queues.get(city.id)!;
    const hotel = hotelTotal(city, choice.tier, stop.nights, T);

    // Plan the day trip (if any) for the second free day in this city.
    const exploreDays = stop.nights - 1;
    const dayTrip = exploreDays >= 2 ? queue.find((s) => s.fullDay) : undefined;
    let dayTripPlaced = false;

    for (let d = 0; d < stop.nights; d += 1, dayNo += 1) {
      const date = addDays(input.start, dayNo);
      const wd = weekday(date);
      const open = (s: Sight) => !(s.closed ?? []).includes(wd);

      if (dayNo === 0) {
        // Long-haul flights land later and leave travelers tired, so that day has no sightseeing.
        const items: Item[] = longHaul
          ? [
              { time: '14:00', kind: 'flightIn', city: city.id, cost: flights },
              { time: '14:45', kind: 'transferIn', city: city.id, cost: city.transfer.pp * T },
              { time: '16:00', kind: 'checkin', city: city.id, nights: stop.nights, cost: hotel },
            ]
          : [
              { time: '11:00', kind: 'flightIn', city: city.id, cost: flights },
              { time: '11:45', kind: 'transferIn', city: city.id, cost: city.transfer.pp * T },
              { time: '13:00', kind: 'checkin', city: city.id, nights: stop.nights, cost: hotel },
              meal(city, 'lunch', '13:45'),
            ];
        const light = longHaul ? undefined : takeSight(queue, (s) => open(s) && !s.fullDay && !s.early && s.hours <= 2 && (s.evening || s.pp === 0));
        if (light) items.push(sightItem(city, light, light.evening ? '18:30' : '16:00'));
        items.push(meal(city, 'dinner', light?.evening ? '20:30' : longHaul ? '19:30' : '20:00'));
        days.push({ date, city: city.id, kind: 'arrival', items });
        continue;
      }

      if (d === 0) {
        const prev = cityById(choice.stops[si - 1].city);
        const { link } = country;
        // Check in once the train, ferry or flight has arrived, but not before 13:00.
        const arrive = toMin('10:00') + link.mins + DOOR_TO_DOOR[link.mode];
        const checkin = Math.max(toMin('13:00'), roundUp(arrive + 30));
        const items: Item[] = [
          { time: '09:00', kind: 'checkout', city: prev.id, cost: 0 },
          { time: '10:00', kind: 'intercity', city: prev.id, to: city.id, cost: link.pp * T },
          { time: hhmm(checkin), kind: 'checkin', city: city.id, nights: stop.nights, cost: hotel },
        ];
        if (checkin <= toMin('14:30')) items.push(meal(city, 'lunch', hhmm(Math.max(checkin + 45, toMin('13:45')))));
        const late = checkin > toMin('15:00');
        const s =
          checkin <= toMin('17:30') ? takeSight(queue, (x) => open(x) && !x.fullDay && !x.early && x.hours <= 2.5 && (!late || !!x.evening)) : undefined;
        if (s) items.push(sightItem(city, s, s.evening ? '18:30' : '16:00'));
        items.push(meal(city, 'dinner', s?.evening ? '20:30' : '20:00'));
        days.push({ date, city: city.id, kind: 'move', from: prev.id, items });
        continue;
      }

      const exploreIndex = d - 1;
      if (dayTrip && !dayTripPlaced && exploreIndex >= 1 && open(dayTrip)) {
        takeSight(queue, (s) => s.id === dayTrip.id);
        dayTripPlaced = true;
        days.push({
          date,
          city: city.id,
          kind: 'dayTrip',
          ref: dayTrip.id,
          items: [sightItem(city, dayTrip, '08:00'), meal(city, 'lunch', '13:00'), meal(city, 'dinner', '20:00')],
        });
        continue;
      }

      const items: Item[] = [];
      const regular = (s: Sight) => open(s) && !s.fullDay && !s.early;
      // Spread the remaining sights over the remaining days instead of front-loading them.
      let daysLeft = exploreDays - exploreIndex;
      if (dayTrip && !dayTripPlaced && daysLeft > 1) daysLeft -= 1;
      const quota = Math.max(1, Math.ceil(queue.filter((s) => !s.fullDay && !s.early).length / daysLeft));
      let placed = 0;
      const early = input.pace !== 'relaxed' ? takeSight(queue, (s) => open(s) && !!s.early) : undefined;
      if (early) items.push(sightItem(city, early, '05:30'));
      const am = takeSight(queue, (s) => regular(s) && !s.evening);
      if (am) {
        items.push(sightItem(city, am, input.pace === 'relaxed' ? '10:00' : '09:00'));
        placed += 1;
      }
      items.push(meal(city, 'lunch', '13:00'));
      if (input.pace !== 'relaxed' && placed < quota) {
        const pm = takeSight(queue, (s) => regular(s) && !s.evening) ?? (input.pace === 'packed' ? takeSight(queue, regular) : undefined);
        if (pm) {
          items.push(sightItem(city, pm, '15:00'));
          placed += 1;
        }
      }
      const eve = placed < quota || input.pace === 'packed' ? takeSight(queue, (s) => regular(s) && !!s.evening) : undefined;
      if (eve) items.push(sightItem(city, eve, '18:30'));
      items.push(meal(city, 'dinner', eve ? '20:30' : '20:00'));

      const main = items.find((i) => i.kind === 'sight');
      if (!main) items.unshift({ time: '10:00', kind: 'free', city: city.id, cost: 0 });
      days.push({ date, city: city.id, kind: main ? 'explore' : 'free', ref: main?.ref, items });
    }
  });

  const last = cityById(choice.stops[choice.stops.length - 1].city);
  days.push({
    date: addDays(input.start, totalNights),
    city: last.id,
    kind: 'departure',
    items: [
      { time: '09:00', kind: 'checkout', city: last.id, cost: 0 },
      { time: '09:45', kind: 'transferOut', city: last.id, cost: last.transfer.pp * T },
      { time: '12:30', kind: 'flightOut', city: last.id, cost: 0 },
    ],
  });

  const sum = (kinds: ItemKind[]) =>
    days.reduce((n, day) => n + day.items.filter((i) => kinds.includes(i.kind)).reduce((m, i) => m + i.cost, 0), 0);
  const local = choice.stops.reduce((n, s) => n + cityById(s.city).local * s.nights * T, 0);
  const costs: Costs = {
    flights,
    hotels: sum(['checkin']),
    sights: sum(['sight']),
    food: sum(['lunch', 'dinner']),
    transport: sum(['transferIn', 'transferOut', 'intercity']) + local,
    total: 0,
  };
  costs.total = costs.flights + costs.hotels + costs.sights + costs.food + costs.transport;
  return { input, choice, days, costs };
}

export interface PlanOptions {
  /** Pick the next-best different route */
  variant?: number;
  /** Plan as if the budget were this (used by "make it cheaper") */
  budgetCap?: number;
  minFood?: FoodLevel;
}

export interface PlanResult {
  plan: Plan;
  fits: boolean;
  options: number;
}

function stopOptions(cities: City[], nights: number): Stop[][] {
  const out: Stop[][] = cities.map((c) => [{ city: c.id, nights }]);
  if (nights < 4) return out;
  const first = Math.max(2, Math.round(nights * 0.55));
  const second = nights - first;
  if (second < 2) return out;
  for (const a of cities) {
    for (const b of cities) {
      if (a.id !== b.id && a.country === b.country) out.push([{ city: a.id, nights: first }, { city: b.id, nights: second }]);
    }
  }
  return out;
}

function interestScore(stops: Stop[], interests: Interest[]): number {
  if (interests.length === 0) return 0;
  let score = 0;
  for (const stop of stops) {
    for (const s of cityById(stop.city).sights) score += s.tags.filter((t) => interests.includes(t)).length;
  }
  return score / stops.length;
}

/** Find the most comfortable trip that fits the budget. */
export function planTrip(input: TripInput, opts: PlanOptions = {}): PlanResult {
  const cities = citiesFor(input.country);
  const broad = !countryById(input.country);
  const cap = opts.budgetCap ?? input.budget;
  const scored: { plan: Plan; score: number; key: string }[] = [];
  let cheapest: Plan | undefined;

  for (const stops of stopOptions(cities, input.nights)) {
    const interest = interestScore(stops, input.interests) * (broad ? 4 : 2);
    for (const tier of [5, 4, 3] as Tier[]) {
      for (const food of [2, 1, 0] as FoodLevel[]) {
        if (opts.minFood !== undefined && food < opts.minFood) continue;
        for (const flight of ['standard', 'saver'] as FlightOpt[]) {
          const plan = buildPlan(input, { stops, tier, food, flight });
          if (!cheapest || plan.costs.total < cheapest.costs.total) cheapest = plan;
          if (plan.costs.total > cap) continue;
          // Days with nothing planned make a trip feel empty, so they count against it.
          const freeDays = plan.days.filter((d) => d.kind === 'free').length;
          const score =
            tier * 12 + food * 8 + (flight === 'standard' ? 6 : 0) + (stops.length === 2 ? 7 : 0) + interest - freeDays * 10 + plan.costs.total / 1000 +
            // Start in the main city, where most international flights land.
            (countryById(cityById(stops[0].city).country)?.cities[0] === stops[0].city ? 3 : 0);
          scored.push({ plan, score, key: stops.map((s) => s.city).join('>') });
        }
      }
    }
  }

  if (scored.length === 0) return { plan: cheapest!, fits: false, options: 0 };

  // Best plan for each route, best routes first.
  const best = new Map<string, { plan: Plan; score: number }>();
  for (const s of scored) {
    const cur = best.get(s.key);
    if (!cur || s.score > cur.score) best.set(s.key, s);
  }
  const routes = [...best.values()].sort((a, b) => b.score - a.score);
  const pick = routes[(opts.variant ?? 0) % routes.length];
  // When the cap is lower than the real budget, show the plan against the real budget.
  return { plan: { ...pick.plan, input }, fits: true, options: routes.length };
}

/** Rough cost of 7 nights per person without flights: 3★ shared room, street food, top sights. */
export function weekFromPerPerson(city: City): number {
  const sights = city.sights.slice(0, 3).reduce((n, s) => n + s.pp, 0);
  return Math.round((city.hotel[0] * 7) / 2 + city.food[0] * 7 + city.local * 7 + sights);
}

/** Sample "flight + 4★ hotel" price per person for the deals block. */
export function dealPerPerson(city: City, nights: number): number {
  const flight = flightPerPerson(city.id, 'europe', 'standard');
  return Math.round(flight + (city.hotel[1] * nights) / 2);
}
