import { HDate, months } from '@hebcal/core';
import { dayItemsInRange } from '../dayItems';
import type { FamilyEvent } from '../events';
import { before, type Reminder } from '../reminders';

const start = new HDate(1, months.CHESHVAN, 5787);
const end = new HDate(29, months.CHESHVAN, 5787);
const abs = (d: number) => new HDate(d, months.CHESHVAN, 5787).abs();

function ev(partial: Partial<FamilyEvent>): FamilyEvent {
  return {
    id: 1,
    type: 'birthday',
    title: 'אשר',
    hDay: 26,
    hMonth: months.CHESHVAN,
    hYear: 5780,
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
    hDay: 16,
    hMonth: months.CHESHVAN,
    hYear: 5787,
    time: '09:00',
    repeat: 'once',
    alert: before(15),
    createdAt: '2026-10-23 10:00:00',
    ...partial,
  };
}

describe('dayItemsInRange', () => {
  it('names a family date by its headline, and a reminder by its title', () => {
    const days = dayItemsInRange([ev({})], [rem({})], start, end);
    expect(days.get(abs(26))).toEqual([{ title: 'יום ההולדת של אשר', kind: 'family', time: null }]);
    expect(days.get(abs(16))).toEqual([{ title: 'רופא שיניים', kind: 'reminder', time: '09:00' }]);
  });

  it('marks a yahrzeit as a memorial', () => {
    const days = dayItemsInRange([ev({ type: 'yahrzeit', title: 'סבא', hDay: 23 })], [], start, end);
    expect(days.get(abs(23))?.[0].kind).toBe('memorial');
  });

  it('puts family dates first, then reminders by time', () => {
    const days = dayItemsInRange(
      [ev({ hDay: 11 })],
      [rem({ id: 2, hDay: 11, time: '19:00', title: 'אסיפת הורים' }), rem({ id: 3, hDay: 11, time: '08:00', title: 'ביקור סבתא' })],
      start,
      end,
    );
    expect(days.get(abs(11))?.map((i) => i.title)).toEqual(['יום ההולדת של אשר', 'ביקור סבתא', 'אסיפת הורים']);
  });

  it('leaves out what falls outside the range', () => {
    const days = dayItemsInRange([ev({ hMonth: months.KISLEV, hDay: 5 })], [rem({ hMonth: months.KISLEV })], start, end);
    expect(days.size).toBe(0);
  });
});
