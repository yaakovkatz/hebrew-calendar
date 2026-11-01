import type { HDate } from '@hebcal/core';
import { headline, nextOccurrence, type FamilyEvent } from './events';
import { nextReminderDate, type Reminder } from './reminders';

/** The colour family of a name in the month grid. */
export type DayItemKind = 'family' | 'memorial' | 'reminder';

export type DayItem = { title: string; kind: DayItemKind; time: string | null };

/**
 * What each day in [start, end] holds, for the names inside the month grid (PLAN: option ג+).
 * Family dates come first, then reminders by time; the grid shows the first and "+N".
 */
export function dayItemsInRange(events: FamilyEvent[], reminders: Reminder[], start: HDate, end: HDate): Map<number, DayItem[]> {
  const days = new Map<number, DayItem[]>();
  const add = (abs: number, item: DayItem) => days.set(abs, [...(days.get(abs) ?? []), item]);

  for (const event of events) {
    const occ = nextOccurrence(event, start);
    if (occ.abs() > end.abs()) continue;
    add(occ.abs(), { title: headline(event), kind: event.type === 'yahrzeit' ? 'memorial' : 'family', time: null });
  }
  const timed = [...reminders].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '') || a.title.localeCompare(b.title, 'he'));
  for (const rem of timed) {
    const occ = nextReminderDate(rem, start);
    if (!occ || occ.abs() > end.abs()) continue;
    add(occ.abs(), { title: rem.title, kind: 'reminder', time: rem.time });
  }
  return days;
}
