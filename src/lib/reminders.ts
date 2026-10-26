import { HDate, HebrewCalendar, flags } from '@hebcal/core';
import { shortHebrewDate, whenLabel } from './events';
import { WEEKDAYS } from './month';

export type RepeatKind = 'once' | 'yearly';
/**
 * When to alert for a reminder (PLAN.md fix round 1, item 4):
 * a number of minutes before its time (0 = בזמן), 08:00 on the day, or 20:00 the day before.
 */
export type ReminderAlert = { kind: 'before'; minutes: number } | { kind: 'morning' } | { kind: 'dayBefore' };

/** A reminder on a specific Hebrew date, e.g. "רופא שיניים, י׳ בניסן, 10:30" (PLAN.md). */
export type Reminder = {
  id: number;
  title: string;
  hDay: number;
  hMonth: number;
  hYear: number;
  /** 'HH:MM' on the daytime of that Hebrew date; null = all day. */
  time: string | null;
  repeat: RepeatKind;
  alert: ReminderAlert;
  createdAt: string;
};

export type ReminderItem = {
  reminder: Reminder;
  /** The next date, or the date itself once a one-time reminder has passed. */
  date: HDate;
  daysUntil: number;
  past: boolean;
};

export const REPEAT_LABEL: Record<RepeatKind, string> = { once: 'פעם אחת', yearly: 'כל שנה' };
export const PAST_LABEL = 'עבר';

/**
 * Next time the reminder falls on or after `today`.
 * Once: the date itself, or null when it has passed.
 * Yearly: from the saved year on, with hebcal's Adar and 30th-of-month rules (like events).
 */
export function nextReminderDate(rem: Reminder, today: HDate): HDate | null {
  const original = new HDate(rem.hDay, rem.hMonth, rem.hYear);
  if (rem.repeat === 'once') return original.abs() >= today.abs() ? original : null;
  for (let year = Math.max(today.getFullYear(), rem.hYear); ; year++) {
    const hd = year === rem.hYear ? original : HebrewCalendar.getBirthdayOrAnniversary(year, original);
    if (hd && hd.abs() >= today.abs()) return hd;
  }
}

export function reminderItem(rem: Reminder, today: HDate): ReminderItem {
  const next = nextReminderDate(rem, today);
  const date = next ?? new HDate(rem.hDay, rem.hMonth, rem.hYear);
  return { reminder: rem, date, daysUntil: date.abs() - today.abs(), past: next === null };
}

/** 'HH:MM' sorts as text; all-day reminders come first on their day. */
function timeKey(time: string | null): string {
  return time ?? '';
}

/**
 * Upcoming first (soonest date, then time, then title).
 * Past one-time reminders stay at the end, most recent first, so they can still be opened and deleted.
 */
export function sortedReminders(reminders: Reminder[], today: HDate): ReminderItem[] {
  return reminders
    .map((r) => reminderItem(r, today))
    .sort((a, b) => {
      if (a.past !== b.past) return a.past ? 1 : -1;
      const byDay = a.past ? b.daysUntil - a.daysUntil : a.daysUntil - b.daysUntil;
      return (
        byDay ||
        timeKey(a.reminder.time).localeCompare(timeKey(b.reminder.time)) ||
        a.reminder.title.localeCompare(b.reminder.title, 'he')
      );
    });
}

/** Countdown label: 'היום', 'מחר', 'בעוד 4 ימים', or 'עבר'. */
export function reminderWhen(item: ReminderItem): string {
  return item.past ? PAST_LABEL : whenLabel(item.daysUntil);
}

/** List row end: 'ט״ז חשוון · 10:30', 'כל שנה · ט״ו שבט', 'עבר · ג׳ טבת' */
export function reminderRowLabel(item: ReminderItem): string {
  const parts = [shortHebrewDate(item.date)];
  if (item.reminder.time) parts.push(item.reminder.time);
  if (item.reminder.repeat === 'yearly') parts.unshift(REPEAT_LABEL.yearly);
  if (item.past) parts.unshift(PAST_LABEL);
  return parts.join(' · ');
}

