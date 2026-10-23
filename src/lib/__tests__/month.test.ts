import { HDate, months } from '@hebcal/core';
import { buildMonth, dayLetters, hebrewMonthName, shiftMonth, yearLabel } from '../month';

const today = new HDate(12, months.CHESHVAN, 5787);

describe('buildMonth — Cheshvan 5787', () => {
  const grid = buildMonth(5787, months.CHESHVAN, today, true);

  it('uses the modern spelling and the year in letters', () => {
    expect(grid.title).toBe('חשוון');
    expect(grid.yearLabel).toBe('תשפ״ז');
    expect(grid.gregRange).toBe('אוקטובר – נובמבר 2026');
  });

  it('covers whole weeks from Sunday to Shabbat', () => {
    expect(grid.cells.length % 7).toBe(0);
    expect(grid.cells[0].hd.getDay()).toBe(0);
    expect(grid.cells[grid.cells.length - 1].hd.getDay()).toBe(6);
  });

  it('starts on Sunday 30 Tishrei, outside the month, with 1 Cheshvan on Monday 12 Oct', () => {
    expect(grid.cells[0].inMonth).toBe(false);
    expect(grid.cells[1].label).toBe('א');
    expect(grid.cells[1].gregDay).toBe(12);
  });

  it('marks today and the Shabbat parsha', () => {
    const t = grid.cells.find((c) => c.isToday)!;
    expect(t.label).toBe('יב');
    const shabbat = grid.cells.find((c) => c.isShabbat && c.hd.getDate() === 13)!;
    expect(shabbat.parsha).toBe('לך־לך');
  });

  it('lists Rosh Chodesh as a holiday', () => {
    const first = grid.cells.find((c) => c.inMonth && c.hd.getDate() === 1)!;
    expect(first.holidays.join(' ')).toContain('ראש חודש');
  });
});

describe('helpers', () => {
  it('writes days without geresh, avoiding יה and יו', () => {
    expect(dayLetters(11)).toBe('יא');
    expect(dayLetters(15)).toBe('טו');
    expect(dayLetters(16)).toBe('טז');
  });

  it('writes the year without the thousands', () => {
    expect(yearLabel(5787)).toBe('תשפ״ז');
  });

  it('names Adar I and Adar II in a leap year', () => {
    expect(hebrewMonthName(months.ADAR_I, 5787)).toContain('אדר');
    expect(hebrewMonthName(months.ADAR_II, 5787)).toContain('ב');
  });

  it('moves between months across the year boundary', () => {
    expect(shiftMonth(5787, months.ELUL, 1)).toEqual({ year: 5788, month: months.TISHREI });
    expect(shiftMonth(5787, months.TISHREI, -1)).toEqual({ year: 5786, month: months.ELUL });
    expect(shiftMonth(5787, months.ADAR_I, 1)).toEqual({ year: 5787, month: months.ADAR_II });
  });
});
