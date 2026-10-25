// Widgets run in a headless JS task: no React context. Read the same stores the app writes.
import { openDatabaseAsync } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import { DATABASE_NAME, listEvents, listReminders } from '@/data/db';
import { cityFor, parseSettings, SETTINGS_KEY } from '@/data/settings';
import type { FamilyEvent } from '@/lib/events';
import type { Reminder } from '@/lib/reminders';
import type { WidgetInput } from './widgetData';

type Rows = { events: FamilyEvent[]; reminders: Reminder[] };

async function loadRows(): Promise<Rows> {
  // A separate connection, so closing it never touches the app's SQLiteProvider connection.
  const db = await openDatabaseAsync(DATABASE_NAME, { useNewConnection: true });
  try {
    // Before the app's first launch the tables don't exist yet; each list fails alone.
    const [events, reminders] = await Promise.all([
      listEvents(db).catch(() => [] as FamilyEvent[]),
      listReminders(db).catch(() => [] as Reminder[]),
    ]);
    return { events, reminders };
  } finally {
    await db.closeAsync().catch(() => {});
  }
}

export async function loadWidgetInput(now: Date = new Date()): Promise<WidgetInput> {
  let raw: string | null = null;
  try {
    raw = await Storage.getItem(SETTINGS_KEY);
  } catch {
    // parseSettings falls back to defaults.
  }
  const settings = parseSettings(raw);
  let rows: Rows = { events: [], reminders: [] };
  try {
    rows = await loadRows();
  } catch {
    // Show the empty state rather than no widget.
  }
  return { now, city: cityFor(settings.cityId), il: settings.il, ...rows };
}
