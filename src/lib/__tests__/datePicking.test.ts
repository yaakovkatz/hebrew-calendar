import { months } from '@hebcal/core';
import { clampHebrew, formatHebrewFull, hebrewDayOptions, hebrewMonthOptions, hebrewYearOptions } from '../datePicking';

describe('hebrewMonthOptions', () => {
  it('starts with Tishrei and has 13 months in a leap year', () => {
    const leap = hebrewMonthOptions(5787);
    expect(leap[0].label).toBe('תשרי');
    expect(leap).toHaveLength(13);
    expect(hebrewMonthOptions(5786)).toHaveLength(12);
  });
});

describe('hebrewDayOptions', () => {
  it('offers only days that exist', () => {
    expect(hebrewDayOptions(months.CHESHVAN, 5787)).toHaveLength(30);
    expect(hebrewDayOptions(months.ELUL, 5787)).toHaveLength(29);
    expect(hebrewDayOptions(months.TISHREI, 5787)[0].label).toBe('א׳');
  });
});

describe('hebrewYearOptions', () => {
  it('runs from 100 years ahead back to 1900', () => {
    const list = hebrewYearOptions(5787);
    expect(list[0].value).toBe(5887);
    expect(list[list.length - 1].value).toBe(5660);
    expect(list.find((o) => o.value === 5787)!.label).toBe('תשפ״ז (2026/27)');
  });
});

describe('clampHebrew', () => {
  it('turns Adar II into Adar in a regular year and trims missing days', () => {
    expect(clampHebrew(10, months.ADAR_II, 5786)).toEqual({ day: 10, month: months.ADAR_I });
    expect(clampHebrew(30, months.ELUL, 5787)).toEqual({ day: 29, month: months.ELUL });
  });
});

describe('formatHebrewFull', () => {
  it('writes the full Hebrew date', () => {
    expect(formatHebrewFull(2, months.SHVAT, 5778)).toBe('ב׳ בשבט תשע״ח');
  });
});
