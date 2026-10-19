import { INTERESTS, ORIGINS, isDestination, type Interest } from '../data';
import { addDays, type Pace, type TripInput } from './planner';

export const todayIso = () => new Date().toISOString().slice(0, 10);
export const defaultStart = () => addDays(todayIso(), 45);

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const DEFAULT_INPUT: Omit<TripInput, 'start'> = {
  country: 'any',
  origin: 'europe',
  nights: 7,
  travelers: 2,
  budget: 3000,
  interests: ['history', 'food'],
  pace: 'balanced',
};

/** Read trip settings from the URL, falling back to sensible defaults. */
export function inputFromQuery(q: URLSearchParams): TripInput {
  const country = q.get('country') ?? DEFAULT_INPUT.country;
  const origin = q.get('origin') ?? DEFAULT_INPUT.origin;
  const start = q.get('start') ?? '';
  const interests = (q.get('likes') ?? '').split(',').filter((x): x is Interest => (INTERESTS as string[]).includes(x));
  const pace = q.get('pace');
  return {
    country: isDestination(country) ? country : 'any',
    origin: ORIGINS.some((o) => o.id === origin) ? origin : 'europe',
    start: /^\d{4}-\d{2}-\d{2}$/.test(start) && start >= todayIso() ? start : defaultStart(),
    nights: clamp(Number(q.get('nights')) || DEFAULT_INPUT.nights, 2, 14),
    travelers: clamp(Number(q.get('travelers')) || DEFAULT_INPUT.travelers, 1, 6),
    budget: clamp(Number(q.get('budget')) || DEFAULT_INPUT.budget, 200, 50000),
    interests: interests.length ? interests : DEFAULT_INPUT.interests,
    pace: pace === 'relaxed' || pace === 'packed' ? (pace as Pace) : 'balanced',
  };
}

export function queryFromInput(input: TripInput, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams({
    country: input.country,
    origin: input.origin,
    start: input.start,
    nights: String(input.nights),
    travelers: String(input.travelers),
    budget: String(input.budget),
    likes: input.interests.join(','),
    pace: input.pace,
    ...extra,
  });
  return q.toString();
}
