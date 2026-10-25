import { months } from '@hebcal/core';
import { CITIES } from '../cities';
import type { FamilyEvent } from '../events';
import { zmanimFor } from '../hebrewDay';
import type { Reminder } from '../reminders';
import {
  dateWidgetData,
  EMPTY_NEXT_HINT,
  EMPTY_NEXT_TITLE,
  monthWidgetData,
  nextWidgetData,
  zmanimWidgetData,
  type WidgetInput,
} from '@/widgets/widgetData';

const jerusalem = CITIES.find((c) => c.id === 'jerusalem')!;

// Friday 23 Oct 2026 = 12 Cheshvan 5787 (Israel is on UTC+3 until 25 Oct).
const fridayMorning = new Date('2026-10-23T07:28:00Z'); // 10:28 in Jerusalem
const fridaySunset = zmanimFor(fridayMorning, jerusalem).sunset();

const mom: FamilyEvent = {
  id: 1,
  type: 'birthday',
  title: 'אמא',
  hDay: 25,
  hMonth: months.CHESHVAN,
  hYear: 5730,
  afterSunset: false,
  gregDate: null,
  reminder: 'evening',
};

function reminder(over: Partial<Reminder>): Reminder {
  return {
    id: 1,
    title: 'רופא שיניים',
    hDay: 12,
    hMonth: months.CHESHVAN,
    hYear: 5787,
    time: null,
    repeat: 'once',
    alert: 'morning',
    createdAt: '2026-10-01 00:00:00',
    ...over,
  };
}

function input(over: Partial<WidgetInput> = {}): WidgetInput {
  return { now: fridayMorning, city: jerusalem, il: true, events: [], reminders: [], ...over };
}

describe('dateWidgetData — flips at sunset', () => {
  it('shows שישי, י״ב חשוון on Friday morning', () => {
    expect(dateWidgetData(fridayMorning, jerusalem)).toEqual({ weekday: 'שישי', day: 'י״ב', month: 'חשוון' });
  });

  it('is still י״ב one minute before sunset', () => {
    expect(dateWidgetData(new Date(fridaySunset.getTime() - 60_000), jerusalem).day).toBe('י״ב');
  });

  it('becomes שבת, י״ג at sunset', () => {
    expect(dateWidgetData(fridaySunset, jerusalem)).toEqual({ weekday: 'שבת', day: 'י״ג', month: 'חשוון' });
  });
});

describe('nextWidgetData', () => {
  it('shows the empty state with no events or reminders', () => {
    expect(nextWidgetData(input())).toEqual({ kind: 'empty', when: EMPTY_NEXT_HINT, title: EMPTY_NEXT_TITLE });
    expect(EMPTY_NEXT_TITLE).toBe('עוד אין אירועים');
  });

  it('counts down to the next family date', () => {
    expect(nextWidgetData(input({ events: [mom] }))).toEqual({
      kind: 'event',
      when: 'בעוד 13 ימים',
      title: 'יום ההולדת של אמא',
    });
  });

  it('the countdown shrinks by a day at sunset', () => {
    expect(nextWidgetData(input({ now: fridaySunset, events: [mom] })).when).toBe('בעוד 12 ימים');
  });

  it('picks a reminder that comes before the family date', () => {
    const rem = reminder({ hDay: 14, time: '10:30' });
    expect(nextWidgetData(input({ events: [mom], reminders: [rem] }))).toEqual({
      kind: 'reminder',
      when: 'בעוד 2 ימים · 10:30',
      title: 'רופא שיניים',
    });
  });

  it('prefers the family date on the same day', () => {
    const rem = reminder({ hDay: 25 });
    expect(nextWidgetData(input({ events: [mom], reminders: [rem] })).kind).toBe('event');
  });

  it('skips a reminder whose time today has passed', () => {
    const past = reminder({ time: '09:00' }); // today, 10:28 now
    const later = reminder({ id: 2, title: 'פגישה', time: '11:00' });
    expect(nextWidgetData(input({ reminders: [past, later] }))).toMatchObject({ title: 'פגישה', when: 'היום · 11:00' });
    expect(nextWidgetData(input({ reminders: [past] })).kind).toBe('empty');
  });

  it('skips one-time reminders that are over', () => {
    expect(nextWidgetData(input({ reminders: [reminder({ hDay: 1 })] })).kind).toBe('empty');
  });
});

describe('zmanimWidgetData', () => {
  it('shows the next zman and this Shabbat', () => {
    const data = zmanimWidgetData(input());
    expect(data.nextTitle).toBe('סוף זמן תפילה');
    expect(data.nextTime).toMatch(/^\d\d:\d\d$/);
    expect(data.shabbatTitle).toBe('שבת לך־לך');
    expect(data.candles).toMatch(/^נרות \d\d:\d\d$/);
    expect(data.havdalah).toMatch(/^צאת \d\d:\d\d$/);
  });

  it('after candle lighting only havdalah is left', () => {
    const data = zmanimWidgetData(input({ now: fridaySunset }));
    expect(data.candles).toBeNull();
    expect(data.havdalah).toMatch(/^צאת /);
    expect(data.shabbatTitle).toBe('שבת לך־לך');
  });

  it('after tzeit the next zman is tomorrow morning', () => {
    const late = new Date('2026-10-23T19:00:00Z'); // 22:00
    expect(zmanimWidgetData(input({ now: late })).nextTitle).toBe('עלות השחר');
  });
});

describe('monthWidgetData', () => {
  it('builds whole weeks of Cheshvan with today and Shabbat marked', () => {
    const data = monthWidgetData(input());
    expect(data.title).toBe('חשוון תשפ״ז');
    expect(data.weeks.every((w) => w.length === 7)).toBe(true);
    const cells = data.weeks.flat();
    const today = cells.filter((c) => c.isToday);
    expect(today).toHaveLength(1);
    expect(today[0].label).toBe('יב');
    expect(data.weeks.every((w) => w[6].isShabbat)).toBe(true);
    // Days outside the month stay blank.
    expect(cells.filter((c) => !c.inMonth).every((c) => c.label === '')).toBe(true);
  });

  it('moves today to the next day at sunset', () => {
    const today = monthWidgetData(input({ now: fridaySunset })).weeks.flat().find((c) => c.isToday);
    expect(today?.label).toBe('יג');
  });
});
