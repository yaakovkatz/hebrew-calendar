import { HDate, HebrewCalendar } from '@hebcal/core';
import { dayLetters, hebrewMonthName } from './month';

export type EventType = 'birthday' | 'anniversary' | 'other';
export type ReminderTime = 'evening' | 'morning' | 'week';

/** A yearly date kept by its Hebrew date (PLAN.md: the Hebrew date is the source of truth). */
export type FamilyEvent = {
  id: number;
  type: EventType;
  title: string;
  hDay: number;
  hMonth: number;
  hYear: number;
  afterSunset: boolean;
  /** The original Gregorian date (yyyy-mm-dd) when the user entered one. */
  gregDate: string | null;
  reminder: ReminderTime;
};

export type Upcoming = {
  event: FamilyEvent;
  date: HDate;
  daysUntil: number;
  /** Age or years married on that date */
  years: number;
};

export const TYPE_LABEL: Record<EventType, string> = {
  birthday: 'יום הולדת',
  anniversary: 'נישואין',
  other: 'אחר',
};

/** The Hebrew date of a Gregorian day; after sunset it is already the next Hebrew day. */
export function hebrewFromGregorian(year: number, month: number, day: number, afterSunset: boolean): HDate {
  const hd = new HDate(new Date(year, month - 1, day, 12));
  return afterSunset ? hd.next() : hd;
}

/** The next time the event falls on or after `today`, following hebcal's Adar and 30th-of-month rules. */
export function nextOccurrence(event: FamilyEvent, today: HDate): HDate {
  const original = new HDate(event.hDay, event.hMonth, event.hYear);
  for (let year = Math.max(today.getFullYear(), event.hYear); ; year++) {
    const hd = HebrewCalendar.getBirthdayOrAnniversary(year, original);
    if (hd && hd.abs() >= today.abs()) return hd;
  }
}

export function upcoming(events: FamilyEvent[], today: HDate): Upcoming[] {
  return events
    .map((event) => {
      const date = nextOccurrence(event, today);
      return { event, date, daysUntil: date.abs() - today.abs(), years: date.getFullYear() - event.hYear };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil || a.event.title.localeCompare(b.event.title, 'he'));
}

/** 'היום', 'מחר' or 'בעוד 13 ימים' */
export function whenLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'היום';
  if (daysUntil === 1) return 'מחר';
  return `בעוד ${daysUntil} ימים`;
}

/** 'יום ההולדת של אמא', 'יום הנישואין של ההורים' */
export function headline(event: FamilyEvent): string {
  if (event.type === 'birthday') return `יום ההולדת של ${event.title}`;
  if (event.type === 'anniversary') return `יום הנישואין של ${event.title}`;
  return event.title;
}

/** Gender-neutral: 'יום הולדת 64', 'שנה 38' (PLAN.md) */
export function yearsLabel(item: Upcoming): string | null {
  if (item.years <= 0) return null;
  if (item.event.type === 'birthday') return `יום הולדת ${item.years}`;
  if (item.event.type === 'anniversary') return `שנה ${item.years}`;
  return null;
}

/** 'כ״ה חשוון' */
export function shortHebrewDate(hd: HDate): string {
  const day = dayLetters(hd.getDate());
  const withMark = day.length === 1 ? `${day}׳` : `${day.slice(0, -1)}״${day.slice(-1)}`;
  return `${withMark} ${hebrewMonthName(hd.getMonth(), hd.getFullYear())}`;
}
