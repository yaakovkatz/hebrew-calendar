import { HDate, months } from '@hebcal/core';
import { CITIES } from '../cities';
import type { FamilyEvent } from '../events';
import { formatTime, zmanimFor } from '../hebrewDay';
import {
  MAX_SCHEDULED,
  planCountdowns,
  planNotifications,
  restPeriods,
  stubFor,
  zonedTime,
  type PlannedNotification,
} from '../notificationPlan';
import { ALERT_DAY_BEFORE, ALERT_MORNING, before, type Reminder } from '../reminders';

const jerusalem = CITIES.find((c) => c.id === 'jerusalem')!;
const TZ = jerusalem.tzid;
const MIN = 60_000;

// Sunday 25 Oct 2026, 09:00 in Jerusalem (14 Cheshvan 5787; winter time, UTC+2).
const sunday = new Date('2026-10-25T07:00:00Z');

function ev(partial: Partial<FamilyEvent>): FamilyEvent {
  return {
    id: 1,
    type: 'birthday',
    title: 'נועה',
    hDay: 25,
    hMonth: months.CHESHVAN,
    hYear: 5723,
    afterSunset: false,
    gregDate: null,
    reminder: 'evening',
    showYears: false,
    ...partial,
  };
}

function rem(partial: Partial<Reminder>): Reminder {
  return {
    id: 1,
    title: 'רופא שיניים',
    hDay: 18,
    hMonth: months.CHESHVAN,
    hYear: 5787,
    time: '10:30',
    repeat: 'once',
    alert: before(60),
    createdAt: '2026-10-23 10:00:00',
    ...partial,
  };
}

const plan = (input: Partial<Parameters<typeof planNotifications>[0]>) =>
  planNotifications({ now: sunday, events: [], reminders: [], city: jerusalem, il: true, ...input });

const local = (d: Date) => `${d.toLocaleDateString('en-CA', { timeZone: TZ })} ${formatTime(d, TZ)}`;
const only = (list: PlannedNotification[], kind: PlannedNotification['kind']) => list.filter((n) => n.kind === kind);

describe('zonedTime', () => {
  it('is the wall-clock time in the city, summer and winter', () => {
    expect(zonedTime(2026, 10, 25, 8, 0, TZ).toISOString()).toBe('2026-10-25T06:00:00.000Z'); // IST, +2
    expect(zonedTime(2027, 4, 22, 8, 0, TZ).toISOString()).toBe('2027-04-22T05:00:00.000Z'); // IDT, +3
  });
});

describe('restPeriods', () => {
  it('runs from Friday candle lighting (40 min in Jerusalem) to havdalah', () => {
    const [p] = restPeriods(sunday, new Date('2026-11-01T00:00:00Z'), jerusalem, true);
    expect(local(p.candles).slice(0, 10)).toBe('2026-10-30');
    expect(local(p.havdalah).slice(0, 10)).toBe('2026-10-31');
    const sunset = zmanimFor(p.candles, jerusalem).sunset();
    // hebcal rounds candle lighting to the minute.
    expect(Math.abs((sunset.getTime() - p.candles.getTime()) / MIN - 40)).toBeLessThan(1);
    expect(p.name).toBe('שבת וירא');
    expect(p.isChag).toBe(false);
  });

  it('keeps Rosh Hashana on Shabbat with a motzei-Shabbat lighting as one period', () => {
    const periods = restPeriods(new Date('2026-09-10T00:00:00Z'), new Date('2026-09-14T00:00:00Z'), jerusalem, true);
    expect(periods).toHaveLength(1);
    expect(periods[0].isChag).toBe(true);
    expect(periods[0].name).toContain('ראש השנה');
    expect(local(periods[0].candles).slice(0, 10)).toBe('2026-09-11');
    expect(local(periods[0].havdalah).slice(0, 10)).toBe('2026-09-13');
  });

  it('Pesach 5787: Yom Tov, then Shabbat Chol HaMoed, then the seventh day', () => {
    const periods = restPeriods(new Date('2027-04-20T00:00:00Z'), new Date('2027-04-29T00:00:00Z'), jerusalem, true);
    expect(periods.map((p) => local(p.candles).slice(0, 10))).toEqual(['2027-04-21', '2027-04-23', '2027-04-27']);
    expect(periods[0].name).toBe('פסח א׳');
    expect(periods[0].isChag).toBe(true);
    expect(periods[1].isChag).toBe(false);
    expect(periods[2].isChag).toBe(true);
  });

  it('diaspora Pesach has two days of Yom Tov in one period', () => {
    const periods = restPeriods(new Date('2027-04-20T00:00:00Z'), new Date('2027-04-25T00:00:00Z'), jerusalem, false);
    // Wed night to Shabbat night: first and second day, then Shabbat right after.
    expect(periods).toHaveLength(1);
    expect(local(periods[0].havdalah).slice(0, 10)).toBe('2027-04-24');
  });

  it('includes the period that is running now', () => {
    const shabbat = new Date('2026-10-31T10:00:00Z');
    const [p] = restPeriods(shabbat, new Date('2026-11-01T00:00:00Z'), jerusalem, true);
    expect(p.candles.getTime()).toBeLessThan(shabbat.getTime());
    expect(p.havdalah.getTime()).toBeGreaterThan(shabbat.getTime());
  });
});

