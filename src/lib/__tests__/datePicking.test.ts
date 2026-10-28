import { months } from '@hebcal/core';
import {
  SHEET_VISIBLE_ROWS,
  clampHebrew,
  formatHebrewFull,
  hebrewDayOptions,
  hebrewMonthOptions,
  hebrewYearOptions,
  sheetStartIndex,
} from '../datePicking';

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

describe('sheetStartIndex', () => {
  const opts = (n: number) => Array.from({ length: n }, (_, i) => ({ value: i, label: String(i) }));

  it('opens a short list at the top, whatever is selected', () => {
    expect(sheetStartIndex(opts(6), 4)).toBeUndefined();
    expect(sheetStartIndex(opts(SHEET_VISIBLE_ROWS), SHEET_VISIBLE_ROWS - 1)).toBeUndefined();
  });

  it('opens a long list at the selected row', () => {
    expect(sheetStartIndex(opts(30), 14)).toBe(14);
  });

  it('opens at the top when the first row or nothing is selected', () => {
    expect(sheetStartIndex(opts(30), 0)).toBeUndefined();
    expect(sheetStartIndex(opts(30), 99)).toBeUndefined();
  });
});
