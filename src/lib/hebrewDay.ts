import {
  CandleLightingEvent,
  HDate,
  HebrewCalendar,
  ParshaEvent,
  Zmanim,
  getSedra,
} from '@hebcal/core';
import { City, toLocation } from './cities';

/** Calendar date (y, m, d) of `instant` as seen on the wall clock in `tzid`. */
export function civilDateIn(instant: Date, tzid: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tzid,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** A local Date at noon for that civil date; HDate and Zmanim only read its y/m/d. */
export function civilNoon(instant: Date, tzid: string): Date {
  const { year, month, day } = civilDateIn(instant, tzid);
  return new Date(year, month - 1, day, 12);
}

export function zmanimFor(instant: Date, city: City): Zmanim {
  return new Zmanim(toLocation(city), civilNoon(instant, city.tzid), false);
}

/**
 * The Hebrew date at `instant` in `city`.
 * hebcal's HDate flips at midnight; the app flips at sunset (PLAN.md).
 */
/**
 * The date a new item starts on. An event (birthday…) follows the Hebrew day, which flips at
 * sunset. A reminder's time is read on its date's daytime civil day, so after sunset it starts
 * on today's civil date: "19:10" then means tonight, not tomorrow evening.
 */
export function defaultItemDate(kind: 'event' | 'reminder', instant: Date, city: City): HDate {
  return kind === 'reminder' ? new HDate(civilNoon(instant, city.tzid)) : hebrewDateAt(instant, city);
}

export function hebrewDateAt(instant: Date, city: City): HDate {
  const hd = new HDate(civilNoon(instant, city.tzid));
  const sunset = zmanimFor(instant, city).sunset();
  if (!Number.isNaN(sunset.getTime()) && instant.getTime() >= sunset.getTime()) {
    return hd.next();
  }
  return hd;
}

/** 'י״ב חשון' — the day and month without the year. */
export function formatHebrewDay(hd: HDate): string {
  return hd.renderGematriya(true, true);
}

/** 'HH:MM' in the city's time zone, or '—' when the time doesn't exist. */
export function formatTime(date: Date | null | undefined, tzid: string): string {
  if (!date || Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: tzid,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/** Hebrew name of the parsha read on the Shabbat on or after `hd`. */
export function parshaOfWeek(hd: HDate, il: boolean): string | null {
  const shabbat = hd.onOrAfter(6);
  const result = getSedra(shabbat.getFullYear(), il).lookup(shabbat);
  if (result.chag) return null;
  return new ParshaEvent(result).render('he-x-NoNikud');
}

/** The next candle lighting (Shabbat or Yom Tov) from `instant`, within a week. */
export function nextCandleLighting(instant: Date, city: City): Date | null {
  const start = new HDate(civilNoon(instant, city.tzid));
  const events = HebrewCalendar.calendar({
    start,
    end: start.add(7, 'd'),
    location: toLocation(city),
    candlelighting: true,
    candleLightingMins: city.candleLightingMins,
    il: true,
  });
  const next = events.find(
    (ev) => ev instanceof CandleLightingEvent && ev.eventTime.getTime() > instant.getTime(),
  ) as CandleLightingEvent | undefined;
  return next ? next.eventTime : null;
}
