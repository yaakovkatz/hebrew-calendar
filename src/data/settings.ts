import { CITIES, DEFAULT_CITY_ID, findCity, type City } from '../lib/cities';

export type OpenOn = 'month' | 'day';

export type Settings = {
  cityId: string;
  /** Holidays by Israel (true) or the diaspora. Always passed explicitly to hebcal. */
  il: boolean;
  showEventsInCalendar: boolean;
  onboarded: boolean;
  openOn: OpenOn;
};

/** One JSON value in expo-sqlite/kv-store. Change the key only together with a migration. */
export const SETTINGS_KEY = 'settings.v1';

export const DEFAULT_SETTINGS: Settings = {
  cityId: DEFAULT_CITY_ID,
  il: true,
  showEventsInCalendar: true,
  onboarded: false,
  openOn: 'month',
};

/** Keeps only valid fields; anything missing, broken or unknown gets its default. */
export function sanitizeSettings(value: unknown): Settings {
  const v = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const bool = (x: unknown, d: boolean) => (typeof x === 'boolean' ? x : d);
  return {
    cityId: typeof v.cityId === 'string' && findCity(v.cityId) ? v.cityId : DEFAULT_SETTINGS.cityId,
    il: bool(v.il, DEFAULT_SETTINGS.il),
    showEventsInCalendar: bool(v.showEventsInCalendar, DEFAULT_SETTINGS.showEventsInCalendar),
    onboarded: bool(v.onboarded, DEFAULT_SETTINGS.onboarded),
    openOn: v.openOn === 'month' || v.openOn === 'day' ? v.openOn : DEFAULT_SETTINGS.openOn,
  };
}

/** Parses the stored string; never throws. */
export function parseSettings(raw: string | null | undefined): Settings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function serializeSettings(settings: Settings): string {
  return JSON.stringify(sanitizeSettings(settings));
}

/** The city for an id; an unknown id falls back to Jerusalem. */
export function cityFor(id: string | null | undefined): City {
  return findCity(id) ?? CITIES.find((c) => c.id === DEFAULT_CITY_ID)!;
}

export const HOLIDAYS_LABEL = { il: 'ארץ ישראל', diaspora: 'חו״ל' } as const;
export const OPEN_ON_LABEL: Record<OpenOn, string> = { month: 'חודש', day: 'יום' };

/** "40 דק׳ לפני" */
export function candleLightingLabel(city: City): string {
  return `${city.candleLightingMins} דק׳ לפני`;
}
