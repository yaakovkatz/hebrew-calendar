import { HDate, months } from '@hebcal/core';
import { agenda, agendaDateLine, agendaRowDate, agendaRowWhen, agendaWhen } from '../agenda';
import type { FamilyEvent } from '../events';
import { before, type Reminder } from '../reminders';

const today = new HDate(15, months.CHESHVAN, 5787); // Monday 26 Oct 2026

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

function rem(partial: Partial<Reminder>): Reminder {
  return {
    id: 1,
    title: 'רופא שיניים',
    hDay: 16,
    hMonth: months.CHESHVAN,
    hYear: 5787,
    time: '10:30',
    repeat: 'once',
    alert: before(15),
    createdAt: '2026-10-23 10:00:00',
    ...partial,
  };
}

describe('agenda', () => {
  const list = agenda(
    [ev({}), ev({ id: 2, type: 'anniversary', title: 'ההורים', hDay: 18, hMonth: months.TEVET, hYear: 5749 })],
    [
      rem({}),
      rem({ id: 2, title: 'אסיפת הורים', hDay: 3, hMonth: months.KISLEV, time: '19:00' }),
      rem({ id: 3, title: 'עבר', hDay: 1 }),
    ],
    today,
  );

  it('merges events and reminders by date; past reminders at the end', () => {
    expect(list.map((i) => `${i.kind}:${i.title}`)).toEqual([
      'reminder:רופא שיניים',
      'event:יום ההולדת של אמא',
      'reminder:אסיפת הורים',
      'event:יום הנישואין של ההורים',
      'reminder:עבר',
    ]);
  });

  it('"הבא בתור" lines, as in the approved mockup', () => {
    const [next] = list;
    expect(agendaWhen(next)).toBe('מחר · 10:30');
    expect(agendaDateLine(next)).toBe('ט״ז בחשוון · יום שלישי');
    expect(agendaWhen(list[1])).toBe('בעוד 10 ימים');
    expect(agendaDateLine(list[1])).toContain('יום הולדת 64');
  });

  it('rows: date, with the time for a reminder', () => {
    expect(agendaRowDate(list[1])).toBe('כ״ה חשוון');
    expect(agendaRowDate(list[2])).toBe('ג׳ כסלו · 19:00');
    expect(agendaRowWhen(list[2])).toBe('בעוד 18 ימים');
    expect(agendaRowDate(list[4])).toBe('עבר · א׳ חשוון · 10:30');
    expect(agendaRowWhen(list[4])).toBeNull();
  });

  it('on the same day: all day and events first, then by time', () => {
    const same = agenda([ev({ hDay: 16 })], [rem({ time: '08:00', title: 'א' }), rem({ id: 2, time: null, title: 'ב' })], today);
    expect(same.map((i) => i.title)).toEqual(['ב', 'יום ההולדת של אמא', 'א']);
  });
});

describe('agenda with the clock: past is the moment, not the day', () => {
  const TZ = 'Asia/Jerusalem';
  // Monday 26 Oct 2026 (15 Cheshvan) at 14:00 in Jerusalem.
  const clock = { now: new Date('2026-10-26T12:00:00Z'), tzid: TZ };
  const todayRem = rem({ hDay: 15, time: '10:30', title: 'בבוקר' });

  it('a one-time reminder earlier today is past, never "הבא בתור"', () => {
    const list = agenda([ev({})], [todayRem], today, clock);
    expect(list.map((i) => i.title)).toEqual(['יום ההולדת של אמא', 'בבוקר']);
    expect(list[1].past).toBe(true);
    expect(agendaRowDate(list[1])).toBe('עבר · ט״ו חשוון · 10:30');
  });

  it('later today, at this very minute, and all day stay upcoming', () => {
    const list = agenda(
      [],
      [rem({ hDay: 15, time: '18:00', title: 'בערב' }), rem({ id: 2, hDay: 15, time: '14:00', title: 'עכשיו' }), rem({ id: 3, hDay: 15, time: null, title: 'כל היום' })],
      today,
      clock,
    );
    expect(list.every((i) => !i.past)).toBe(true);
  });

  it('without the clock, by day only (as before)', () => {
    expect(agenda([], [todayRem], today)[0].past).toBe(false);
  });

  it('a yearly reminder earlier today moves on to next year', () => {
    const [item] = agenda([], [rem({ hDay: 15, time: '10:30', repeat: 'yearly' })], today, clock);
    expect(item.past).toBe(false);
    expect(item.date.getFullYear()).toBe(5788);
  });
});
