import { HDate, months } from '@hebcal/core';
import {
  alertOptions,
  dayOffKind,
  dayOffWarning,
  gregorianLine,
  isShabbatOrYomTov,
  nextReminderDate,
  reminderDaysInRange,
  reminderRowLabel,
  remindersOn,
  reminderWhen,
  sortedReminders,
  timeOptions,
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
    alert: 'hour',
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

  it('time options in 15-minute steps, with all day first', () => {
    const opts = timeOptions();
    expect(opts[0]).toEqual({ value: null, label: 'כל היום' });
    expect(opts[1].value).toBe('00:00');
    expect(opts[43].value).toBe('10:30');
    expect(opts.length).toBe(1 + 96);
  });

  it('no "hour before" for an all-day reminder', () => {
    expect(alertOptions('10:30').map((o) => o.value)).toEqual(['hour', 'morning', 'day']);
    expect(alertOptions(null).map((o) => o.value)).toEqual(['morning', 'day']);
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