export type DayOff = 'shabbat' | 'chag';

/** Shabbat, or a Yom Tov (hebcal CHAG flag: not Chol HaMoed, not Erev). */
export function dayOffKind(hd: HDate, il: boolean): DayOff | null {
  if (hd.getDay() === 6) return 'shabbat';
  const holidays = HebrewCalendar.getHolidaysOnDate(hd, il) ?? [];
  return holidays.some((ev) => (ev.getFlags() & flags.CHAG) !== 0) ? 'chag' : null;
}

export function isShabbatOrYomTov(hd: HDate, il: boolean): boolean {
  return dayOffKind(hd, il) !== null;
}

/** 'י׳ בניסן' */
export function hebrewDateWithB(hd: HDate): string {
  return shortHebrewDate(hd).replace(' ', ' ב');
}

/** 'השנה י׳ בניסן יוצא בשבת' / 'י׳ בניסן יוצא בחג', or null on a regular day. */
export function dayOffWarning(hd: HDate, today: HDate, il: boolean): string | null {
  const kind = dayOffKind(hd, il);
  if (!kind) return null;
  const prefix = hd.getFullYear() === today.getFullYear() ? 'השנה ' : '';
  return `${prefix}${hebrewDateWithB(hd)} יוצא ${kind === 'shabbat' ? 'בשבת' : 'בחג'}`;
}

const GREG_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

/**
 * 'שבת, 17 באפריל 2027'. A Hebrew date maps to its daytime civil day,
 * so a 10:30 reminder on י׳ בניסן is at 10:30 on that Gregorian day.
 */
