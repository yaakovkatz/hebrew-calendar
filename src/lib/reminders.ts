import { HDate, HebrewCalendar, flags } from '@hebcal/core';
import { shortHebrewDate, whenLabel } from './events';
import { WEEKDAYS } from './month';

export type RepeatKind = 'once' | 'yearly';
export type AlertTime = 'hour' | 'morning' | 'day';

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
  /** Stored now, used by the notifications in stage 2. */
  alert: AlertTime;
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
export const ALERT_LABEL: Record<AlertTime, string> = { hour: 'שעה לפני', morning: 'בבוקר', day: 'יום לפני' };
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

/** Time picker: 'כל היום', then 00:00 to 23:45 in 15-minute steps. */
export function timeOptions(): { value: string | null; label: string }[] {
  const list: { value: string | null; label: string }[] = [{ value: null, label: 'כל היום' }];
  for (let m = 0; m < 24 * 60; m += 15) {
    const t = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    list.push({ value: t, label: t });
  }
  return list;
}

/** 'כל היום' for null. */
export function timeLabel(time: string | null): string {
  return time ?? 'כל היום';
}

/** 'שעה לפני' only makes sense with a time. */
export function alertOptions(time: string | null): { value: AlertTime; label: string }[] {
  const all: AlertTime[] = time ? ['hour', 'morning', 'day'] : ['morning', 'day'];
  return all.map((value) => ({ value, label: ALERT_LABEL[value] }));
}
