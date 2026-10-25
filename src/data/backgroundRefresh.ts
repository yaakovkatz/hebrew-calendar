import * as BackgroundTask from 'expo-background-task';
import { openDatabaseAsync } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import * as TaskManager from 'expo-task-manager';
import { queueReschedule } from '@/lib/scheduler';
import { DATABASE_NAME, listEvents, listReminders, migrateDbIfNeeded } from './db';
import { cityFor, parseSettings, SETTINGS_KEY } from './settings';

/*
 * Daily refresh in the background: a backup only (PLAN.md: not reliable on Xiaomi and Samsung).
 * The real refresh is on every app open. Defined at module scope, as expo-task-manager requires,
 * so importing this file (via useNotificationScheduler) before the first render is enough.
 */

export const REFRESH_TASK = 'luach-refresh-notifications';

export async function refreshFromStorage(): Promise<void> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  await migrateDbIfNeeded(db);
  const [events, reminders, raw] = await Promise.all([listEvents(db), listReminders(db), Storage.getItem(SETTINGS_KEY)]);
  const settings = parseSettings(raw);
  await queueReschedule({ events, reminders, city: cityFor(settings.cityId), il: settings.il });
}

if (!TaskManager.isTaskDefined(REFRESH_TASK)) {
  TaskManager.defineTask(REFRESH_TASK, async () => {
    try {
      await refreshFromStorage();
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/** Asks the system for a daily run. Silent when background work isn't available. */
export async function registerBackgroundRefresh(): Promise<void> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (await TaskManager.isTaskRegisteredAsync(REFRESH_TASK)) return;
    await BackgroundTask.registerTaskAsync(REFRESH_TASK, { minimumInterval: 24 * 60 });
  } catch {
    // Best effort.
  }
}
