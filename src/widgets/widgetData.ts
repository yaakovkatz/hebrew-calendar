// What each home-screen widget shows. Pure logic: no native imports, so Jest can test it.
import { HDate, getSedra, Locale } from '@hebcal/core';
import type { City } from '@/lib/cities';
import { headline, shortHebrewDate, upcoming, whenLabel, type FamilyEvent } from '@/lib/events';
import { civilDateIn, civilNoon, formatTime, hebrewDateAt } from '@/lib/hebrewDay';
import { buildMonth, WEEKDAYS } from '@/lib/month';
import { nextReminderDate, type Reminder } from '@/lib/reminders';
import { dayZmanim, nextZman, upcomingShabbatTimes } from '@/lib/zmanim';

export const EMPTY_NEXT_TITLE = 'עוד אין אירועים';
export const EMPTY_NEXT_HINT = 'מוסיפים באפליקציה';

export type WidgetInput = {
  now: Date;
  city: City;
  il: boolean;
  events: FamilyEvent[];
  reminders: Reminder[];
};

// ---------- "תאריך עברי" (small) ----------

export type DateWidgetData = { weekday: string; day: string; month: string };

/** 'שישי' / 'י״ב' / 'חשוון'. The Hebrew day (and its weekday) flips at sunset. */
export function dateWidgetData(now: Date, city: City): DateWidgetData {
  const hd = hebrewDateAt(now, city);
  const full = shortHebrewDate(hd);
  const space = full.indexOf(' ');
  return { weekday: WEEKDAYS[hd.getDay()], day: full.slice(0, space), month: full.slice(space + 1) };
}

// ---------- "הבא בתור" (small) ----------

export type NextWidgetData =
  | { kind: 'event' | 'reminder'; when: string; title: string }
  | { kind: 'empty'; when: string; title: string };

type Candidate = { kind: 'event' | 'reminder'; daysUntil: number; time: string; when: string; title: string };

function nowHHMM(now: Date, tzid: string): string {
  return formatTime(now, tzid);
}

/** A reminder's Hebrew date maps to its daytime civil day; true when its time on that day has passed. */
function reminderTimePassed(hd: HDate, time: string | null, now: Date, city: City): boolean {
  if (!time) return false;
  const g = hd.greg();
  const today = civilDateIn(now, city.tzid);
  const sameDay = g.getFullYear() === today.year && g.getMonth() + 1 === today.month && g.getDate() === today.day;
  return sameDay && time <= nowHHMM(now, city.tzid);
}

/** The nearest family date or reminder. Ties go to the family date, then the earlier time. */
export function nextWidgetData(input: WidgetInput): NextWidgetData {
  const { now, city, events, reminders } = input;
  const today = hebrewDateAt(now, city);
  const candidates: Candidate[] = [];

  const [firstEvent] = upcoming(events, today);
  if (firstEvent) {
    candidates.push({
      kind: 'event',
      daysUntil: firstEvent.daysUntil,
      time: '',
      when: whenLabel(firstEvent.daysUntil),
      title: headline(firstEvent.event),
    });
  }

  for (const rem of reminders) {
    let date = nextReminderDate(rem, today);
    if (date && reminderTimePassed(date, rem.time, now, city)) {
      date = rem.repeat === 'yearly' ? nextReminderDate(rem, date.next()) : null;
    }
    if (!date) continue;
    const daysUntil = date.abs() - today.abs();
    const when = whenLabel(daysUntil);
    candidates.push({
      kind: 'reminder',
      daysUntil,
      time: rem.time ?? '',
      when: rem.time ? `${when} · ${rem.time}` : when,
      title: rem.title,
    });
  }

  candidates.sort(
    (a, b) =>
      a.daysUntil - b.daysUntil ||
      (a.kind === b.kind ? 0 : a.kind === 'event' ? -1 : 1) ||
      a.time.localeCompare(b.time) ||
      a.title.localeCompare(b.title, 'he'),
  );
  const first = candidates[0];
  if (!first) return { kind: 'empty', when: EMPTY_NEXT_HINT, title: EMPTY_NEXT_TITLE };
  return { kind: first.kind, when: first.when, title: first.title };
}

// ---------- "זמנים ושבת" (medium) ----------

export type ZmanimWidgetData = {
  /** 'שקיעה' */
  nextTitle: string | null;
  /** '16:47' */
  nextTime: string | null;
  /** 'שבת לך־לך', 'חג', or null when nothing is coming this week */
  shabbatTitle: string | null;
  /** 'נרות 17:08' */
  candles: string | null;
  /** 'צאת 18:20' */
  havdalah: string | null;
};

function parshaName(shabbat: HDate, il: boolean): string | null {
  const result = getSedra(shabbat.getFullYear(), il).lookup(shabbat);
  if (result.chag) return null;
  return result.parsha.map((p) => Locale.gettext(p, 'he-x-NoNikud')).join('־');
}

/** The day that starts with these candles (or ends with this havdalah): 'שבת לך־לך', 'שבת' or 'חג'. */
function dayOffTitle(day: HDate, il: boolean): string {
  if (day.getDay() !== 6) return 'חג';
  const parsha = parshaName(day, il);
  return parsha ? `שבת ${parsha}` : 'שבת';
}

export function zmanimWidgetData(input: Pick<WidgetInput, 'now' | 'city' | 'il'>): ZmanimWidgetData {
  const { now, city, il } = input;
  const tz = city.tzid;

  // After tzeit the next zman is tomorrow's first one.
  const next =
    nextZman(now, city) ??
    dayZmanim(new Date(now.getTime() + 24 * 3600_000), city).find((z) => z.time.getTime() > now.getTime()) ??
    null;

  const times = upcomingShabbatTimes(now, city, new HDate(civilNoon(now, tz)));
  let shabbatTitle: string | null = null;
  if (times.candles) shabbatTitle = dayOffTitle(new HDate(civilNoon(times.candles, tz)).next(), il);
  else if (times.havdalah) shabbatTitle = dayOffTitle(new HDate(civilNoon(times.havdalah, tz)), il);

  return {
    nextTitle: next?.label ?? null,
    nextTime: next ? formatTime(next.time, tz) : null,
    shabbatTitle,
    candles: times.candles ? `נרות ${formatTime(times.candles, tz)}` : null,
    havdalah: times.havdalah ? `צאת ${formatTime(times.havdalah, tz)}` : null,
  };
}

// ---------- "החודש" (large) ----------

export type MonthWidgetCell = { label: string; inMonth: boolean; isShabbat: boolean; isToday: boolean };
export type MonthWidgetData = { title: string; weekdays: string[]; weeks: MonthWidgetCell[][] };

/** Weeks Sunday → Shabbat (logical order; the component mirrors them for RTL). */
export function monthWidgetData(input: Pick<WidgetInput, 'now' | 'city' | 'il'>): MonthWidgetData {
  const today = hebrewDateAt(input.now, input.city);
  const grid = buildMonth(today.getFullYear(), today.getMonth(), today, input.il);
  const weeks: MonthWidgetCell[][] = [];
  grid.cells.forEach((c, i) => {
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push({
      label: c.inMonth ? c.label : '',
      inMonth: c.inMonth,
      isShabbat: c.isShabbat,
      isToday: c.isToday,
    });
  });
  return { title: `${grid.title} ${grid.yearLabel}`, weekdays: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'], weeks };
}
