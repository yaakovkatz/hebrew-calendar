import type { SQLiteDatabase } from 'expo-sqlite';
import type { EventType, FamilyEvent, ReminderTime } from '@/lib/events';

export const DATABASE_NAME = 'luach.db';
const DATABASE_VERSION = 1;

/** Runs once when the app opens; each step upgrades one schema version (PLAN.md). */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      CREATE TABLE events (
        id INTEGER PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        h_day INTEGER NOT NULL,
        h_month INTEGER NOT NULL,
        h_year INTEGER NOT NULL,
        after_sunset INTEGER NOT NULL DEFAULT 0,
        greg_date TEXT,
        reminder TEXT NOT NULL DEFAULT 'evening',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    version = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

type EventRow = {
  id: number;
  type: string;
  title: string;
  h_day: number;
  h_month: number;
  h_year: number;
  after_sunset: number;
  greg_date: string | null;
  reminder: string;
};

function fromRow(row: EventRow): FamilyEvent {
  return {
    id: row.id,
    type: row.type as EventType,
    title: row.title,
    hDay: row.h_day,
    hMonth: row.h_month,
    hYear: row.h_year,
    afterSunset: row.after_sunset === 1,
    gregDate: row.greg_date,
    reminder: row.reminder as ReminderTime,
  };
}

export async function listEvents(db: SQLiteDatabase): Promise<FamilyEvent[]> {
  const rows = await db.getAllAsync<EventRow>('SELECT * FROM events');
  return rows.map(fromRow);
}

export type NewEvent = Omit<FamilyEvent, 'id'>;

export async function addEvent(db: SQLiteDatabase, ev: NewEvent): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO events (type, title, h_day, h_month, h_year, after_sunset, greg_date, reminder)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [ev.type, ev.title, ev.hDay, ev.hMonth, ev.hYear, ev.afterSunset ? 1 : 0, ev.gregDate, ev.reminder],
  );
  return result.lastInsertRowId;
}

export async function deleteEvent(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM events WHERE id = ?', [id]);
}