export function gregorianLine(hd: HDate): string {
  const d = hd.greg();
  return `${WEEKDAYS[hd.getDay()]}, ${d.getDate()} ב${GREG_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Day numbers (HDate.abs) between start and end, inclusive, that have a reminder — for the month dots. */
export function reminderDaysInRange(reminders: Reminder[], start: HDate, end: HDate): Set<number> {
  const days = new Set<number>();
  for (const rem of reminders) {
    const occ = nextReminderDate(rem, start);
    if (occ && occ.abs() <= end.abs()) days.add(occ.abs());
  }
  return days;
}

/** Reminders on one Hebrew day, by time — for the day details sheet. */
export function remindersOn(reminders: Reminder[], hd: HDate): Reminder[] {
  return reminders
    .filter((r) => nextReminderDate(r, hd)?.abs() === hd.abs())
    .sort((a, b) => timeKey(a.time).localeCompare(timeKey(b.time)) || a.title.localeCompare(b.title, 'he'));
}

/** 'כל היום' for null. */
export function timeLabel(time: string | null): string {
  return time ?? 'כל היום';
}

// ---------------------------------------------------------------- alert

export const ALERT_MORNING: ReminderAlert = { kind: 'morning' };
export const ALERT_DAY_BEFORE: ReminderAlert = { kind: 'dayBefore' };
export const before = (minutes: number): ReminderAlert => ({ kind: 'before', minutes });
/** New reminders start at 15 minutes before (approved mockup 1ג). */
export const DEFAULT_ALERT: ReminderAlert = before(15);

const HOUR_MIN = 60;
const DAY_MIN = 24 * 60;

/**
 * The DB keeps `alert` (text) and, since schema v3, `alert_minutes`.
 * Old rows say 'hour' (60 minutes before), 'morning' or 'day' (the day before) and have no minutes.
 */
export function alertFromStored(alert: string, minutes: number | null): ReminderAlert {
  if (alert === 'before' && minutes !== null && minutes >= 0) return before(minutes);
  if (alert === 'hour') return before(HOUR_MIN);
  if (alert === 'day' || alert === 'dayBefore') return ALERT_DAY_BEFORE;
  return ALERT_MORNING;
}

export function alertToStored(alert: ReminderAlert): { alert: string; minutes: number | null } {
  if (alert.kind === 'before') return { alert: 'before', minutes: alert.minutes };
  return { alert: alert.kind === 'morning' ? 'morning' : 'day', minutes: null };
}

export function sameAlert(a: ReminderAlert, b: ReminderAlert): boolean {
  return a.kind === b.kind && (a.kind !== 'before' || a.minutes === (b as { minutes: number }).minutes);
}

/** A stable short key, e.g. for notification ids: 'b15', 'morning', 'day'. */
export function alertKey(alert: ReminderAlert): string {
  if (alert.kind === 'before') return `b${alert.minutes}`;
  return alert.kind === 'morning' ? 'morning' : 'day';
}

/** Without a time, "before" has nothing to count from: it alerts in the morning. */
export function effectiveAlert(alert: ReminderAlert, time: string | null): ReminderAlert {
  return alert.kind === 'before' && !time ? ALERT_MORNING : alert;
}

/** 'בזמן', 'דקה לפני', '5 דק׳ לפני', 'שעה לפני', 'שעתיים לפני', '3 ימים לפני', 'בבוקר', 'יום לפני' */
export function alertLabel(alert: ReminderAlert): string {
  if (alert.kind === 'morning') return 'בבוקר';
  if (alert.kind === 'dayBefore') return 'יום לפני';
  const m = alert.minutes;
  if (m === 0) return 'בזמן';
  if (m % DAY_MIN === 0) {
    const d = m / DAY_MIN;
    // 'יום לפני' already means 20:00 the evening before.
    if (d === 1) return '24 שעות לפני';
    return d === 2 ? 'יומיים לפני' : `${d} ימים לפני`;
  }
  if (m % HOUR_MIN === 0) {
    const h = m / HOUR_MIN;
    if (h === 1) return 'שעה לפני';
    return h === 2 ? 'שעתיים לפני' : `${h} שעות לפני`;
  }
  return m === 1 ? 'דקה לפני' : `${m} דק׳ לפני`;
}

/** The fixed rows of the "מתי להזכיר" sheet; "before" rows only make sense with a time. */
export function alertPresets(time: string | null): ReminderAlert[] {
  const timed = [before(0), before(5), before(15), before(HOUR_MIN)];
  return [...(time ? timed : []), ALERT_MORNING, ALERT_DAY_BEFORE];
}

export type AlertUnit = 'minutes' | 'hours' | 'days';
export const ALERT_UNITS: { value: AlertUnit; label: string; minutes: number }[] = [
  { value: 'minutes', label: 'דקות', minutes: 1 },
  { value: 'hours', label: 'שעות', minutes: HOUR_MIN },
  { value: 'days', label: 'ימים', minutes: DAY_MIN },
];
/** Up to a month before. */
export const MAX_ALERT_MINUTES = 31 * DAY_MIN;

/** "אחר: כמה זמן לפני?": a typed number and a unit; null when the number is not valid. */
export function customAlert(amount: string, unit: AlertUnit): ReminderAlert | null {
  if (!/^\d{1,4}$/.test(amount.trim())) return null;
  const minutes = Number(amount.trim()) * ALERT_UNITS.find((u) => u.value === unit)!.minutes;
  if (minutes > MAX_ALERT_MINUTES) return null;
  return before(minutes);
}

/** Split a saved alert back into the "אחר" fields, using the largest whole unit. */
export function splitAlert(alert: ReminderAlert): { amount: string; unit: AlertUnit } {
  if (alert.kind !== 'before' || alert.minutes === 0) return { amount: '', unit: 'minutes' };
  const m = alert.minutes;
  if (m % DAY_MIN === 0) return { amount: String(m / DAY_MIN), unit: 'days' };
  if (m % HOUR_MIN === 0) return { amount: String(m / HOUR_MIN), unit: 'hours' };
  return { amount: String(m), unit: 'minutes' };
}

// ---------------------------------------------------------------- typed time

/** As the user types on a number pad: digits only, a colon after the hours. '1030' → '10:30'. */
export function maskTime(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

/** 'HH:MM' between 00:00 and 23:59, or null ('25:00', '10:7', ''). '9:30' is read as 09:30. */
export function parseTimeInput(input: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(input.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${match[2]}`;
}

export const TIME_SHORTCUTS = ['08:00', '12:00', '18:00', '20:00'];
