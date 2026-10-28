import { HDate, gematriya } from '@hebcal/core';
import { hebrewMonthName, yearLabel } from './month';

/** `hint`: a short grey text at the row's end (e.g. the event types sheet). */
export type Option<T> = { value: T; label: string; hint?: string };

/** Rows a picker sheet shows without scrolling. */
export const SHEET_VISIBLE_ROWS = 7;

/**
 * Where a picker list opens: at the selected row in a long list (days, years), at the top of a
 * short one. Opening a short list mid-way rendered only the rows from the selected one on, so the
 * sheet shrank to 2-3 rows (phone test 28.10.2026).
 */
export function sheetStartIndex<T>(options: Option<T>[], selected: T): number | undefined {
  if (options.length <= SHEET_VISIBLE_ROWS) return undefined;
  const i = options.findIndex((o) => o.value === selected);
  return i > 0 ? i : undefined;
}

/** Hebrew months in calendar order (Tishrei first), with Adar I and II in a leap year. */
export function hebrewMonthOptions(year: number): Option<number>[] {
  const count = HDate.monthsInYear(year);
  const order = [7, 8, 9, 10, 11, 12, ...(count === 13 ? [13] : []), 1, 2, 3, 4, 5, 6];
  return order.map((m) => ({ value: m, label: hebrewMonthName(m, year) }));
}

/** Only days that exist in that month (no 30 Cheshvan in a short year). */
export function hebrewDayOptions(month: number, year: number): Option<number>[] {
  const days = HDate.daysInMonth(month, year);
  return Array.from({ length: days }, (_, i) => ({ value: i + 1, label: gematriya(i + 1) }));
}

/** Hebrew years from 1900 to 100 years ahead (PLAN.md), newest first. */
export function hebrewYearOptions(currentYear: number): Option<number>[] {
  const first = new HDate(new Date(1900, 0, 1)).getFullYear();
  const last = currentYear + 100;
  const list: Option<number>[] = [];
  // A Hebrew year spans two Gregorian years: 5787 runs from autumn 2026 to autumn 2027.
  for (let y = last; y >= first; y--) list.push({ value: y, label: `${yearLabel(y)} (${y - 3761}/${String(y - 3760).slice(-2)})` });
  return list;
}

/** A month that doesn't exist in the chosen year (Adar II in a regular year) becomes Adar. */
export function clampHebrew(day: number, month: number, year: number): { day: number; month: number } {
  let m = month;
  if (m === 13 && HDate.monthsInYear(year) === 12) m = 12;
  const max = HDate.daysInMonth(m, year);
  return { day: Math.min(day, max), month: m };
}

export function gregMonthOptions(): Option<number>[] {
  const fmt = new Intl.DateTimeFormat('he-IL', { month: 'long' });
  return Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: fmt.format(new Date(2000, i, 1)) }));
}

export function gregDayOptions(month: number, year: number): Option<number>[] {
  const days = new Date(year, month, 0).getDate();
  return Array.from({ length: days }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
}

export function gregYearOptions(currentYear: number): Option<number>[] {
  const list: Option<number>[] = [];
  for (let y = currentYear + 100; y >= 1900; y--) list.push({ value: y, label: String(y) });
  return list;
}

/** 'ב׳ בשבט תשע״ח' */
export function formatHebrewFull(day: number, month: number, year: number): string {
  return `${gematriya(day)} ב${hebrewMonthName(month, year)} ${yearLabel(year)}`;
}
