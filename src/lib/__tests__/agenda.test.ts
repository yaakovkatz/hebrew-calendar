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
