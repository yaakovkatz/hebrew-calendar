import { HDate, months } from '@hebcal/core';
import {
  ALERT_DAY_BEFORE,
  ALERT_MORNING,
  alertFromStored,
  alertKey,
  alertLabel,
  alertPresets,
  alertToStored,
  before,
  customAlert,
  effectiveAlert,
  maskTime,
  parseTimeInput,
  splitAlert,
  dayOffKind,
  dayOffWarning,
  gregorianLine,
  isShabbatOrYomTov,
  nextReminderDate,
  reminderDaysInRange,
  reminderMomentPassed,
  reminderRowLabel,
  remindersOn,
  reminderWhen,
  sortedReminders,
  type Reminder,
} from '../reminders';

const today = new HDate(12, months.CHESHVAN, 5787); // Friday 23 Oct 2026

function rem(partial: Partial<Reminder>): Reminder {
  return {
    id: 1,
    title: 'רופא שיניים',
    hDay: 16,
    hMonth: months.CHESHVAN,
    hYear: 5787,
    time: '10:30',
    repeat: 'once',
    alert: before(60),
    createdAt: '2026-10-23 10:00:00',
    ...partial,
  };
}

const ymd = (hd: HDate | null) => (hd ? [hd.getDate(), hd.getMonth(), hd.getFullYear()] : null);

describe('nextReminderDate', () => {
  it('once: the date itself when still ahead', () => {
    expect(ymd(nextReminderDate(rem({}), today))).toEqual([16, months.CHESHVAN, 5787]);
  });

  it('once: today counts as ahead', () => {
    expect(nextReminderDate(rem({ hDay: 12 }), today)?.abs()).toBe(today.abs());
  });

  it('once: null when the date has passed', () => {
    expect(nextReminderDate(rem({ hDay: 1 }), today)).toBeNull();
    expect(nextReminderDate(rem({ hDay: 10, hMonth: months.NISAN, hYear: 5786 }), today)).toBeNull();
  });

  it('yearly: this year when ahead, next year when passed', () => {
    expect(ymd(nextReminderDate(rem({ repeat: 'yearly' }), today))).toEqual([16, months.CHESHVAN, 5787]);
    expect(ymd(nextReminderDate(rem({ repeat: 'yearly', hDay: 1 }), today))).toEqual([1, months.CHESHVAN, 5788]);
  });

  it('yearly: never before the saved date', () => {
    expect(nextReminderDate(rem({ repeat: 'yearly', hYear: 5790 }), today)?.getFullYear()).toBe(5790);
  });

  it('yearly: Adar from a regular year moves to Adar II in a leap year', () => {
    // 5786 is regular, 5787 is a leap year
    const hd = nextReminderDate(rem({ repeat: 'yearly', hDay: 10, hMonth: months.ADAR_I, hYear: 5786 }), today);
    expect(ymd(hd)).toEqual([10, months.ADAR_II, 5787]);
  });

  it('yearly: Adar I in a leap year stays Adar I in the next leap year', () => {
    const hd = nextReminderDate(rem({ repeat: 'yearly', hDay: 10, hMonth: months.ADAR_I, hYear: 5784 }), today);
    expect(ymd(hd)).toEqual([10, months.ADAR_I, 5787]);
  });
});

describe('Shabbat and Yom Tov', () => {
  it('10 Nisan 5787 is Shabbat, 17 Apr 2027', () => {
    const hd = new HDate(10, months.NISAN, 5787);
    expect(dayOffKind(hd, true)).toBe('shabbat');
    expect(isShabbatOrYomTov(hd, true)).toBe(true);
    expect(gregorianLine(hd)).toBe('שבת, 17 באפריל 2027');
    expect(dayOffWarning(hd, today, true)).toBe('השנה י׳ בניסן יוצא בשבת');
  });

  it('15 Nisan is Pesach', () => {
    const hd = new HDate(15, months.NISAN, 5787); // Thursday
    expect(dayOffKind(hd, true)).toBe('chag');
    expect(dayOffWarning(hd, today, true)).toBe('השנה ט״ו בניסן יוצא בחג');
  });

  it('Chol HaMoed and a regular day are not', () => {
    expect(isShabbatOrYomTov(new HDate(18, months.NISAN, 5787), true)).toBe(false); // Sunday of Chol HaMoed;
    expect(dayOffWarning(new HDate(16, months.CHESHVAN, 5787), today, true)).toBeNull();
  });

  it('respects il: 22 Nisan is Yom Tov only outside Israel', () => {
    const hd = new HDate(22, months.NISAN, 5787);
    expect(isShabbatOrYomTov(hd, true)).toBe(false);
    expect(isShabbatOrYomTov(hd, false)).toBe(true);
  });

  it('drops "השנה" for a date in a later year', () => {
    expect(dayOffWarning(new HDate(15, months.NISAN, 5788), today, true)).toBe('ט״ו בניסן יוצא בחג');
  });
});

