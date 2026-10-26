import { HDate, HebrewCalendar, months } from '@hebcal/core';
import { CITIES } from '../cities';
import {
  civilDateIn,
  defaultItemDate,
  formatHebrewDay,
  formatTime,
  hebrewDateAt,
  nextCandleLighting,
  parshaOfWeek,
  zmanimFor,
} from '../hebrewDay';

const jerusalem = CITIES.find((c) => c.id === 'jerusalem')!;
const TZ = 'Asia/Jerusalem';

// Friday 23 Oct 2026 = 12 Cheshvan 5787 (Israel is on UTC+3 until 25 Oct).
const fridayMorning = new Date('2026-10-23T07:28:00Z');

describe('civilDateIn', () => {
  it('uses the city time zone, not the device one', () => {
    // 22:30 UTC on the 22nd is already the 23rd in Jerusalem.
    expect(civilDateIn(new Date('2026-10-22T22:30:00Z'), TZ)).toEqual({ year: 2026, month: 10, day: 23 });
  });
});

describe('hebrewDateAt — flips at sunset', () => {
  it('is 12 Cheshvan on Friday morning', () => {
    const hd = hebrewDateAt(fridayMorning, jerusalem);
    expect(hd.getDate()).toBe(12);
    expect(hd.getMonth()).toBe(months.CHESHVAN);
    expect(hd.getFullYear()).toBe(5787);
  });

  it('is still 12 Cheshvan one minute before sunset', () => {
    const sunset = zmanimFor(fridayMorning, jerusalem).sunset();
    expect(hebrewDateAt(new Date(sunset.getTime() - 60_000), jerusalem).getDate()).toBe(12);
  });

  it('becomes 13 Cheshvan at sunset', () => {
    const sunset = zmanimFor(fridayMorning, jerusalem).sunset();
    expect(hebrewDateAt(sunset, jerusalem).getDate()).toBe(13);
  });
});

describe('formatting', () => {
  it('renders the day in gematria without the year', () => {
    expect(formatHebrewDay(new HDate(12, months.CHESHVAN, 5787))).toBe('י״ב חשון');
  });

  it('formats a time as HH:MM in the city time zone', () => {
    expect(formatTime(new Date('2026-10-23T14:08:00Z'), TZ)).toBe('17:08');
  });

  it('shows a dash for a time that does not exist', () => {
    expect(formatTime(new Date(NaN), TZ)).toBe('—');
    expect(formatTime(null, TZ)).toBe('—');
  });
});

describe('Shabbat', () => {
  it('finds parashat Lech Lecha for the week of 12 Cheshvan 5787', () => {
    expect(parshaOfWeek(new HDate(12, months.CHESHVAN, 5787), true)).toBe('פרשת לך־לך');
  });

  it('lights candles in Jerusalem 40 minutes before sunset', () => {
    const candles = nextCandleLighting(fridayMorning, jerusalem)!;
    const sunset = zmanimFor(fridayMorning, jerusalem).sunset();
    const diffMin = Math.round((sunset.getTime() - candles.getTime()) / 60_000);
    expect(diffMin).toBe(40);
  });
});

describe('birthdays (library rules we rely on)', () => {
  it('moves a birthday from Adar of a regular year to Adar II in a leap year', () => {
    const born = new HDate(10, months.ADAR_I, 5778); // 5778 is a regular year
    const hd = HebrewCalendar.getBirthdayOrAnniversary(5787, born)!; // 5787 is a leap year
    expect(hd.getMonth()).toBe(months.ADAR_II);
    expect(hd.getDate()).toBe(10);
  });

  it('moves 30 Cheshvan to 1 Kislev in a year where Cheshvan has 29 days', () => {
    const born = new HDate(30, months.CHESHVAN, 5787); // Cheshvan 5787 has 30 days
    const shortYear = [5788, 5789, 5790, 5791].find((y) => HDate.daysInMonth(months.CHESHVAN, y) === 29)!;
    const hd = HebrewCalendar.getBirthdayOrAnniversary(shortYear, born)!;
    expect(hd.getMonth()).toBe(months.KISLEV);
    expect(hd.getDate()).toBe(1);
  });
});

describe('defaultItemDate', () => {
  const jerusalem = CITIES[0];
  // Monday 26.10.2026 at 19:06 in Israel (16:06 UTC), after sunset: the Hebrew day is already ט״ז.
  const evening = new Date('2026-10-26T16:06:00Z');
  const morning = new Date('2026-10-26T07:00:00Z');

  it('starts an event on the Hebrew day, which flipped at sunset', () => {
    expect(defaultItemDate('event', evening, jerusalem).getDate()).toBe(16);
  });

  it('starts a reminder on the civil date of today, so an evening time means tonight', () => {
    const d = defaultItemDate('reminder', evening, jerusalem);
    expect(d.getDate()).toBe(15);
    expect(d.greg().getDate()).toBe(26);
  });

  it('is the same day for both before sunset', () => {
    expect(defaultItemDate('reminder', morning, jerusalem).abs()).toBe(defaultItemDate('event', morning, jerusalem).abs());
  });
});
