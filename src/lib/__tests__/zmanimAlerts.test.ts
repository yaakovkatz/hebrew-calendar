import { HDate, months } from '@hebcal/core';
import { CITIES } from '../cities';
import { formatTime } from '../hebrewDay';
import { restPeriods, zonedTime } from '../notificationPlan';
import {
  customZmanMinutes,
  nextAlertsLine,
  planZmanAlerts,
  sortedZmanAlerts,
  zmanAlertTitle,
  zmanAlertWhen,
  type ZmanAlert,
} from '../zmanimAlerts';
import { fullZmanim } from '../zmanimFull';

const jerusalem = CITIES.find((c) => c.id === 'jerusalem')!;
const TZ = jerusalem.tzid;
const MIN = 60_000;

// Sunday 25 Oct 2026, 09:00 in Jerusalem (14 Cheshvan 5787).
const sunday = new Date('2026-10-25T07:00:00Z');
const sunsetAlert: ZmanAlert = { id: 3, zman: 'sunset', minutesBefore: 15 };

const plan = (input: Partial<Parameters<typeof planZmanAlerts>[0]>) =>
  planZmanAlerts({ now: sunday, alerts: [sunsetAlert], city: jerusalem, il: true, ...input });

const localDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ });
const zmanOn = (y: number, m: number, d: number, key: string) =>
  fullZmanim(new Date(y, m - 1, d, 12), jerusalem, true).find((r) => r.key === key)!.time!;