describe('sortedReminders', () => {
  it('upcoming by date then time, past at the end', () => {
    const list = sortedReminders(
      [
        rem({ id: 1, title: 'עבר מזמן', hDay: 1, hMonth: months.TISHREI }),
        rem({ id: 2, title: 'אסיפת הורים', hDay: 3, hMonth: months.TEVET, time: '19:00' }),
        rem({ id: 3, title: 'רופא שיניים' }),
        rem({ id: 4, title: 'עבר אתמול', hDay: 11 }),
        rem({ id: 5, title: 'בוקר', time: '08:00' }),
        rem({ id: 6, title: 'סבתא', hDay: 15, hMonth: months.SHVAT, hYear: 5770, repeat: 'yearly', time: null }),
      ],
      today,
    );
    expect(list.map((i) => i.reminder.title)).toEqual(['בוקר', 'רופא שיניים', 'אסיפת הורים', 'סבתא', 'עבר אתמול', 'עבר מזמן']);
    expect(list[1].daysUntil).toBe(4);
    expect(list.filter((i) => i.past).length).toBe(2);
  });

  it('with the clock, a one-time reminder earlier today is past', () => {
    // Friday 23 Oct 2026, 11:00 in Jerusalem (UTC+3).
    const clock = { now: new Date('2026-10-23T08:00:00Z'), tzid: 'Asia/Jerusalem' };
    const list = sortedReminders(
      [rem({ id: 1, title: 'בבוקר', hDay: 12, time: '10:30' }), rem({ id: 2, title: 'בצהריים', hDay: 12, time: '12:00' })],
      today,
      clock,
    );
    expect(list.map((i) => [i.reminder.title, i.past])).toEqual([
      ['בצהריים', false],
      ['בבוקר', true],
    ]);
  });
});

describe('reminderMomentPassed', () => {
  const day = new HDate(12, months.CHESHVAN, 5787); // Friday 23 Oct 2026
  // Still summer time in Israel (UTC+3) on 23 Oct 2026.
  const at = (iso: string) => ({ now: new Date(iso), tzid: 'Asia/Jerusalem' });
  it('the time on the day, in the city', () => {
    expect(reminderMomentPassed(day, '10:30', at('2026-10-23T07:29:00Z'))).toBe(false); // 10:29
    expect(reminderMomentPassed(day, '10:30', at('2026-10-23T07:30:00Z'))).toBe(false); // 10:30, now
    expect(reminderMomentPassed(day, '10:30', at('2026-10-23T07:31:00Z'))).toBe(true); // 10:31
  });
  it('all day lasts until the end of the day', () => {
    expect(reminderMomentPassed(day, null, at('2026-10-23T20:59:00Z'))).toBe(false); // 23:59
    expect(reminderMomentPassed(day, null, at('2026-10-23T21:00:00Z'))).toBe(true); // 00:00 next day
  });
});

describe('labels', () => {
  it('countdown and row', () => {
    const [soon, yearly, past] = sortedReminders(
      [rem({}), rem({ id: 2, hDay: 15, hMonth: months.SHVAT, hYear: 5770, repeat: 'yearly', time: null }), rem({ id: 3, hDay: 1 })],
      today,
    );
    expect(reminderWhen(soon)).toBe('בעוד 4 ימים');
    expect(reminderRowLabel(soon)).toBe('ט״ז חשוון · 10:30');
    expect(reminderRowLabel(yearly)).toBe('כל שנה · ט״ו שבט');
    expect(reminderWhen(past)).toBe('עבר');
    expect(reminderRowLabel(past)).toBe('עבר · א׳ חשוון · 10:30');
  });

});

