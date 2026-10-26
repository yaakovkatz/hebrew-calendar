import { HDate, HebrewCalendar } from '@hebcal/core';
import { dayLetters, hebrewMonthName } from './month';

export type EventType = 'birthday' | 'anniversary' | 'yahrzeit' | 'aliyah' | 'other';
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
  /** Only for 'other': show "שנה N" like an anniversary. */
  showYears: boolean;
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
  yahrzeit: 'אזכרה',
  aliyah: 'עלייה לארץ',
  other: 'אחר',
};

/** The order of the "סוג" sheet, each with its short grey hint (approved mockup 1ב). */
export const EVENT_TYPES: { value: EventType; label: string; hint: string }[] = [
  { value: 'birthday', label: TYPE_LABEL.birthday, hint: 'יום ההולדת של … · גיל' },
  { value: 'anniversary', label: TYPE_LABEL.anniversary, hint: 'יום הנישואין של … · שנה' },
  { value: 'yahrzeit', label: TYPE_LABEL.yahrzeit, hint: 'האזכרה של … · שנה' },
  { value: 'aliyah', label: TYPE_LABEL.aliyah, hint: 'יום העלייה של … · שנה' },
  { value: 'other', label: TYPE_LABEL.other, hint: 'שם חופשי, ואפשר להראות שנים' },
];

/** The Hebrew date of a Gregorian day; after sunset it is already the next Hebrew day. */
export function hebrewFromGregorian(year: number, month: number, day: number, afterSunset: boolean): HDate {
  const hd = new HDate(new Date(year, month - 1, day, 12));
  return afterSunset ? hd.next() : hd;
}

/**
 * The next time the event falls on or after `today`, following hebcal's Adar and 30th-of-month rules.
 * A yahrzeit follows hebcal's yahrzeit rules (getYahrzeit), which differ from birthdays:
 * e.g. a death in Adar of a regular year is kept in Adar I of a leap year, a birthday in Adar II.
 * The first yahrzeit is a year after the date itself.
 */
export function nextOccurrence(event: FamilyEvent, today: HDate): HDate {
  const original = new HDate(event.hDay, event.hMonth, event.hYear);
  const yahrzeit = event.type === 'yahrzeit';
  const first = yahrzeit ? event.hYear + 1 : event.hYear;
  for (let year = Math.max(today.getFullYear(), first); ; year++) {
    const hd = yahrzeit
      ? HebrewCalendar.getYahrzeit(year, original)
      : HebrewCalendar.getBirthdayOrAnniversary(year, original);
    if (hd && hd.abs() >= today.abs()) return hd;
  }
}

export type MitzvahKind = 'bar' | 'bat';

/** Bar mitzvah: the 13th Hebrew birthday; bat mitzvah: the 12th (birthday rules for Adar and the 30th). */
export function mitzvahDate(birth: { hDay: number; hMonth: number; hYear: number }, kind: MitzvahKind): HDate {
  const original = new HDate(birth.hDay, birth.hMonth, birth.hYear);
  const hd = HebrewCalendar.getBirthdayOrAnniversary(birth.hYear + (kind === 'bar' ? 13 : 12), original);
  return hd ?? original;
}

/** 'בר מצווה של דוד' / 'בת מצווה של נועה' */
export function mitzvahTitle(name: string, kind: MitzvahKind): string {
  return `${kind === 'bar' ? 'בר' : 'בת'} מצווה של ${name}`;
}

export function upcoming(events: FamilyEvent[], today: HDate): Upcoming[] {
  return events
    .map((event) => {
      const date = nextOccurrence(event, today);
      return { event, date, daysUntil: date.abs() - today.abs(), years: date.getFullYear() - event.hYear };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil || a.event.title.localeCompare(b.event.title, 'he'));
}

/** Day numbers (HDate.abs) between start and end, inclusive, that have at least one event. */
export function eventDaysInRange(events: FamilyEvent[], start: HDate, end: HDate): Set<number> {
  const days = new Set<number>();
  for (const event of events) {
    const occ = nextOccurrence(event, start);
    if (occ.abs() <= end.abs()) days.add(occ.abs());
  }
  return days;
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
  if (event.type === 'yahrzeit') return `האזכרה של ${event.title}`;
  if (event.type === 'aliyah') return `יום העלייה של ${event.title}`;
  return event.title;
}

function countsYears(event: Pick<FamilyEvent, 'type' | 'showYears'>): boolean {
  return event.type !== 'other' || event.showYears;
}

/** Gender-neutral: 'יום הולדת 64', 'שנה 38' (PLAN.md); 'אחר' only with showYears. */
export function yearsLabel(item: Upcoming): string | null {
  if (item.years <= 0 || !countsYears(item.event)) return null;
  if (item.event.type === 'birthday') return `יום הולדת ${item.years}`;
  return `שנה ${item.years}`;
}

/** The orange preview line on the add screen: 'יופיע: יום ההולדת של נועה · 9', 'יופיע: האזכרה של סבא · שנה 3'. */
export function previewLine(event: FamilyEvent, today: HDate): string {
  const date = nextOccurrence(event, today);
  const years = date.getFullYear() - event.hYear;
  let suffix: string | null = null;
  if (years > 0 && countsYears(event)) suffix = event.type === 'birthday' ? String(years) : `שנה ${years}`;
  return `יופיע: ${[headline(event), suffix].filter(Boolean).join(' · ')}`;
}

export const REMINDER_LABEL: Record<ReminderTime, string> = {
  evening: 'בערב שבו היום מתחיל',
  morning: 'בבוקר',
  week: 'שבוע לפני',
};

/** Row label for the original date on the details screen; gender-neutral. */
export function originalDateLabel(type: EventType): string {
  if (type === 'birthday') return 'תאריך לידה';
  if (type === 'anniversary') return 'תאריך החתונה';
  if (type === 'yahrzeit') return 'תאריך הפטירה';
  if (type === 'aliyah') return 'תאריך העלייה';
  return 'התאריך';
}

/** 'כ״ה חשוון' */
export function shortHebrewDate(hd: HDate): string {
  const day = dayLetters(hd.getDate());
  const withMark = day.length === 1 ? `${day}׳` : `${day.slice(0, -1)}״${day.slice(-1)}`;
  return `${withMark} ${hebrewMonthName(hd.getMonth(), hd.getFullYear())}`;
}
