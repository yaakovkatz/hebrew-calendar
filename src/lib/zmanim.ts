import { CandleLightingEvent, HavdalahEvent, HDate, HebrewCalendar, Zmanim } from '@hebcal/core';
import { City, toLocation } from './cities';
import { zmanimFor } from './hebrewDay';

export type Zman = { label: string; time: Date };

/** The day's zmanim in order, GRA by default (PLAN.md). Missing times are dropped. */
export function dayZmanim(instant: Date, city: City): Zman[] {
  const z: Zmanim = zmanimFor(instant, city);
  const list: Zman[] = [
    { label: 'עלות השחר', time: z.alotHaShachar() },
    { label: 'הנץ החמה', time: z.sunrise() },
    { label: 'סוף זמן קריאת שמע', time: z.sofZmanShma() },
    { label: 'סוף זמן תפילה', time: z.sofZmanTfilla() },
    { label: 'חצות', time: z.chatzot() },
    { label: 'מנחה גדולה', time: z.minchaGedola() },
    { label: 'פלג המנחה', time: z.plagHaMincha() },
    { label: 'שקיעה', time: z.sunset() },
    { label: 'צאת הכוכבים', time: z.tzeit() },
  ];
  return list.filter((item) => !Number.isNaN(item.time.getTime()));
}

/** The first zman still ahead of `instant` today, or null after tzeit. */
export function nextZman(instant: Date, city: City): Zman | null {
  return dayZmanim(instant, city).find((item) => item.time.getTime() > instant.getTime()) ?? null;
}

/** Where the sun is between sunrise (0) and sunset (1); null at night or when unknown. */
export function sunProgress(instant: Date, city: City): number | null {
  const z = zmanimFor(instant, city);
  const rise = z.sunrise().getTime();
  const set = z.sunset().getTime();
  const now = instant.getTime();
  if (Number.isNaN(rise) || Number.isNaN(set) || now < rise || now > set) return null;
  return (now - rise) / (set - rise);
}

export type ShabbatTime = { kind: 'candles' | 'havdalah'; time: Date; title: string };

/** The next candle lighting or havdalah within the coming week (Shabbat and Yom Tov). */
export function nextShabbatTime(instant: Date, city: City, start: HDate): ShabbatTime | null {
  const events = HebrewCalendar.calendar({
    start,
    end: start.add(7, 'd'),
    location: toLocation(city),
    candlelighting: true,
    candleLightingMins: city.candleLightingMins,
    il: true,
  });
  for (const ev of events) {
    if (!(ev instanceof CandleLightingEvent || ev instanceof HavdalahEvent)) continue;
    if (ev.eventTime.getTime() <= instant.getTime()) continue;
    return ev instanceof CandleLightingEvent
      ? { kind: 'candles', time: ev.eventTime, title: 'הדלקת נרות' }
      : { kind: 'havdalah', time: ev.eventTime, title: 'צאת השבת' };
  }
  return null;
}

/**
 * Candle lighting and havdalah for the coming Shabbat or Yom Tov.
 * Once candles are lit, only havdalah is left.
 */
export function upcomingShabbatTimes(instant: Date, city: City, start: HDate): { candles: Date | null; havdalah: Date | null } {
  const events = HebrewCalendar.calendar({
    start,
    end: start.add(7, 'd'),
    location: toLocation(city),
    candlelighting: true,
    candleLightingMins: city.candleLightingMins,
    il: true,
  });
  let candles: Date | null = null;
  for (const ev of events) {
    const t = ev instanceof CandleLightingEvent || ev instanceof HavdalahEvent ? ev.eventTime : null;
    if (!t) continue;
    if (ev instanceof CandleLightingEvent && t.getTime() > instant.getTime() && !candles) candles = t;
    if (ev instanceof HavdalahEvent && t.getTime() > instant.getTime()) return { candles, havdalah: t };
  }
  return { candles, havdalah: null };
}

/** 'בעוד 6 דק׳' or 'בעוד 6:40 שע׳' */
export function formatCountdown(from: Date, to: Date): string {
  const totalMin = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
  if (totalMin < 60) return `בעוד ${totalMin} דק׳`;
  const h = Math.floor(totalMin / 60);
  const m = String(totalMin % 60).padStart(2, '0');
  return `בעוד ${h}:${m} שע׳`;
}