describe('family events', () => {
  it("'evening' fires at sunset on the evening the Hebrew date begins", () => {
    // 25 Cheshvan 5787 is Thursday 5 Nov 2026; it begins at sunset on Wednesday 4 Nov.
    const [n] = only(plan({ events: [ev({})] }), 'event');
    const sunset = zmanimFor(new Date('2026-11-04T10:00:00Z'), jerusalem).sunset();
    expect(n.at.getTime()).toBe(sunset.getTime());
    expect(n.kind).toBe('event');
  });

  it("'morning' fires at 08:00 on the day and 'week' at 08:00 seven days before", () => {
    expect(local(only(plan({ events: [ev({ reminder: 'morning' })] }), 'event')[0].at)).toBe('2026-11-05 08:00');
    expect(local(only(plan({ events: [ev({ reminder: 'week' })] }), 'event')[0].at)).toBe('2026-10-29 08:00');
  });

  it('gender-neutral title and a dated body with the age', () => {
    const [n] = only(plan({ events: [ev({})] }), 'event');
    expect(n.title).toBe('יום ההולדת של נועה');
    expect(n.body).toBe('כ״ה בחשוון · יום הולדת 64');
  });

  it('anniversary and "other" bodies', () => {
    expect(only(plan({ events: [ev({ type: 'anniversary', title: 'ההורים', hYear: 5749 })] }), 'event')[0].body).toBe('כ״ה בחשוון · שנה 38');
    const other = only(plan({ events: [ev({ type: 'other', title: 'עלייה לארץ' })] }), 'event')[0];
    expect(other.title).toBe('עלייה לארץ');
    expect(other.body).toBe('כ״ה בחשוון');
  });

  it('drops an alert that has already passed', () => {
    // 14 Cheshvan, today: the evening alert was last night.
    expect(plan({ events: [ev({ hDay: 14 })] })).toEqual(only(plan({}), 'shabbat'));
    // The morning alert for today at 08:00 has passed too (now is 09:00).
    expect(only(plan({ events: [ev({ hDay: 14, reminder: 'morning' })] }), 'event')).toEqual([]);
  });

  it('after sunset the next Hebrew day already counts as today', () => {
    // Saturday 24 Oct after sunset is already 14 Cheshvan: its evening alert is just past.
    const motzash = new Date('2026-10-24T17:00:00Z');
    expect(only(plan({ now: motzash, events: [ev({ hDay: 14 })] }), 'event')).toEqual([]);
    expect(local(only(plan({ now: motzash, events: [ev({ hDay: 14, reminder: 'morning' })] }), 'event')[0].at)).toBe(
      '2026-10-25 08:00',
    );
  });
});

