import type { City } from './cities';
import { civilNoon, formatTime, hebrewDateAt } from './hebrewDay';
import { dayLetters, hebrewMonthName, WEEKDAYS } from './month';
import { restPeriods, type PlannedNotification } from './notificationPlan';
import { alertLabel, before } from './reminders';
import { addDays, fullZmanim, isZmanKey, ZMAN_KEYS, ZMAN_LABEL, type ZmanKey } from './zmanimFull';

// Pure planning only (PLAN.md "תזכורת לזמנים"): no expo imports, so everything here runs in Jest.

/** A daily alert before a zman, e.g. 15 minutes before שקיעה. One per zman. */
export type ZmanAlert = { id: number; zman: ZmanKey; minutesBefore: number };

/** Shaped like PlannedNotification, with kind 'zman' and the Hebrew date for the notification's side stub. */
export type ZmanNotification = Omit<PlannedNotification, 'kind'> & {
  kind: 'zman';
  /** The Hebrew date at the alert's moment (flips at sunset): day 'ט״ו', month 'חשוון'. */
  stub?: { day: string; month: string };
};

export type ZmanPlanInput = {
  now: Date;
  alerts: ZmanAlert[];
  city: City;
  il: boolean;
  horizonDays?: number;
};

/** A daily alert takes a slot every day, so it looks one week ahead; the app reschedules on every open. */
export const ZMAN_HORIZON_DAYS = 7;
/** Rows of "מתי להזכיר" (approved mockup ב), then "אחר…". */
export const ZMAN_ALERT_PRESETS = [0, 5, 15, 30, 60];
export const DEFAULT_ZMAN_MINUTES = 15;
/** "אחר" in minutes or hours, up to 12 hours before. */
export const MAX_ZMAN_ALERT_MINUTES = 12 * 60;

/** From the central list of messages (same words as saving an event). */
export const ZMAN_ALERT_ERROR = 'לא הצלחנו לשמור. נסו שוב.';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

/** 'דקה', '15 דק׳', 'שעה', 'שעתיים', '3 שעות' */
function amountLabel(minutes: number): string {
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    if (h === 1) return 'שעה';
    return h === 2 ? 'שעתיים' : `${h} שעות`;
  }
  return minutes === 1 ? 'דקה' : `${minutes} דק׳`;
}

/** 'שקיעה בעוד 15 דק׳', 'שקיעה בעוד שעה', 'שקיעה עכשיו' */
export function zmanAlertTitle(zman: ZmanKey, minutesBefore: number): string {
  const label = ZMAN_LABEL[zman];
  return minutesBefore === 0 ? `${label} עכשיו` : `${label} בעוד ${amountLabel(minutesBefore)}`;
}

/** 'בזמן', '15 דק׳ לפני', 'שעה לפני' (same words as a reminder's alert). */
export function zmanAlertWhen(minutesBefore: number): string {
  return alertLabel(before(minutesBefore));
}

/** "אחר: כמה זמן לפני?" for a zman: minutes or hours, up to 12 hours; null when not valid. */
export function customZmanMinutes(amount: string, unit: 'minutes' | 'hours'): number | null {
  if (!/^\d{1,3}$/.test(amount.trim())) return null;
  const minutes = Number(amount.trim()) * (unit === 'hours' ? 60 : 1);
  return minutes <= MAX_ZMAN_ALERT_MINUTES ? minutes : null;
}

/** 'ט״ו', 'ה׳' */
function markedDay(day: number): string {
  const letters = dayLetters(day);
  return letters.length === 1 ? `${letters}׳` : `${letters.slice(0, -1)}״${letters.slice(-1)}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Every daily zman alert for the coming `horizonDays`, soonest first:
 * the zman's time on each civil day in the city, minus `minutesBefore`.
 * Skipped: moments already past, and moments inside Shabbat or Yom Tov — from candle lighting
 * to havdalah, the same window as the rest of the app's notifications. So "15 דק׳ לפני שקיעה" on
 * Friday is not sent (it is after candle lighting), and "חצות הלילה" on motzaei Shabbat is.
 * Ids are stable per alert and day: 'zman-<alertId>-<yyyymmdd>' (the zman's civil day).
 */
export function planZmanAlerts({
  now,
  alerts,
  city,
  il,
  horizonDays = ZMAN_HORIZON_DAYS,
}: ZmanPlanInput): ZmanNotification[] {
  const valid = alerts.filter((a) => isZmanKey(a.zman) && Number.isFinite(a.minutesBefore) && a.minutesBefore >= 0);
  if (!valid.length) return [];
  const until = now.getTime() + horizonDays * DAY;
  const periods = restPeriods(now, new Date(until + DAY), city, il);
  const resting = (t: number) => periods.some((p) => t >= p.candles.getTime() && t < p.havdalah.getTime());
  const today = civilNoon(now, city.tzid);

  const out: ZmanNotification[] = [];
  // From yesterday: its "חצות הלילה" can still be ahead, just after midnight.
  for (let i = -1; i <= horizonDays + 1; i++) {
    const day = addDays(today, i);
    const ymd = `${day.getFullYear()}${pad(day.getMonth() + 1)}${pad(day.getDate())}`;
    const times = new Map(fullZmanim(day, city, il).map((row) => [row.key, row.time]));
    for (const alert of valid) {
      const time = times.get(alert.zman);
      if (!time) continue;
      const at = new Date(time.getTime() - alert.minutesBefore * MIN);
      const t = at.getTime();
      if (t <= now.getTime() || t > until || resting(t)) continue;
      const hd = hebrewDateAt(at, city);
      out.push({
        id: `zman-${alert.id}-${ymd}`,
        at,
        title: zmanAlertTitle(alert.zman, alert.minutesBefore),
        body: `${formatTime(time, city.tzid)} · ${city.name}`,
        kind: 'zman',
        stub: { day: markedDay(hd.getDate()), month: hebrewMonthName(hd.getMonth(), hd.getFullYear()) },
      });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id));
}

/**
 * The orange line on "התראה יומית": the next two alert times,
 * 'היום 16:36 · מחר 16:35', or 'ביום ראשון 16:33' after Shabbat. Empty when there are none.
 */
export function nextAlertsLine(input: {
  now: Date;
  zman: ZmanKey;
  minutesBefore: number;
  city: City;
  il: boolean;
}): string {
  const { now, city } = input;
  const list = planZmanAlerts({
    now,
    alerts: [{ id: 0, zman: input.zman, minutesBefore: input.minutesBefore }],
    city,
    il: input.il,
    horizonDays: 5,
  });
  const today = civilNoon(now, city.tzid).getTime();
  return list
    .slice(0, 2)
    .map((n) => {
      const day = civilNoon(n.at, city.tzid);
      const diff = Math.round((day.getTime() - today) / DAY);
      const name = diff === 0 ? 'היום' : diff === 1 ? 'מחר' : `ביום ${WEEKDAYS[day.getDay()]}`;
      return `${name} ${formatTime(n.at, city.tzid)}`;
    })
    .join(' · ');
}

/** The zmanim for the "זמן" picker, in the Zmanim tab's order. */
export const ZMAN_OPTIONS = ZMAN_KEYS.map((key) => ({ value: key, label: ZMAN_LABEL[key] }));

/** The "כל יום" rows at the bottom of the events list, in the day's order. */
export function sortedZmanAlerts(alerts: ZmanAlert[]): ZmanAlert[] {
  return alerts.filter((a) => isZmanKey(a.zman)).sort((a, b) => ZMAN_KEYS.indexOf(a.zman) - ZMAN_KEYS.indexOf(b.zman));
}
