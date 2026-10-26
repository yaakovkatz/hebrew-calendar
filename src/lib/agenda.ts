import type { HDate } from '@hebcal/core';
import { headline, shortHebrewDate, upcoming, whenLabel, yearsLabel, type FamilyEvent } from './events';
import { WEEKDAYS } from './month';
import { hebrewDateWithB, PAST_LABEL, sortedReminders, type Reminder } from './reminders';

/** One row of the merged "אירועים" list (PLAN.md fix round 1, item 1): the two tables stay apart, only the view is one. */
export type AgendaItem = {
  kind: 'event' | 'reminder';
  id: number;
  title: string;
  date: HDate;
  daysUntil: number;
  /** 'HH:MM' for a timed reminder. */
  time: string | null;
  /** 'יום הולדת 64', 'שנה 3' for events. */
  years: string | null;
  /** A one-time reminder whose date has passed. */
  past: boolean;
};

/** Events and reminders by next date, then time (all day first), then title. Past reminders at the end, newest first. */
export function agenda(events: FamilyEvent[], reminders: Reminder[], today: HDate): AgendaItem[] {
  const items: AgendaItem[] = [
    ...upcoming(events, today).map((u) => ({
      kind: 'event' as const,
      id: u.event.id,
      title: headline(u.event),
      date: u.date,
      daysUntil: u.daysUntil,
      time: null,
      years: yearsLabel(u),
      past: false,
    })),
    ...sortedReminders(reminders, today).map((r) => ({
      kind: 'reminder' as const,
      id: r.reminder.id,
      title: r.reminder.title,
      date: r.date,
      daysUntil: r.daysUntil,
      time: r.reminder.time,
      years: null,
      past: r.past,
    })),
  ];
  return items.sort((a, b) => {
    if (a.past !== b.past) return a.past ? 1 : -1;
    const byDay = a.past ? b.daysUntil - a.daysUntil : a.daysUntil - b.daysUntil;
    return byDay || (a.time ?? '').localeCompare(b.time ?? '') || a.title.localeCompare(b.title, 'he');
  });
}

/** The orange line under "הבא בתור": 'מחר · 10:30', 'בעוד 10 ימים'. */
export function agendaWhen(item: AgendaItem): string {
  if (item.past) return PAST_LABEL;
  return [whenLabel(item.daysUntil), item.time].filter(Boolean).join(' · ');
}

/** The grey line under "הבא בתור": 'ט״ז בחשוון · יום שלישי', plus years for an event. */
export function agendaDateLine(item: AgendaItem): string {
  return [hebrewDateWithB(item.date), `יום ${WEEKDAYS[item.date.getDay()]}`, item.years].filter(Boolean).join(' · ');
}

/** A list row's end: 'כ״ה חשוון', 'ג׳ כסלו · 19:00', 'עבר · א׳ חשוון'. */
export function agendaRowDate(item: AgendaItem): string {
  return [item.past ? PAST_LABEL : null, shortHebrewDate(item.date), item.time].filter(Boolean).join(' · ');
}

/** The small grey countdown under a row's date; nothing for a past reminder (its date line says "עבר"). */
export function agendaRowWhen(item: AgendaItem): string | null {
  return item.past ? null : whenLabel(item.daysUntil);
}
