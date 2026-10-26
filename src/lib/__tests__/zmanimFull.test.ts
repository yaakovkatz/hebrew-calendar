import { HDate, months } from '@hebcal/core';
import { DafYomi } from '@hebcal/learning';
import { CITIES } from '../cities';
import {
  addDays,
  civilDayLine,
  dafYomi,
  dayNoon,
  fullZmanim,
  hebrewDayTitle,
  nextZmanKey,
  sameDay,
  shabbatRows,
} from '../zmanimFull';

const jerusalem = CITIES.find((c) => c.id === 'jerusalem')!;
const monday = new Date(2026, 9, 26, 12); // 26.10.2026, ט״ו בחשוון תשפ״ז
const friday = new Date(2026, 9, 23, 12);
const shabbat = new Date(2026, 9, 24, 12);

const KEYS = [
  'alot', 'misheyakir', 'sunrise', 'shmaMGA', 'shmaGRA', 'tfillaMGA', 'tfillaGRA', 'chatzot',
  'minchaGedola', 'minchaKetana', 'plag', 'sunset', 'tzeit', 'tzeit72', 'chatzotNight',
];

const at = (rows: { key: string; time: Date | null }[], key: string) => rows.find((r) => r.key === key)!.time!;

describe('fullZmanim', () => {
  const rows = fullZmanim(monday, jerusalem, true);

  it('has all fifteen rows in the approved order', () => {
    expect(rows.map((r) => r.key)).toEqual(KEYS);
    expect(rows[0].label).toBe('עלות השחר');
    expect(rows[13].label).toBe('צאת הכוכבים ר״ת');
    expect(rows[14].label).toBe('חצות הלילה');
  });

  it('has every time in Jerusalem, in time order', () => {
    const times = rows.map((r) => r.time!.getTime());
    expect(rows.every((r) => r.time instanceof Date)).toBe(true);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('has tonight\'s chatzot night, about midway between sunset and the next sunrise', () => {
    const nextSunrise = at(fullZmanim(addDays(monday, 1), jerusalem, true), 'sunrise').getTime();
    const mid = (at(rows, 'sunset').getTime() + nextSunrise) / 2;
    expect(Math.abs(at(rows, 'chatzotNight').getTime() - mid)).toBeLessThan(5 * 60_000);
  });

  it('puts MGA before GRA', () => {
    expect(at(rows, 'shmaMGA').getTime()).toBeLessThan(at(rows, 'shmaGRA').getTime());
    expect(at(rows, 'tfillaMGA').getTime()).toBeLessThan(at(rows, 'tfillaGRA').getTime());
  });

  it('has Rabbeinu Tam 72 minutes after sunset', () => {
    const diff = at(rows, 'tzeit72').getTime() - at(rows, 'sunset').getTime();
    expect(Math.abs(diff - 72 * 60_000)).toBeLessThan(60_000);
  });

  it('accepts an HDate for the same day', () => {
    const hd = new HDate(15, months.CHESHVAN, 5787);
    expect(fullZmanim(hd, jerusalem, true).map((r) => r.time?.getTime())).toEqual(rows.map((r) => r.time?.getTime()));
  });

  it('returns null, not an invalid date, when the sun never sets', () => {
    const north = { ...jerusalem, id: 'north', latitude: 78.2, longitude: 15.6, tzid: 'Arctic/Longyearbyen' };
    const summer = fullZmanim(new Date(2026, 5, 21, 12), north, false);
    expect(summer.find((r) => r.key === 'sunset')!.time).toBeNull();
    expect(summer.find((r) => r.key === 'tzeit72')!.time).toBeNull();
    expect(summer.every((r) => r.time === null || !Number.isNaN(r.time.getTime()))).toBe(true);
  });
});

describe('nextZmanKey', () => {
  const rows = fullZmanim(monday, jerusalem, true);

  it('is the first row after now', () => {
    const now = new Date(at(rows, 'sunrise').getTime() + 1000);
    expect(nextZmanKey(rows, now)).toBe('shmaMGA');
  });

  it('is null after chatzot night', () => {
    expect(nextZmanKey(rows, new Date(at(rows, 'chatzotNight').getTime() + 1000))).toBeNull();
  });
});

describe('shabbatRows', () => {
  it('is empty on a plain weekday', () => {
    expect(shabbatRows(monday, jerusalem, true)).toEqual([]);
  });

  it('has candle lighting on Friday, 40 minutes before sunset in Jerusalem', () => {
    const rows = shabbatRows(friday, jerusalem, true);
    expect(rows.map((r) => [r.key, r.label])).toEqual([['candles', 'הדלקת נרות']]);
    const sunset = at(fullZmanim(friday, jerusalem, true), 'sunset');
    expect(Math.abs(sunset.getTime() - rows[0].time.getTime() - 40 * 60_000)).toBeLessThan(60_000);
  });

  it('has "צאת השבת" on Shabbat, after sunset', () => {
    const rows = shabbatRows(shabbat, jerusalem, true);
    expect(rows.map((r) => [r.key, r.label])).toEqual([['havdalah', 'צאת השבת']]);
    expect(rows[0].time.getTime()).toBeGreaterThan(at(fullZmanim(shabbat, jerusalem, true), 'sunset').getTime());
  });

  // A one-day Yom Tov (in Israel) on a weekday, not touching Shabbat.
  const chag = [
    new HDate(15, months.TISHREI, 5787),
    new HDate(15, months.NISAN, 5787),
    new HDate(6, months.SIVAN, 5787),
    new HDate(15, months.TISHREI, 5788),
  ].find((hd) => hd.getDay() >= 0 && hd.getDay() <= 4)!;

  it('has candles on erev chag and "צאת החג" on Yom Tov', () => {
    expect(chag).toBeDefined();
    expect(shabbatRows(chag.prev(), jerusalem, true).map((r) => [r.key, r.label])).toEqual([['candles', 'הדלקת נרות']]);
    expect(shabbatRows(chag, jerusalem, true).map((r) => [r.key, r.label])).toEqual([['havdalah', 'צאת החג']]);
  });

  // All app cities are Israeli Locations, and hebcal treats an Israeli location as il.
  it('keeps the Israeli schedule for an Israeli city even when il is false', () => {
    expect(shabbatRows(chag, jerusalem, false).map((r) => r.key)).toEqual(['havdalah']);
  });
});

describe('dafYomi', () => {
  it('renders the library value in Hebrew without nikud or "דף"', () => {
    const lib = new DafYomi(monday);
    expect(lib.getName()).toBe('Bechorot');
    expect(lib.getBlatt()).toBe(38);
    expect(dafYomi(monday)).toBe('בכורות ל״ח');
  });

  it('accepts an HDate', () => {
    expect(dafYomi(new HDate(15, months.CHESHVAN, 5787))).toBe('בכורות ל״ח');
  });

  it('is null before the first cycle', () => {
    expect(dafYomi(new Date(1900, 0, 1, 12))).toBeNull();
  });
});

describe('header helpers', () => {
  it('formats the Hebrew title and the civil line', () => {
    expect(hebrewDayTitle(monday)).toBe('ט״ו בחשוון');
    expect(civilDayLine(monday, 'ירושלים')).toBe('יום שני · 26 באוקטובר · ירושלים');
  });

  it('moves across months and compares days', () => {
    expect(dayNoon(addDays(new Date(2026, 9, 31, 8), 1))).toEqual(new Date(2026, 10, 1, 12));
    expect(sameDay(addDays(monday, -1), new Date(2026, 9, 25, 3))).toBe(true);
    expect(sameDay(monday, friday)).toBe(false);
  });
});