describe('alert', () => {
  it('old saved values keep working: hour = 60 minutes before, day = the day before', () => {
    expect(alertFromStored('hour', null)).toEqual(before(60));
    expect(alertFromStored('morning', null)).toEqual(ALERT_MORNING);
    expect(alertFromStored('day', null)).toEqual(ALERT_DAY_BEFORE);
    expect(alertFromStored('before', 1)).toEqual(before(1));
    expect(alertFromStored('before', 0)).toEqual(before(0));
    // A broken row never crashes: it alerts in the morning.
    expect(alertFromStored('before', null)).toEqual(ALERT_MORNING);
    expect(alertFromStored('???', null)).toEqual(ALERT_MORNING);
  });

  it('round-trips through the DB columns', () => {
    for (const a of [before(0), before(1), before(90), before(3 * 1440), ALERT_MORNING, ALERT_DAY_BEFORE]) {
      const { alert, minutes } = alertToStored(a);
      expect(alertFromStored(alert, minutes)).toEqual(a);
    }
  });

  it('labels', () => {
    expect([0, 1, 5, 15, 60, 120, 180, 1440, 2880, 4320, 90].map((m) => alertLabel(before(m)))).toEqual([
      'בזמן',
      'דקה לפני',
      '5 דק׳ לפני',
      '15 דק׳ לפני',
      'שעה לפני',
      'שעתיים לפני',
      '3 שעות לפני',
      '24 שעות לפני',
      'יומיים לפני',
      '3 ימים לפני',
      '90 דק׳ לפני',
    ]);
    expect(alertLabel(ALERT_MORNING)).toBe('בבוקר');
    expect(alertLabel(ALERT_DAY_BEFORE)).toBe('יום לפני');
  });

  it('presets: the "before" rows only with a time', () => {
    expect(alertPresets('10:30').map(alertLabel)).toEqual(['בזמן', '5 דק׳ לפני', '15 דק׳ לפני', 'שעה לפני', 'בבוקר', 'יום לפני']);
    expect(alertPresets(null).map(alertLabel)).toEqual(['בבוקר', 'יום לפני']);
    expect(effectiveAlert(before(15), null)).toEqual(ALERT_MORNING);
    expect(effectiveAlert(before(15), '10:30')).toEqual(before(15));
  });

  it('"אחר": a number and a unit', () => {
    expect(customAlert('1', 'minutes')).toEqual(before(1));
    expect(customAlert('2', 'hours')).toEqual(before(120));
    expect(customAlert('3', 'days')).toEqual(before(3 * 1440));
    expect(customAlert('0', 'minutes')).toEqual(before(0));
    expect(customAlert('', 'minutes')).toBeNull();
    expect(customAlert('1.5', 'hours')).toBeNull();
    expect(customAlert('99', 'days')).toBeNull();
    expect(splitAlert(before(120))).toEqual({ amount: '2', unit: 'hours' });
    expect(splitAlert(before(90))).toEqual({ amount: '90', unit: 'minutes' });
    expect(splitAlert(before(2880))).toEqual({ amount: '2', unit: 'days' });
  });

  it('keys are stable and distinct', () => {
    expect([before(0), before(60), ALERT_MORNING, ALERT_DAY_BEFORE].map(alertKey)).toEqual(['b0', 'b60', 'morning', 'day']);
  });
});

describe('typed time', () => {
  it('masks number-pad input as HH:MM', () => {
    expect(maskTime('1')).toBe('1');
    expect(maskTime('10')).toBe('10');
    expect(maskTime('103')).toBe('10:3');
    expect(maskTime('1030')).toBe('10:30');
    expect(maskTime('10305')).toBe('10:30');
    expect(maskTime('10:30')).toBe('10:30');
  });

  it('accepts 00:00 to 23:59 only', () => {
    expect(parseTimeInput('10:30')).toBe('10:30');
    expect(parseTimeInput('00:00')).toBe('00:00');
    expect(parseTimeInput('23:59')).toBe('23:59');
    expect(parseTimeInput('9:30')).toBe('09:30');
    expect(parseTimeInput('24:00')).toBeNull();
    expect(parseTimeInput('25:00')).toBeNull();
    expect(parseTimeInput('10:60')).toBeNull();
    expect(parseTimeInput('10:3')).toBeNull();
    expect(parseTimeInput('')).toBeNull();
  });
});

describe('month and day', () => {
  const start = new HDate(1, months.CHESHVAN, 5787);
  const end = new HDate(30, months.CHESHVAN, 5787);

  it('marks days with a reminder, including a once reminder already past today', () => {
    const days = reminderDaysInRange([rem({}), rem({ id: 2, hDay: 3 }), rem({ id: 3, hMonth: months.KISLEV })], start, end);
    expect([...days].sort()).toEqual([new HDate(3, months.CHESHVAN, 5787).abs(), new HDate(16, months.CHESHVAN, 5787).abs()].sort());
  });

  it('lists the reminders of one day by time', () => {
    const day = new HDate(16, months.CHESHVAN, 5787);
    const list = remindersOn([rem({ id: 1 }), rem({ id: 2, title: 'בוקר', time: '08:00' }), rem({ id: 3, hDay: 17 })], day);
    expect(list.map((r) => r.id)).toEqual([2, 1]);
  });
});
