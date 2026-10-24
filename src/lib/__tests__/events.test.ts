import { HDate, months } from '@hebcal/core';
import {
  eventDaysInRange,
  headline,
  hebrewFromGregorian,
  nextOccurrence,
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

  it('names the original date without gender', () => {
    expect(originalDateLabel('birthday')).toBe('תאריך לידה');
    expect(originalDateLabel('anniversary')).toBe('תאריך החתונה');
    expect(originalDateLabel('other')).toBe('התאריך');
  });

  it('formats a short Hebrew date with geresh and gershayim', () => {
    expect(shortHebrewDate(new HDate(25, months.CHESHVAN, 5787))).toBe('כ״ה חשוון');
    expect(shortHebrewDate(new HDate(3, months.KISLEV, 5787))).toBe('ג׳ כסלו');
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
