import { HDate, HebrewCalendar, Locale, gematriya, getSedra, months } from '@hebcal/core';

export const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] as const;

export type MonthCell = {
  hd: HDate;
  /** Day of the Hebrew month in letters, without geresh: 'יא' */
  label: string;
  gregDay: number;
  inMonth: boolean;
  isShabbat: boolean;
  isToday: boolean;
  /** Parsha name on Shabbat cells, e.g. 'לך־לך' */
  parsha: string | null;
  holidays: string[];
};

export type MonthGrid = {
  year: number;
  month: number;
  title: string;
  yearLabel: string;
  gregRange: string;
  cells: MonthCell[];
};

const NO_NIKUD = 'he-x-NoNikud';

/** Modern spelling for month names where hebcal uses the traditional one. */
const MONTH_SPELLING: Record<string, string> = { 'חשון': 'חשוון' };

export function hebrewMonthName(month: number, year: number): string {
  const name = Locale.gettext(HDate.getMonthName(month, year), NO_NIKUD);
  return MONTH_SPELLING[name] ?? name;
}

export function dayLetters(day: number): string {
  return gematriya(day).replace(/[׳״'"]/g, '');
}

/** 'תשפ״ז' */
export function yearLabel(year: number): string {
  return gematriya(year % 1000);
}

function gregRange(first: Date, last: Date): string {
  const fmt = new Intl.DateTimeFormat('he-IL', { month: 'long' });
  const a = fmt.format(first);
  const b = fmt.format(last);
  const yearA = first.getFullYear();
  const yearB = last.getFullYear();
  if (a === b) return `${a} ${yearA}`;
  return yearA === yearB ? `${a} – ${b} ${yearB}` : `${a} ${yearA} – ${b} ${yearB}`;
}

function holidaysByDay(start: HDate, end: HDate, il: boolean): Map<number, string[]> {
  const events = HebrewCalendar.calendar({ start, end, il, sedrot: false, candlelighting: false });
  const map = new Map<number, string[]>();
  for (const ev of events) {
    const key = ev.getDate().abs();
    const list = map.get(key) ?? [];
    list.push(ev.render(NO_NIKUD));
    map.set(key, list);
  }
  return map;
}

/** Whole weeks (Sunday to Shabbat) covering one Hebrew month. */
export function buildMonth(year: number, month: number, today: HDate, il: boolean): MonthGrid {
  const first = new HDate(1, month, year);
  const last = new HDate(first.daysInMonth(), month, year);
  const gridStart = first.subtract(first.getDay(), 'd');
  const gridEnd = last.add(6 - last.getDay(), 'd');
  const holidays = holidaysByDay(gridStart, gridEnd, il);

  const cells: MonthCell[] = [];
  for (let hd = gridStart; hd.abs() <= gridEnd.abs(); hd = hd.next()) {
    const isShabbat = hd.getDay() === 6;
    let parsha: string | null = null;
    if (isShabbat) {
      const result = getSedra(hd.getFullYear(), il).lookup(hd);
      if (!result.chag) parsha = result.parsha.map((p) => Locale.gettext(p, NO_NIKUD)).join('־');
    }
    cells.push({
      hd,
      label: dayLetters(hd.getDate()),
      gregDay: hd.greg().getDate(),
      inMonth: hd.getMonth() === month,
      isShabbat,
      isToday: hd.abs() === today.abs(),
      parsha,
      holidays: holidays.get(hd.abs()) ?? [],
    });
  }

  return {
    year,
    month,
    title: hebrewMonthName(month, year),
    yearLabel: yearLabel(year),
    gregRange: gregRange(first.greg(), last.greg()),
    cells,
  };
}

/** The Hebrew month after (+1) or before (-1) the given one, across years and Adar II. */
export function shiftMonth(year: number, month: number, delta: 1 | -1): { year: number; month: number } {
  const hd = new HDate(1, month, year);
  const target = delta === 1 ? hd.add(hd.daysInMonth(), 'd') : hd.subtract(1, 'd');
  return { year: target.getFullYear(), month: target.getMonth() };
}

export { months };
