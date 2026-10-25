import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { City } from './cities';
import { clearCountdowns, syncCountdowns } from './countdown';
import type { FamilyEvent } from './events';
import { planNotifications } from './notificationPlan';
import type { Reminder } from './reminders';

// Side effects only; what to schedule is decided in notificationPlan.ts (pure, tested).

export const REMINDERS_CHANNEL = 'reminders';

export type ScheduleInput = {
  events: FamilyEvent[];
  reminders: Reminder[];
  city: City;
  il: boolean;
  now?: Date;
};

// Show our notifications while the app is open too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL, {
    name: 'תזכורות',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export async function notificationsAllowed(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Asks the OS once; returns whether notifications are allowed now. */
export async function requestNotifications(): Promise<boolean> {
  try {
    await ensureChannel(); // Android 13+ shows the dialog only once a channel exists
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/**
 * Cancels everything and schedules the plan again (about a month ahead, PLAN.md).
 * Date triggers with 'bestEffort' delivery use setExactAndAllowWhileIdle: exact while the app
 * holds USE_EXACT_ALARM, and "about on time" if the permission is missing. 'alarmClock' is
 * not used: it would keep an alarm icon in the status bar all month.
 * Never throws: a failure only means fewer notifications until the next run.
 */
export async function rescheduleAll({ events, reminders, city, il, now = new Date() }: ScheduleInput): Promise<number> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!(await notificationsAllowed())) {
      await clearCountdowns();
      return 0;
    }
    await ensureChannel();
    const plan = planNotifications({ now, events, reminders, city, il });
    let count = 0;
    for (const n of plan) {
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: n.id,
          content: { title: n.title, body: n.body, data: { kind: n.kind } },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: n.at,
            channelId: REMINDERS_CHANNEL,
            delivery: 'bestEffort',
          },
        });
        count++;
      } catch {
        // One bad item must not stop the rest.
      }
    }
    await syncCountdowns({ now, city, il });
    return count;
  } catch {
    return 0;
  }
}

let running: Promise<unknown> = Promise.resolve();

/** Runs one reschedule at a time, so quick changes don't interleave cancel and schedule. */
export function queueReschedule(input: ScheduleInput): Promise<number> {
  const next = running.then(() => rescheduleAll(input));
  running = next.catch(() => {});
  return next;
}
