import { CandleLightingEvent, HavdalahEvent, HDate, HebrewCalendar, Location, Zmanim, flags } from '@hebcal/core';
import { City, toLocation } from './cities';
import { headline, nextOccurrence, yearsLabel, type FamilyEvent } from './events';
import { formatTime, hebrewDateAt, parshaOfWeek } from './hebrewDay';
import { hebrewDateWithB, nextReminderDate, type Reminder } from './reminders';

// Pure planning only: no expo imports, so everything here runs in Jest (PLAN.md "התראות").

export type PlannedKind = 'event' | 'reminder' | 'shabbat' | 'merged';

export type PlannedNotification = {
  /** Stable and unique, used as the OS notification id. */
  id: string;
  at: Date;
  title: string;
  body: string;
  kind: PlannedKind;
};

export type PlanInput = {
  now: Date;
  events: FamilyEvent[];
  reminders: Reminder[];
  city: City;
  il: boolean;
  horizonDays?: number;
};

/** Android keeps a limited number of alarms per app; we keep the soonest. */
export const MAX_SCHEDULED = 60;
export const DEFAULT_HORIZON_DAYS = 30;
export const MORNING = { h: 8, m: 0 };
export const EVENING_BEFORE = { h: 20, m: 0 };
export const SHABBAT_NOTICE_MIN = 120;
export const MOVED_BEFORE_CANDLES_MIN = 30;
export const COUNTDOWN_MIN = 180;

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

// ---------------------------------------------------------------- time helpers

/** Minutes the wall clock in `tzid` is ahead of UTC at `ms`. */
function offsetMinutes(ms: number, tzid: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tzid,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return Math.round((wall - Math.floor(ms / MIN) * MIN) / MIN);
}

/** The instant when the wall clock in `tzid` shows y-m-d h:m. */
export function zonedTime(year: number, month: number, day: number, h: number, m: number, tzid: string): Date {
  const guess = Date.UTC(year, month - 1, day, h, m);
  let t = guess - offsetMinutes(guess, tzid) * MIN;
  const second = guess - offsetMinutes(t, tzid) * MIN;
  if (second !== t) t = second;
  return new Date(t);
}

