import notifee, { AlarmType, AndroidImportance, TriggerType } from 'react-native-notify-kit';
import { Platform } from 'react-native';
import type { City } from './cities';
import { planCountdowns, type CountdownWindow } from './notificationPlan';

/*
 * Candle-lighting countdown (PLAN.md "ספירה לאחור"): an ongoing notification with a native
 * chronometer counting down, from three hours before candle lighting until it.
 *
 * How: the windows come from planCountdowns (pure, tested). Each future window is a
 * notify-kit trigger notification at its start (AlarmManager, exact while idle). A window
 * that is already running is shown right away. `timeoutAfter` removes it at candle lighting,
 * so nothing is left on screen once Shabbat or Yom Tov begins.
 *
 * Limits:
 * - Only the first lighting of each Shabbat or Yom Tov. A second-day or motzei-Shabbat
 *   lighting is inside Shabbat or Yom Tov, when we show nothing.
 * - Windows are planned about a week ahead, refreshed on every app open and by the
 *   daily background task. If neither runs for over a week, the countdown is missed.
 * - Android only. The chronometer is drawn by the system; its look varies by phone.
 * - Battery savers (Xiaomi, Samsung) may delay the trigger; see BatteryHelpScreen.
 */

export const COUNTDOWN_CHANNEL = 'countdown';
const MAX_COUNTDOWNS = 4;

async function ensureChannel(): Promise<void> {
  await notifee.createChannel({
    id: COUNTDOWN_CHANNEL,
    name: 'ספירה לאחור להדלקת נרות',
    // Low: shows in the shade without sound or a pop-up.
    importance: AndroidImportance.LOW,
  });
}

function content(w: CountdownWindow, now: Date) {
  return {
    id: w.id,
    title: w.title,
    body: w.body,
    android: {
      channelId: COUNTDOWN_CHANNEL,
      ongoing: true,
      autoCancel: false,
      onlyAlertOnce: true,
      showChronometer: true,
      chronometerDirection: 'down' as const,
      timestamp: w.end.getTime(),
      // Counted from when it is shown; ends it at candle lighting.
      timeoutAfter: Math.max(1000, w.end.getTime() - Math.max(now.getTime(), w.start.getTime())),
      pressAction: { id: 'default' },
    },
  };
}

/** Removes pending countdown triggers. A countdown on screen ends by itself at candle lighting. */
export async function clearCountdowns(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const ids = (await notifee.getTriggerNotificationIds()).filter((id) => id.startsWith('countdown-'));
    if (ids.length) await notifee.cancelTriggerNotifications(ids);
  } catch {
    // Best effort.
  }
}

/** Replaces the countdown triggers with the coming windows. Never throws. */
export async function syncCountdowns({ now, city, il }: { now: Date; city: City; il: boolean }): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await clearCountdowns();
    await ensureChannel();
    const windows = planCountdowns({ now, city, il }).slice(0, MAX_COUNTDOWNS);
    for (const w of windows) {
      try {
        if (w.start.getTime() <= now.getTime()) {
          await notifee.displayNotification(content(w, now));
        } else {
          await notifee.createTriggerNotification(content(w, now), {
            type: TriggerType.TIMESTAMP,
            timestamp: w.start.getTime(),
            alarmManager: { type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE },
          });
        }
      } catch {
        // One failed window must not stop the rest.
      }
    }
  } catch {
    // Best effort.
  }
}
