import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Plan } from './planner';

// Beta storage: accounts and trips live in this browser's localStorage.
// A server (for example Supabase) can replace these functions later without touching the pages.

export interface User {
  id: string;
  name: string;
  email: string;
}

interface StoredUser extends User {
  passHash: string;
}

export interface Trip {
  id: string;
  plan: Plan;
  status: 'draft' | 'booked';
  ref?: string;
  names?: string[];
  email?: string;
  createdAt: string;
}

const USERS = 'ww.users';
const SESSION = 'ww.session';
const PENDING = 'ww.pending';
const tripsKey = (userId: string) => `ww.trips.${userId}`;

function read<T>(key: string, fallback: T, storage: Storage = localStorage): T {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown, storage: Storage = localStorage) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is full or blocked; the change lives until the page reloads.
  }
}

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

async function hash(text: string): Promise<string> {
  // The salt keeps the old project name so accounts made before the rename can still sign in.
  const bytes = new TextEncoder().encode(`wanderwise:${text}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Error keys match the i18n dictionary. */
export type AuthError = 'auth.errExists' | 'auth.errWrong' | 'auth.errShort' | 'auth.errName' | 'auth.errEmail';

interface Store {
  user: User | null;
  signUp: (name: string, email: string, password: string) => Promise<AuthError | null>;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  signOut: () => void;
  trips: Trip[];
  saveTrip: (plan: Plan) => string;
  updateTrip: (id: string, patch: Partial<Trip>) => void;
  removeTrip: (id: string) => void;
  /** A plan waiting for the visitor to sign in */
  setPending: (plan: Plan, then: 'save' | 'book') => void;
  takePending: () => { plan: Plan; then: 'save' | 'book' } | null;
}

const Ctx = createContext<Store | null>(null);

function initialUser(): User | null {
  const id = read<string | null>(SESSION, null);
  const found = read<StoredUser[]>(USERS, []).find((u) => u.id === id);
  return found ? { id: found.id, name: found.name, email: found.email } : null;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [trips, setTrips] = useState<Trip[]>(() => {
    const u = initialUser();
    return u ? read<Trip[]>(tripsKey(u.id), []) : [];
  });

  const login = useCallback((u: StoredUser) => {
    write(SESSION, u.id);
    setUser({ id: u.id, name: u.name, email: u.email });
    setTrips(read<Trip[]>(tripsKey(u.id), []));
  }, []);

  // Always start from what is stored, so a stale render can't drop trips.
  const mutate = useCallback(
    (change: (list: Trip[]) => Trip[]) => {
      if (!user) return;
      const next = change(read<Trip[]>(tripsKey(user.id), []));
      write(tripsKey(user.id), next);
      setTrips(next);
    },
    [user],
  );

  const store = useMemo<Store>(
    () => ({
      user,
      async signUp(name, email, password) {
        const cleanEmail = email.trim().toLowerCase();
        if (!name.trim()) return 'auth.errName';
        if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return 'auth.errEmail';
        if (password.length < 6) return 'auth.errShort';
        const users = read<StoredUser[]>(USERS, []);
        if (users.some((u) => u.email === cleanEmail)) return 'auth.errExists';
        const created: StoredUser = { id: newId(), name: name.trim(), email: cleanEmail, passHash: await hash(password) };
        write(USERS, [...users, created]);
        login(created);
        return null;
      },
      async signIn(email, password) {
        const cleanEmail = email.trim().toLowerCase();
        const found = read<StoredUser[]>(USERS, []).find((u) => u.email === cleanEmail);
        if (!found || found.passHash !== (await hash(password))) return 'auth.errWrong';
        login(found);
        return null;
      },
      signOut() {
        try {
          localStorage.removeItem(SESSION);
        } catch {
          // Nothing stored.
        }
        setUser(null);
        setTrips([]);
      },
      trips,
      saveTrip(plan) {
        const trip: Trip = { id: newId(), plan, status: 'draft', createdAt: new Date().toISOString() };
        mutate((list) => [trip, ...list]);
        return trip.id;
      },
      updateTrip(id, patch) {
        mutate((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      },
      removeTrip(id) {
        mutate((list) => list.filter((t) => t.id !== id));
      },
      setPending(plan, then) {
        write(PENDING, { plan, then }, sessionStorage);
      },
      takePending() {
        const pending = read<{ plan: Plan; then: 'save' | 'book' } | null>(PENDING, null, sessionStorage);
        try {
          sessionStorage.removeItem(PENDING);
        } catch {
          // Nothing stored.
        }
        return pending;
      },
    }),
    [user, trips, login, mutate],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
}
