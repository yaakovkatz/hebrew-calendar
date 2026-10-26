import { HDate, months } from '@hebcal/core';
import {
  eventDaysInRange,
  headline,
  EVENT_TYPES,
  hebrewFromGregorian,
  mitzvahDate,
  mitzvahTitle,
  nextOccurrence,
  previewLine,
  originalDateLabel,
  shortHebrewDate,
  upcoming,
  whenLabel,
  yearsLabel,
  type FamilyEvent,
} from '../events';

const today = new HDate(12, months.CHESHVAN, 5787); // Friday 23 Oct 2026

function ev(partial: Partial<FamilyEvent>): FamilyEvent {
  return {
    id: 1,
    type: 'birthday',
    title: 'אמא',
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

describe('nextOccurrence', () => {
  it('is later this year when the date is still ahead', () => {
    const hd = nextOccurrence(ev({}), today);
    expect([hd.getDate(), hd.getMonth(), hd.getFullYear()]).toEqual([25, months.CHESHVAN, 5787]);
  });

  it('is today when the date is today', () => {
    expect(nextOccurrence(ev({ hDay: 12 }), today).abs()).toBe(today.abs());
  });

  it('moves to next year when the date already passed', () => {
    const hd = nextOccurrence(ev({ hDay: 1, hMonth: months.TISHREI }), today);
    expect(hd.getFullYear()).toBe(5788);
  });

  it('puts an Adar birthday from a regular year in Adar II of a leap year', () => {
    const hd = nextOccurrence(ev({ hDay: 10, hMonth: months.ADAR_I, hYear: 5778 }), today);
    expect(hd.getMonth()).toBe(months.ADAR_II);
    expect(hd.getFullYear()).toBe(5787);
  });

  it('never returns a date before the event itself', () => {
    const future = ev({ hYear: 5790 });
    expect(nextOccurrence(future, today).getFullYear()).toBeGreaterThanOrEqual(5790);
  });
});

describe('yahrzeit (hebcal getYahrzeit, not birthday rules)', () => {
  // 15 Adar 5785 (a regular year); 5787 is a leap year.
  const adar = { hDay: 15, hMonth: months.ADAR_I, hYear: 5785 };
  const ymd = (hd: HDate) => [hd.getDate(), hd.getMonth(), hd.getFullYear()];

  it('Adar of a regular year: the yahrzeit is in Adar I, a birthday in Adar II', () => {
    expect(ymd(nextOccurrence(ev({ ...adar, type: 'yahrzeit' }), today))).toEqual([15, months.ADAR_I, 5787]);
    expect(ymd(nextOccurrence(ev({ ...adar, type: 'birthday' }), today))).toEqual([15, months.ADAR_II, 5787]);
  });

  it('30 Cheshvan in a year without it: the yahrzeit is 29 Cheshvan, a birthday 1 Kislev', () => {
    const cheshvan30 = { hDay: 30, hMonth: months.CHESHVAN, hYear: 5785 };
    const from = new HDate(1, months.TISHREI, 5786); // 5786 has a short Cheshvan
    expect(ymd(nextOccurrence(ev({ ...cheshvan30, type: 'yahrzeit' }), from))).toEqual([29, months.CHESHVAN, 5786]);
    expect(ymd(nextOccurrence(ev({ ...cheshvan30, type: 'birthday' }), from))).toEqual([1, months.KISLEV, 5786]);
  });

  it('the first yahrzeit is a year later, never the day itself', () => {
    const recent = ev({ type: 'yahrzeit', hDay: 12, hMonth: months.CHESHVAN, hYear: 5787 });
    expect(ymd(nextOccurrence(recent, today))).toEqual([12, months.CHESHVAN, 5788]);
  });
});

describe('upcoming', () => {
  it('sorts by days until, across the year boundary', () => {
    const list = upcoming(
      [
        ev({ id: 1, title: 'ראש השנה', hDay: 1, hMonth: months.TISHREI }),
        ev({ id: 2, title: 'אמא' }),
        ev({ id: 3, title: 'נועה', hDay: 2, hMonth: months.SHVAT, hYear: 5778 }),
      ],
      today,
    );
    expect(list.map((u) => u.event.title)).toEqual(['אמא', 'נועה', 'ראש השנה']);
    expect(list[0].daysUntil).toBe(13);
    expect(list[0].years).toBe(64);
  });
});

describe('eventDaysInRange', () => {
  const start = new HDate(1, months.CHESHVAN, 5787);
  const end = new HDate(30, months.CHESHVAN, 5787);

  it('marks each day that has an event, once even with two events', () => {
    const days = eventDaysInRange(
      [ev({ id: 1 }), ev({ id: 2, title: 'אבא' }), ev({ id: 3, hDay: 3, hMonth: months.KISLEV })],
      start,
      end,
    );
    expect([...days]).toEqual([new HDate(25, months.CHESHVAN, 5787).abs()]);
  });

  it('finds an event across the year boundary', () => {
    const days = eventDaysInRange(
      [ev({ hDay: 2, hMonth: months.TISHREI })],
      new HDate(25, months.ELUL, 5787),
      new HDate(5, months.TISHREI, 5788),
    );
    expect(days.has(new HDate(2, months.TISHREI, 5788).abs())).toBe(true);
  });
});

describe('labels', () => {
  it('counts down in words', () => {
    expect(whenLabel(0)).toBe('היום');
    expect(whenLabel(1)).toBe('מחר');
    expect(whenLabel(13)).toBe('בעוד 13 ימים');
  });

  it('writes headlines and gender-neutral years', () => {
    const [item] = upcoming([ev({})], today);
    expect(headline(item.event)).toBe('יום ההולדת של אמא');
    expect(yearsLabel(item)).toBe('יום הולדת 64');
    const [anniv] = upcoming([ev({ type: 'anniversary', title: 'ההורים', hYear: 5749 })], today);
    expect(headline(anniv.event)).toBe('יום הנישואין של ההורים');
    expect(yearsLabel(anniv)).toBe('שנה 38');
  });

  it('yahrzeit and aliyah: headline and "שנה N"', () => {
    const [yz] = upcoming([ev({ type: 'yahrzeit', title: 'סבא', hYear: 5784 })], today);
    expect(headline(yz.event)).toBe('האזכרה של סבא');
    expect(yearsLabel(yz)).toBe('שנה 3');
    const [al] = upcoming([ev({ type: 'aliyah', title: 'סבתא', hYear: 5710 })], today);
    expect(headline(al.event)).toBe('יום העלייה של סבתא');
    expect(yearsLabel(al)).toBe('שנה 77');
  });

  it('"אחר" shows years only when asked', () => {
    const [plain] = upcoming([ev({ type: 'other', title: 'פתיחת העסק', hYear: 5777 })], today);
    expect(headline(plain.event)).toBe('פתיחת העסק');
    expect(yearsLabel(plain)).toBeNull();
    const [withYears] = upcoming([ev({ type: 'other', title: 'פתיחת העסק', hYear: 5777, showYears: true })], today);
    expect(yearsLabel(withYears)).toBe('שנה 10');
  });

  it('the preview line on the add screen', () => {
    expect(previewLine(ev({ title: 'נועה', hYear: 5778 }), today)).toBe('יופיע: יום ההולדת של נועה · 9');
    expect(previewLine(ev({ type: 'yahrzeit', title: 'סבא', hYear: 5784 }), today)).toBe('יופיע: האזכרה של סבא · שנה 3');
    expect(previewLine(ev({ type: 'other', title: 'פתיחת העסק', hYear: 5777 }), today)).toBe('יופיע: פתיחת העסק');
    // Born this year: no age yet.
    expect(previewLine(ev({ title: 'תינוק', hYear: 5787 }), today)).toBe('יופיע: יום ההולדת של תינוק');
  });

  it('the type sheet lists five types, each with a hint', () => {
    expect(EVENT_TYPES.map((t) => t.label)).toEqual(['יום הולדת', 'נישואין', 'אזכרה', 'עלייה לארץ', 'אחר']);
    expect(EVENT_TYPES.every((t) => t.hint.length > 0)).toBe(true);
  });

  it('names the original date without gender', () => {
    expect(originalDateLabel('birthday')).toBe('תאריך לידה');
    expect(originalDateLabel('anniversary')).toBe('תאריך החתונה');
    expect(originalDateLabel('yahrzeit')).toBe('תאריך הפטירה');
    expect(originalDateLabel('aliyah')).toBe('תאריך העלייה');
    expect(originalDateLabel('other')).toBe('התאריך');
  });

  it('formats a short Hebrew date with geresh and gershayim', () => {
    expect(shortHebrewDate(new HDate(25, months.CHESHVAN, 5787))).toBe('כ״ה חשוון');
    expect(shortHebrewDate(new HDate(3, months.KISLEV, 5787))).toBe('ג׳ כסלו');
  });
});

describe('bar and bat mitzvah', () => {
  const ymd = (hd: HDate) => [hd.getDate(), hd.getMonth(), hd.getFullYear()];

  it('bar mitzvah on the 13th Hebrew birthday, bat mitzvah on the 12th', () => {
    const birth = { hDay: 2, hMonth: months.SHVAT, hYear: 5778 };
    expect(ymd(mitzvahDate(birth, 'bar'))).toEqual([2, months.SHVAT, 5791]);
    expect(ymd(mitzvahDate(birth, 'bat'))).toEqual([2, months.SHVAT, 5790]);
  });

  it('born in Adar of a regular year: Adar II when the year is a leap year', () => {
    // 5790 is a leap year.
    expect(HDate.isLeapYear(5790)).toBe(true);
    expect(ymd(mitzvahDate({ hDay: 10, hMonth: months.ADAR_I, hYear: 5778 }, 'bat'))).toEqual([10, months.ADAR_II, 5790]);
  });

  it('titles', () => {
    expect(mitzvahTitle('דוד', 'bar')).toBe('בר מצווה של דוד');
    expect(mitzvahTitle('נועה', 'bat')).toBe('בת מצווה של נועה');
  });
});

describe('hebrewFromGregorian', () => {
  it('gives the next Hebrew day after sunset', () => {
    const before = hebrewFromGregorian(2026, 10, 23, false);
    const after = hebrewFromGregorian(2026, 10, 23, true);
    expect(before.getDate()).toBe(12);
    expect(after.getDate()).toBe(13);
  });
});
