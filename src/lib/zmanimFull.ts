import { CandleLightingEvent, HavdalahEvent, HDate, HebrewCalendar, Zmanim } from '@hebcal/core';
import { DafYomi } from '@hebcal/learning';
import { City, toLocation } from './cities';
import { dayLetters, hebrewMonthName, WEEKDAYS } from './month';

/** A civil day: a Gregorian Date (its y/m/d is read) or an HDate (its daytime civil day). */
export type DayInput = HDate | Date;

/** The zmanim of the Zmanim tab, in order. Also the keys of a daily zman alert (PLAN.md "תזכורת לזמנים"). */
export const ZMAN_KEYS = [
  'alot', 'misheyakir', 'sunrise', 'shmaMGA', 'shmaGRA', 'tfillaMGA', 'tfillaGRA', 'chatzot',
  'minchaGedola', 'minchaKetana', 'plag', 'sunset', 'tzeit', 'tzeit72', 'chatzotNight',
] as const;

export type ZmanKey = (typeof ZMAN_KEYS)[number];

export function isZmanKey(value: string): value is ZmanKey {
  return (ZMAN_KEYS as readonly string[]).includes(value);
}

export const ZMAN_LABEL: Record<ZmanKey, string> = {
  alot: 'עלות השחר',
  misheyakir: 'משיכיר',
  sunrise: 'הנץ החמה',
  shmaMGA: 'סוף זמן ק״ש מג״א',
  shmaGRA: 'סוף זמן ק״ש גר״א',
  tfillaMGA: 'סוף זמן תפילה מג״א',
  tfillaGRA: 'סוף זמן תפילה גר״א',
  chatzot: 'חצות',
  minchaGedola: 'מנחה גדולה',
  minchaKetana: 'מנחה קטנה',
  plag: 'פלג המנחה',
  sunset: 'שקיעה',
  tzeit: 'צאת הכוכבים',
  tzeit72: 'צאת הכוכבים ר״ת',
  chatzotNight: 'חצות הלילה',
};

export type ZmanRow = { key: ZmanKey; label: string; time: Date | null };

export type ShabbatRow = { key: 'candles' | 'havdalah'; label: string; time: Date };

const GREG_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

/** Local noon of that civil day; hebcal only reads its y/m/d. */
export function dayNoon(date: DayInput): Date {
  const g = date instanceof HDate ? date.greg() : date;
  return new Date(g.getFullYear(), g.getMonth(), g.getDate(), 12);
}

/** The same civil day shifted by `days`. */
export function addDays(date: DayInput, days: number): Date {
  const g = dayNoon(date);
  return new Date(g.getFullYear(), g.getMonth(), g.getDate() + days, 12);
}

export function sameDay(a: DayInput, b: DayInput): boolean {
  return dayNoon(a).getTime() === dayNoon(b).getTime();
}

function valid(d: Date | null | undefined): Date | null {
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

/** All the day's zmanim in order (GRA and MGA). Missing times are null, shown as '—'. */
export function fullZmanim(date: DayInput, city: City, il: boolean): ZmanRow[] {
  void il; // Zmanim don't depend on il; kept so callers pass it explicitly like the rest of hebcal.
  const z = new Zmanim(toLocation(city), dayNoon(date), false);
  const t72 = z.tzeit72();
  const times: Record<ZmanKey, Date | null> = {
    alot: z.alotHaShachar(),
    misheyakir: z.misheyakir(),
    sunrise: z.sunrise(),
    shmaMGA: z.sofZmanShmaMGA(),
    shmaGRA: z.sofZmanShma(),
    tfillaMGA: z.sofZmanTfillaMGA(),
    tfillaGRA: z.sofZmanTfilla(),
    chatzot: z.chatzot(),
    minchaGedola: z.minchaGedola(),
    minchaKetana: z.minchaKetana(),
    plag: z.plagHaMincha(),
    sunset: z.sunset(),
    tzeit: z.tzeit(8.5),
    tzeit72: t72 ? new Date(t72.epochMilliseconds) : null,
    // hebcal's chatzotNight() for a day is the midnight *before* it (00:xx that morning).
    // The list wants tonight's, which is the next civil day's value.
    chatzotNight: new Zmanim(toLocation(city), addDays(date, 1), false).chatzotNight(),
  };
  return ZMAN_KEYS.map((key) => ({ key, label: ZMAN_LABEL[key], time: valid(times[key]) }));
}

/** Candle lighting (Friday, erev chag) and havdalah (Shabbat, Yom Tov) on that civil day. */
export function shabbatRows(date: DayInput, city: City, il: boolean): ShabbatRow[] {
  const hd = new HDate(dayNoon(date));
  const events = HebrewCalendar.calendar({
    start: hd,
    end: hd,
    location: toLocation(city),
    candlelighting: true,
    candleLightingMins: city.candleLightingMins,
    il,
  });
  const rows: ShabbatRow[] = [];
  for (const ev of events) {
    if (ev instanceof CandleLightingEvent) {
      rows.push({ key: 'candles', label: 'הדלקת נרות', time: ev.eventTime });
    } else if (ev instanceof HavdalahEvent) {
      rows.push({ key: 'havdalah', label: hd.getDay() === 6 ? 'צאת השבת' : 'צאת החג', time: ev.eventTime });
    }
  }
  return rows.sort((a, b) => a.time.getTime() - b.time.getTime());
}

/** Key of the first zman still ahead of `now`, or null when the day is over. */
export function nextZmanKey(rows: ZmanRow[], now: Date): ZmanKey | null {
  return rows.find((row) => row.time && row.time.getTime() > now.getTime())?.key ?? null;
}

/** 'פסחים ע״ה' — today's Daf Yomi in Hebrew, without nikud. Null before the first cycle. */
export function dafYomi(date: DayInput): string | null {
  try {
    const daf = new DafYomi(dayNoon(date));
    return daf.render('he-x-NoNikud').replace(' דף ', ' ');
  } catch {
    return null;
  }
}

/** 'ט״ו בחשוון' */
export function hebrewDayTitle(date: DayInput): string {
  const hd = new HDate(dayNoon(date));
  const day = dayLetters(hd.getDate());
  const marked = day.length === 1 ? `${day}׳` : `${day.slice(0, -1)}״${day.slice(-1)}`;
  return `${marked} ב${hebrewMonthName(hd.getMonth(), hd.getFullYear())}`;
}

/** 'יום שני · 26 באוקטובר · ירושלים' */
export function civilDayLine(date: DayInput, cityName: string): string {
  const g = dayNoon(date);
  return `יום ${WEEKDAYS[g.getDay()]} · ${g.getDate()} ב${GREG_MONTHS[g.getMonth()]} · ${cityName}`;
}