describe('reminders', () => {
  it('60 minutes before fires an hour before the time', () => {
    const [n] = only(plan({ reminders: [rem({})] }), 'reminder');
    expect(local(n.at)).toBe('2026-10-29 09:30'); // 18 Cheshvan = Thursday 29 Oct
    expect(n.title).toBe('רופא שיניים');
    expect(n.body).toBe('י״ח בחשוון · 10:30');
    expect(n.kind).toBe('reminder');
  });

  it("'morning' at 08:00 that day, 'day' at 20:00 the day before", () => {
    expect(local(only(plan({ reminders: [rem({ alert: ALERT_MORNING })] }), 'reminder')[0].at)).toBe('2026-10-29 08:00');
    expect(local(only(plan({ reminders: [rem({ alert: ALERT_DAY_BEFORE })] }), 'reminder')[0].at)).toBe('2026-10-28 20:00');
  });

  it('minutes before, without a time, behaves like the morning', () => {
    const [n] = only(plan({ reminders: [rem({ time: null })] }), 'reminder');
    expect(local(n.at)).toBe('2026-10-29 08:00');
    expect(n.body).toBe('י״ח בחשוון');
  });

  it('custom minutes: 1 minute before, 0 = at the time, 3 days before', () => {
    const at = (minutes: number) => local(only(plan({ reminders: [rem({ alert: before(minutes) })] }), 'reminder')[0].at);
    expect(at(1)).toBe('2026-10-29 10:29');
    expect(at(0)).toBe('2026-10-29 10:30');
    expect(at(15)).toBe('2026-10-29 10:15');
    expect(at(3 * 24 * 60)).toBe('2026-10-26 10:30');
  });

  it('the notification id names the alert, so changing it reschedules', () => {
    const id = (r: Reminder) => only(plan({ reminders: [r] }), 'reminder')[0].id;
    expect(id(rem({ alert: before(1) }))).not.toBe(id(rem({ alert: before(0) })));
    expect(id(rem({ alert: before(5) }))).toMatch(/^reminder-1-b5-/);
  });

  it('a past one-time reminder is dropped, a yearly one comes back next year', () => {
    const past = rem({ hDay: 10, hMonth: months.CHESHVAN, hYear: 5787 });
    expect(only(plan({ reminders: [past] }), 'reminder')).toEqual([]);
    const yearly = { ...past, repeat: 'yearly' as const };
    const later = new Date('2027-10-20T06:00:00Z'); // next year, three weeks before 10 Cheshvan 5788
    expect(only(plan({ now: later, reminders: [yearly] }), 'reminder')).toHaveLength(1);
  });

  it('a reminder later today still fires; one earlier today is gone', () => {
    const today = rem({ hDay: 14, time: '12:00' }); // alert 11:00, now 09:00
    expect(local(only(plan({ reminders: [today] }), 'reminder')[0].at)).toBe('2026-10-25 11:00');
    expect(only(plan({ reminders: [rem({ hDay: 14, time: '09:30' })] }), 'reminder')).toEqual([]);
  });
});

describe('Shabbat and Yom Tov', () => {
  it('two hours before candle lighting, with the parsha and the time', () => {
    const [n] = only(plan({}), 'shabbat');
    const [p] = restPeriods(sunday, new Date('2026-11-01T00:00:00Z'), jerusalem, true);
    expect(n.at.getTime()).toBe(p.candles.getTime() - 120 * MIN);
    expect(n.title).toBe('שבת וירא');
    expect(n.body).toBe(`הדלקת נרות היום ב-${formatTime(p.candles, TZ)}`);
  });

  it('Friday 23 Oct 2026 is "שבת לך־לך"', () => {
    const [n] = only(plan({ now: new Date('2026-10-23T05:00:00Z') }), 'shabbat');
    expect(n.title).toBe('שבת לך־לך');
    expect(n.body).toMatch(/^הדלקת נרות היום ב-\d\d:\d\d$/);
  });

  it('never fires during Shabbat: a Shabbat birthday moves to 30 minutes before candle lighting', () => {
    // 27 Cheshvan 5787 is Shabbat 7 Nov; its morning alert would be Shabbat 08:00.
    const n = plan({ events: [ev({ hDay: 27, reminder: 'morning' })] }).find((x) => x.kind === 'event')!;
    const p = restPeriods(sunday, new Date('2026-11-08T00:00:00Z'), jerusalem, true)[1];
    expect(n.at.getTime()).toBe(p.candles.getTime() - 30 * MIN);
    expect(n.title).toBe('יום ההולדת של נועה');
  });

  it('a Friday-night evening alert (sunset, after candle lighting) moves too', () => {
    // 27 Cheshvan begins at sunset on Friday 6 Nov, 40 minutes after candle lighting.
    const n = only(plan({ events: [ev({ hDay: 27 })] }), 'event')[0];
    const p = restPeriods(sunday, new Date('2026-11-08T00:00:00Z'), jerusalem, true)[1];
    expect(n.at.getTime()).toBe(p.candles.getTime() - 30 * MIN);
  });

  it('several moved notifications merge into one', () => {
    const list = plan({
      events: [ev({ hDay: 27, reminder: 'morning' })],
      reminders: [rem({ hDay: 27, alert: before(60), title: 'קידוש' })],
    });
    const merged = only(list, 'merged');
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('לפני שבת');
    expect(merged[0].body).toBe('יום ההולדת של נועה · קידוש');
    expect(only(list, 'event')).toEqual([]);
    expect(only(list, 'reminder')).toEqual([]);
  });

  it('Yom Tov counts like Shabbat: Pesach 5787', () => {
    const now = new Date('2027-04-15T06:00:00Z');
    const list = plan({
      now,
      reminders: [rem({ hDay: 15, hMonth: months.NISAN, alert: ALERT_MORNING, title: 'סדר אצל סבתא' })],
    });
    const notice = only(list, 'shabbat').find((n) => n.title === 'פסח א׳')!;
    const [p] = restPeriods(new Date('2027-04-20T00:00:00Z'), new Date('2027-04-23T00:00:00Z'), jerusalem, true);
    expect(notice.at.getTime()).toBe(p.candles.getTime() - 120 * MIN);
    const moved = only(list, 'reminder')[0];
    expect(moved.at.getTime()).toBe(p.candles.getTime() - 30 * MIN);
    expect(local(moved.at).slice(0, 10)).toBe('2027-04-21');
  });

  it('no notification time falls inside any Shabbat or Yom Tov', () => {
    const now = new Date('2027-03-25T06:00:00Z');
    const events = Array.from({ length: 30 }, (_, i) =>
      ev({ id: i, hDay: (i % 29) + 1, hMonth: months.NISAN, reminder: (['evening', 'morning', 'week'] as const)[i % 3] }),
    );
    const list = plan({ now, events });
    const periods = restPeriods(now, new Date(now.getTime() + 31 * 24 * 60 * MIN), jerusalem, true);
    for (const n of list) {
      for (const p of periods) {
        expect(n.at.getTime() >= p.candles.getTime() && n.at.getTime() < p.havdalah.getTime()).toBe(false);
      }
    }
  });

  it('during Shabbat a moved notification goes to havdalah', () => {
    const shabbat = new Date('2026-10-31T07:00:00Z'); // Shabbat 10:00
    const list = plan({ now: shabbat, reminders: [rem({ hDay: 20, time: '14:00' })] }); // 20 Cheshvan = Shabbat 31 Oct
    const [p] = restPeriods(shabbat, new Date('2026-11-01T00:00:00Z'), jerusalem, true);
    const n = only(list, 'reminder')[0];
    expect(n.at.getTime()).toBe(p.havdalah.getTime());
  });
});