describe('planZmanAlerts', () => {
  it('is the zman minus minutesBefore, every day, shaped like a planned notification', () => {
    const list = plan({});
    const first = list[0];
    const sunset = zmanOn(2026, 10, 25, 'sunset');
    expect(first.at.getTime()).toBe(sunset.getTime() - 15 * MIN);
    expect(first).toEqual({
      id: 'zman-3-20261025',
      at: first.at,
      title: 'שקיעה בעוד 15 דק׳',
      body: `${formatTime(sunset, TZ)} · ${jerusalem.name}`,
      kind: 'zman',
      stub: { day: 'י״ד', month: 'חשוון' },
    });
  });

  it('ids are stable per alert and civil day', () => {
    const ids = plan({}).map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('zman-3-20261026');
    // Planning again later keeps the same ids for the same days.
    const later = plan({ now: new Date(sunday.getTime() + 60 * MIN) }).map((n) => n.id);
    expect(later.slice(0, 3)).toEqual(ids.slice(0, 3));
  });

  it('skips Shabbat: Friday before sunset is after candle lighting, Shabbat itself too', () => {
    const days = plan({ horizonDays: 8 }).map((n) => localDay(n.at));
    // Sun 25 … Thu 29, then Sunday 1 Nov. Not Friday 30 (inside candle lighting) or Shabbat 31.
    expect(days).toEqual(['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-11-01']);
  });

  it('an alert before candle lighting on Friday is still sent', () => {
    const list = plan({ alerts: [{ id: 1, zman: 'chatzot', minutesBefore: 0 }] });
    expect(list.map((n) => localDay(n.at))).toContain('2026-10-30');
    expect(list.map((n) => localDay(n.at))).not.toContain('2026-10-31');
  });

  it('chatzot at night after havdalah on motzaei Shabbat is sent', () => {
    const list = plan({ alerts: [{ id: 1, zman: 'chatzotNight', minutesBefore: 0 }] });
    // Shabbat's row (31 Oct) is the midnight after havdalah; Friday's row is inside Shabbat.
    const ids = list.map((n) => n.id);
    expect(ids).toContain('zman-1-20261031');
    expect(ids).not.toContain('zman-1-20261030');
  });

  it('nothing falls between candle lighting and havdalah', () => {
    const alerts: ZmanAlert[] = ['alot', 'sunrise', 'chatzot', 'sunset', 'tzeit', 'chatzotNight'].map((zman, i) => ({
      id: i,
      zman: zman as ZmanAlert['zman'],
      minutesBefore: 5,
    }));
    const list = plan({ alerts, horizonDays: 14 });
    const periods = restPeriods(sunday, new Date(sunday.getTime() + 15 * 24 * 60 * MIN), jerusalem, true);
    for (const n of list) {
      expect(periods.some((p) => n.at >= p.candles && n.at < p.havdalah)).toBe(false);
    }
  });

  it('skips Yom Tov (first day of Pesach), but not Chol HaMoed', () => {
    const erev = new HDate(14, months.NISAN, 5787).greg(); // the day before Pesach
    const now = zonedTime(erev.getFullYear(), erev.getMonth() + 1, erev.getDate(), 6, 0, TZ);
    const list = plan({ now, alerts: [{ id: 1, zman: 'chatzot', minutesBefore: 0 }], horizonDays: 4 });
    const hebrew = list.map((n) => new HDate(new Date(n.at.toLocaleDateString('en-CA', { timeZone: TZ }) + 'T12:00')).getDate());
    expect(hebrew).toContain(14); // ערב פסח, before candle lighting
    expect(hebrew).not.toContain(15); // יום טוב
    expect(hebrew).toContain(16); // חול המועד
  });

  it('il is used: the second day of Yom Tov abroad is skipped, in Israel it is not', () => {
    const erev = new HDate(14, months.NISAN, 5787).greg();
    const now = zonedTime(erev.getFullYear(), erev.getMonth() + 1, erev.getDate(), 6, 0, TZ);
    const input = { now, alerts: [{ id: 1, zman: 'chatzot' as const, minutesBefore: 0 }], horizonDays: 3 };
    const sixteenth = new HDate(16, months.NISAN, 5787).greg();
    const ymd = `${sixteenth.getFullYear()}${String(sixteenth.getMonth() + 1).padStart(2, '0')}${String(sixteenth.getDate()).padStart(2, '0')}`;
    expect(plan({ ...input, il: true }).map((n) => n.id)).toContain(`zman-1-${ymd}`);
    expect(plan({ ...input, il: false }).map((n) => n.id)).not.toContain(`zman-1-${ymd}`);
  });

  it('skips moments already past, today included', () => {
    const afterSunset = new Date(zmanOn(2026, 10, 25, 'sunset').getTime() - 10 * MIN); // 5 minutes after the alert
    const list = plan({ now: afterSunset });
    expect(list[0].id).toBe('zman-3-20261026');
    expect(list.every((n) => n.at > afterSunset)).toBe(true);
  });

  it('stays inside the horizon and sorts soonest first', () => {
    const list = plan({
      alerts: [sunsetAlert, { id: 4, zman: 'alot', minutesBefore: 0 }],
      horizonDays: 3,
    });
    const until = sunday.getTime() + 3 * 24 * 60 * MIN;
    expect(list.every((n) => n.at.getTime() <= until)).toBe(true);
    const times = list.map((n) => n.at.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(list[0].id).toBe('zman-3-20261025'); // today's alot has passed
  });

  it('an alert after sunset carries the next Hebrew date', () => {
    const list = plan({ alerts: [{ id: 2, zman: 'tzeit', minutesBefore: 0 }] });
    expect(list[0].id).toBe('zman-2-20261025');
    expect(list[0].stub).toEqual({ day: 'ט״ו', month: 'חשוון' });
  });

  it('ignores an unknown zman and an empty list', () => {
    expect(plan({ alerts: [] })).toEqual([]);
    expect(plan({ alerts: [{ id: 1, zman: 'nope' as never, minutesBefore: 5 }] })).toEqual([]);
  });
});

describe('labels', () => {
  it('title: minutes, hours, now', () => {
    expect(zmanAlertTitle('sunset', 15)).toBe('שקיעה בעוד 15 דק׳');
    expect(zmanAlertTitle('sunset', 1)).toBe('שקיעה בעוד דקה');
    expect(zmanAlertTitle('sunset', 0)).toBe('שקיעה עכשיו');
    expect(zmanAlertTitle('sunset', 60)).toBe('שקיעה בעוד שעה');
    expect(zmanAlertTitle('sunset', 120)).toBe('שקיעה בעוד שעתיים');
    expect(zmanAlertTitle('shmaGRA', 180)).toBe('סוף זמן ק״ש גר״א בעוד 3 שעות');
    expect(zmanAlertTitle('sunset', 90)).toBe('שקיעה בעוד 90 דק׳');
  });

  it('when: the reminder words', () => {
    expect(zmanAlertWhen(0)).toBe('בזמן');
    expect(zmanAlertWhen(15)).toBe('15 דק׳ לפני');
    expect(zmanAlertWhen(60)).toBe('שעה לפני');
  });

  it('custom: minutes or hours up to 12 hours', () => {
    expect(customZmanMinutes('10', 'minutes')).toBe(10);
    expect(customZmanMinutes('2', 'hours')).toBe(120);
    expect(customZmanMinutes('13', 'hours')).toBeNull();
    expect(customZmanMinutes('', 'minutes')).toBeNull();
    expect(customZmanMinutes('a', 'minutes')).toBeNull();
  });

  it('next alerts line: today and tomorrow, or the day after Shabbat', () => {
    const line = nextAlertsLine({ now: sunday, zman: 'sunset', minutesBefore: 15, city: jerusalem, il: true });
    const t = (y: number, m: number, d: number) => formatTime(new Date(zmanOn(y, m, d, 'sunset').getTime() - 15 * MIN), TZ);
    expect(line).toBe(`היום ${t(2026, 10, 25)} · מחר ${t(2026, 10, 26)}`);
    const thursday = zonedTime(2026, 10, 29, 9, 0, TZ);
    expect(nextAlertsLine({ now: thursday, zman: 'sunset', minutesBefore: 15, city: jerusalem, il: true })).toBe(
      `היום ${t(2026, 10, 29)} · ביום ראשון ${t(2026, 11, 1)}`,
    );
  });

  it('sorted in the day order', () => {
    const sorted = sortedZmanAlerts([
      { id: 1, zman: 'sunset', minutesBefore: 0 },
      { id: 2, zman: 'alot', minutesBefore: 0 },
    ]);
    expect(sorted.map((a) => a.zman)).toEqual(['alot', 'sunset']);
  });
});