/** The civil (daytime) day of a Hebrew date. */
function civilDay(hd: HDate): { year: number; month: number; day: number } {
  const d = hd.greg();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function atTime(hd: HDate, h: number, m: number, city: City): Date {
  const { year, month, day } = civilDay(hd);
  return zonedTime(year, month, day, h, m, city.tzid);
}

/** Sunset on the civil day of `hd`. */
function sunsetOn(hd: HDate, city: City): Date {
  const { year, month, day } = civilDay(hd);
  return new Zmanim(toLocation(city), new Date(year, month - 1, day, 12), false).sunset();
}

function parseTime(time: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  return { h: Number(match[1]), m: Number(match[2]) };
}

const valid = (d: Date) => !Number.isNaN(d.getTime());

// ---------------------------------------------------------------- Shabbat and Yom Tov

/** From the first candle lighting to havdalah. Second-day and motzei-Shabbat lightings stay inside. */
export type RestPeriod = {
  candles: Date;
  havdalah: Date;
  /** 'שבת לך־לך', 'פסח א׳', 'ראש השנה 5787' */
  name: string;
  isChag: boolean;
};

function periodName(candleDay: HDate, il: boolean): { name: string; isChag: boolean } {
  const day = candleDay.next();
  const chag = (HebrewCalendar.getHolidaysOnDate(day, il) ?? []).find((ev) => (ev.getFlags() & flags.CHAG) !== 0);
  if (chag) return { name: chag.render('he-x-NoNikud'), isChag: true };
  const parsha = day.getDay() === 6 ? parshaOfWeek(day, il) : null;
  return { name: parsha ? parsha.replace(/^פרשת /, 'שבת ') : 'שבת', isChag: false };
}

/** Rest periods that overlap [from, to], by hebcal candle-lighting and havdalah times for the city. */
export function restPeriods(from: Date, to: Date, city: City, il: boolean): RestPeriod[] {
  // Extra days on each side so a period that is already running, or ends after `to`, is whole.
  const start = new HDate(new Date(from.getTime() - 4 * DAY));
  const end = new HDate(new Date(to.getTime() + 3 * DAY));
  // hebcal takes the schedule from the Location when it is in Israel, so `il` goes there too.
  const location = new Location(city.latitude, city.longitude, il, city.tzid, city.name, il ? 'IL' : undefined);
  const evs = HebrewCalendar.calendar({
    start,
    end,
    location,
    candlelighting: true,
    candleLightingMins: city.candleLightingMins,
    il,
  });
  const periods: RestPeriod[] = [];
  let open: { candles: Date; name: string; isChag: boolean } | null = null;
  for (const ev of evs) {
    if (ev instanceof CandleLightingEvent) {
      if (!open) open = { candles: ev.eventTime, ...periodName(ev.getDate(), il) };
    } else if (ev instanceof HavdalahEvent) {
      // Havdalah without a candle lighting in range: the period began before `start`; it ended long before `from`.
      if (open) periods.push({ ...open, havdalah: ev.eventTime });
      open = null;
    }
  }
  return periods.filter((p) => p.havdalah.getTime() >= from.getTime() && p.candles.getTime() <= to.getTime());
}

function periodAt(at: Date, periods: RestPeriod[]): RestPeriod | undefined {
  const t = at.getTime();
  return periods.find((p) => t >= p.candles.getTime() && t < p.havdalah.getTime());
}

// ---------------------------------------------------------------- candidates

function eventCandidates(events: FamilyEvent[], today: HDate, city: City): PlannedNotification[] {
  const out: PlannedNotification[] = [];
  for (const event of events) {
    const date = nextOccurrence(event, today);
    const years = date.getFullYear() - event.hYear;
    const label = yearsLabel({ event, date, daysUntil: date.abs() - today.abs(), years });
    const body = [hebrewDateWithB(date), label].filter(Boolean).join(' · ');
    let at: Date;
    if (event.reminder === 'evening') at = sunsetOn(date.prev(), city);
    else if (event.reminder === 'week') at = atTime(date.subtract(7, 'd'), MORNING.h, MORNING.m, city);
    else at = atTime(date, MORNING.h, MORNING.m, city);
    if (!valid(at)) at = atTime(date, MORNING.h, MORNING.m, city);
    out.push({
      id: `event-${event.id}-${event.reminder}-${date.getFullYear()}`,
      at,
      title: headline(event),
      body,
      kind: 'event',
    });
  }
  return out;
}

function reminderCandidates(reminders: Reminder[], today: HDate, city: City): PlannedNotification[] {
  const out: PlannedNotification[] = [];
  for (const rem of reminders) {
    const date = nextReminderDate(rem, today);
    if (!date) continue;
    const time = rem.time ? parseTime(rem.time) : null;
    const alert = rem.alert === 'hour' && !time ? 'morning' : rem.alert;
    let at: Date;
    if (alert === 'hour' && time) at = new Date(atTime(date, time.h, time.m, city).getTime() - 60 * MIN);
    else if (alert === 'day') at = atTime(date.prev(), EVENING_BEFORE.h, EVENING_BEFORE.m, city);
    else at = atTime(date, MORNING.h, MORNING.m, city);
    const body = [hebrewDateWithB(date), rem.time].filter(Boolean).join(' · ');
    out.push({
      id: `reminder-${rem.id}-${alert}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      at,
      title: rem.title,
      body,
      kind: 'reminder',
    });
  }
  return out;
}

function shabbatCandidates(periods: RestPeriod[], city: City): PlannedNotification[] {
  return periods.map((p) => ({
    id: `shabbat-${p.candles.getTime()}`,
    at: new Date(p.candles.getTime() - SHABBAT_NOTICE_MIN * MIN),
    title: p.name,
    body: `הדלקת נרות היום ב-${formatTime(p.candles, city.tzid)}`,
    kind: 'shabbat' as const,
  }));
}

// ---------------------------------------------------------------- the plan

/**
 * Everything to schedule for the coming `horizonDays`, soonest first (PLAN.md "התראות"):
 * - events at sunset of the evening the date begins, 08:00 on the day, or 08:00 a week before
 * - reminders an hour before, 08:00 on the day, or 20:00 the day before
 * - Shabbat and Yom Tov two hours before candle lighting
 * Nothing fires between candle lighting and havdalah: such a notification moves to 30 minutes
 * before that candle lighting (or to havdalah when that moment has already passed), and several
 * moved to the same moment merge into one.
 */
export function planNotifications({
  now,
  events,
  reminders,
  city,
  il,
  horizonDays = DEFAULT_HORIZON_DAYS,
}: PlanInput): PlannedNotification[] {
  const until = new Date(now.getTime() + horizonDays * DAY);
  const today = hebrewDateAt(now, city);
  // Periods a little past the horizon too: a moved notification lands before its period starts.
  const periods = restPeriods(now, new Date(until.getTime() + DAY), city, il);

  const candidates = [
    ...eventCandidates(events, today, city),
    ...reminderCandidates(reminders, today, city),
    ...shabbatCandidates(periods, city),
  ].filter((n) => valid(n.at));

  const kept: PlannedNotification[] = [];
  const moved = new Map<number, { period: RestPeriod; items: PlannedNotification[] }>();
  for (const n of candidates) {
    const period = periodAt(n.at, periods);
    if (!period) {
      kept.push(n);
      continue;
    }
    let at = period.candles.getTime() - MOVED_BEFORE_CANDLES_MIN * MIN;
    if (at <= now.getTime()) at = period.havdalah.getTime();
    const group = moved.get(at) ?? { period, items: [] };
    group.items.push(n);
    moved.set(at, group);
  }
  for (const [at, { period, items }] of moved) {
    if (items.length === 1) {
      kept.push({ ...items[0], at: new Date(at) });
      continue;
    }
    items.sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id));
    kept.push({
      id: `merged-${at}`,
      at: new Date(at),
      title: period.isChag ? 'לפני החג' : 'לפני שבת',
      body: items.map((i) => i.title).join(' · '),
      kind: 'merged',
    });
  }

  return kept
    .filter((n) => n.at.getTime() > now.getTime() && n.at.getTime() <= until.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id))
    .slice(0, MAX_SCHEDULED);
}

// ---------------------------------------------------------------- countdown

export type CountdownWindow = {
  id: string;
  /** When the ongoing notification appears: three hours before candle lighting. */
  start: Date;
  /** Candle lighting; the notification is removed then. */
  end: Date;
  title: string;
  body: string;
};

/**
 * Countdown windows for the coming Shabbat and Yom Tov (PLAN.md "ספירה לאחור").
 * Only the first candle lighting of each period: a second-day or motzei-Shabbat lighting
 * falls inside Shabbat or Yom Tov, when nothing is shown.
 */
export function planCountdowns({
  now,
  city,
  il,
  horizonDays = 8,
}: {
  now: Date;
  city: City;
  il: boolean;
  horizonDays?: number;
}): CountdownWindow[] {
  const until = new Date(now.getTime() + horizonDays * DAY);
  return restPeriods(now, until, city, il)
    .filter((p) => p.candles.getTime() > now.getTime() && p.candles.getTime() <= until.getTime())
    .map((p) => ({
      id: `countdown-${p.candles.getTime()}`,
      start: new Date(p.candles.getTime() - COUNTDOWN_MIN * MIN),
      end: p.candles,
      title: `הדלקת נרות ${formatTime(p.candles, city.tzid)}`,
      body: city.name,
    }));
}