describe('horizon, order and cap', () => {
  it('keeps only the next 30 days by default, and honours horizonDays', () => {
    const far = rem({ hDay: 1, hMonth: months.TEVET }); // about 5 weeks ahead
    expect(only(plan({ reminders: [far] }), 'reminder')).toEqual([]);
    expect(only(plan({ reminders: [far], horizonDays: 60 }), 'reminder')).toHaveLength(1);
    const list = plan({ horizonDays: 10 });
    for (const n of list) expect(n.at.getTime()).toBeLessThanOrEqual(sunday.getTime() + 10 * 24 * 60 * MIN);
  });

  it('everything is in the future and sorted by time', () => {
    const list = plan({
      events: [ev({}), ev({ id: 2, hDay: 20, reminder: 'morning' }), ev({ id: 3, hDay: 1, hMonth: months.KISLEV })],
      reminders: [rem({}), rem({ id: 2, hDay: 16, alert: ALERT_DAY_BEFORE })],
    });
    expect(list.length).toBeGreaterThan(5);
    const times = list.map((n) => n.at.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    for (const t of times) expect(t).toBeGreaterThan(sunday.getTime());
    expect(new Set(list.map((n) => n.id)).size).toBe(list.length);
  });

  it('caps at 60, keeping the soonest', () => {
    const reminders = Array.from({ length: 80 }, (_, i) =>
      rem({ id: i, hDay: 15 + (i % 14), time: `${String(10 + (i % 10)).padStart(2, '0')}:00`, title: `r${i}` }),
    );
    const all = plan({ reminders, horizonDays: 30 });
    expect(all).toHaveLength(MAX_SCHEDULED);
    const full = planNotifications({ now: sunday, events: [], reminders, city: jerusalem, il: true });
    expect(all).toEqual(full);
    const last = all[all.length - 1].at.getTime();
    // Nothing dropped is sooner than the last kept item.
    const uncapped = reminders.length + only(plan({}), 'shabbat').length;
    expect(uncapped).toBeGreaterThan(MAX_SCHEDULED);
    expect(all.every((n) => n.at.getTime() <= last)).toBe(true);
  });
});

describe('planCountdowns', () => {
  it('starts three hours before candle lighting and ends at it', () => {
    const [w] = planCountdowns({ now: sunday, city: jerusalem, il: true });
    const [p] = restPeriods(sunday, new Date('2026-11-01T00:00:00Z'), jerusalem, true);
    expect(w.end.getTime()).toBe(p.candles.getTime());
    expect(w.start.getTime()).toBe(p.candles.getTime() - 180 * MIN);
    expect(w.title).toBe(`הדלקת נרות ${formatTime(p.candles, TZ)}`);
    expect(w.body).toBe('ירושלים');
  });

  it('skips the motzei-Shabbat lighting of Rosh Hashana 5787', () => {
    const list = planCountdowns({ now: new Date('2026-09-10T06:00:00Z'), city: jerusalem, il: true, horizonDays: 4 });
    expect(list).toHaveLength(1);
    expect(local(list[0].end).slice(0, 10)).toBe('2026-09-11');
  });

  it('still lists the window while it is running, not after candle lighting', () => {
    const [p] = restPeriods(sunday, new Date('2026-11-01T00:00:00Z'), jerusalem, true);
    const during = new Date(p.candles.getTime() - 60 * MIN);
    expect(planCountdowns({ now: during, city: jerusalem, il: true })[0].end.getTime()).toBe(p.candles.getTime());
    const after = new Date(p.candles.getTime() + MIN);
    expect(planCountdowns({ now: after, city: jerusalem, il: true, horizonDays: 2 })).toEqual([]);
  });
});


describe('date stub (design ה1)', () => {
  it('stubFor: day with gershayim or geresh, month name in the app spelling', () => {
    expect(stubFor(new HDate(15, months.CHESHVAN, 5787))).toEqual({ day: 'ט״ו', month: 'חשוון' });
    expect(stubFor(new HDate(5, months.KISLEV, 5787))).toEqual({ day: 'ה׳', month: 'כסלו' });
    expect(stubFor(new HDate(30, months.CHESHVAN, 5787)).day).toBe('ל׳');
    expect(stubFor(new HDate(15, months.SHVAT, 5787))).toEqual({ day: 'ט״ו', month: 'שבט' });
  });

  it("an event shows its own date, not the day it is delivered", () => {
    // 'evening' fires on 24 Cheshvan at sunset, 'week' on 18 Cheshvan; both are about 25 Cheshvan.
    for (const reminder of ['evening', 'morning', 'week'] as const) {
      expect(only(plan({ events: [ev({ reminder })] }), 'event')[0].stub).toEqual({ day: 'כ״ה', month: 'חשוון' });
    }
  });

  it("a reminder shows its own date, also when alerted the day before", () => {
    expect(only(plan({ reminders: [rem({})] }), 'reminder')[0].stub).toEqual({ day: 'י״ח', month: 'חשוון' });
    expect(only(plan({ reminders: [rem({ alert: ALERT_DAY_BEFORE })] }), 'reminder')[0].stub).toEqual({
      day: 'י״ח',
      month: 'חשוון',
    });
  });

  it('Shabbat shows the candle-lighting day: Friday 30 Oct 2026 is 19 Cheshvan', () => {
    expect(only(plan({}), 'shabbat')[0].stub).toEqual({ day: 'י״ט', month: 'חשוון' });
  });

  it('a moved notification keeps its date; a merged one shows the shared date', () => {
    const moved = only(plan({ events: [ev({ hDay: 27, reminder: 'morning' })] }), 'event')[0];
    expect(moved.stub).toEqual({ day: 'כ״ז', month: 'חשוון' });
    const merged = only(
      plan({
        events: [ev({ hDay: 27, reminder: 'morning' })],
        reminders: [rem({ hDay: 27, alert: before(60), title: 'קידוש' })],
      }),
      'merged',
    )[0];
    expect(merged.stub).toEqual({ day: 'כ״ז', month: 'חשוון' });
  });

  it('a merged notification of different dates shows the day it is delivered', () => {
    // A 'week' alert for Shabbat 14 Nov fires Shabbat 7 Nov 08:00, beside a 27 Cheshvan morning alert.
    const nextShabbat = new HDate(new Date(2026, 10, 14, 12));
    const merged = only(
      plan({
        events: [
          ev({ hDay: 27, reminder: 'morning' }),
          ev({ id: 2, title: 'דן', hDay: nextShabbat.getDate(), hMonth: nextShabbat.getMonth(), reminder: 'week' }),
        ],
      }),
      'merged',
    );
    expect(merged).toHaveLength(1);
    // Delivered Friday 6 Nov, 30 minutes before candle lighting: 26 Cheshvan.
    expect(merged[0].stub).toEqual({ day: 'כ״ו', month: 'חשוון' });
  });
});
