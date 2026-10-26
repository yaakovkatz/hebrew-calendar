import type { City } from './cities';
import type { FamilyEvent } from './events';
import { MAX_SCHEDULED, planNotifications, type PlannedNotification } from './notificationPlan';
import type { Reminder } from './reminders';
import { planZmanAlerts, type ZmanAlert } from './zmanimAlerts';

// The whole schedule: events, reminders and Shabbat (notificationPlan.ts) plus the daily zman
// alerts (zmanimAlerts.ts), soonest first and capped together, since Android limits alarms per app.

export type AllInput = {
  now: Date;
  events: FamilyEvent[];
  reminders: Reminder[];
  zmanAlerts: ZmanAlert[];
  city: City;
  il: boolean;
};

export function planAll({ now, events, reminders, zmanAlerts, city, il }: AllInput): PlannedNotification[] {
  return [...planNotifications({ now, events, reminders, city, il }), ...planZmanAlerts({ now, alerts: zmanAlerts, city, il })]
    .sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id))
    .slice(0, MAX_SCHEDULED);
}
