import type { SQLiteDatabase } from 'expo-sqlite';
import type { EventType, FamilyEvent, ReminderTime } from '@/lib/events';
import { alertFromStored, alertToStored, type Reminder, type RepeatKind } from '@/lib/reminders';

export const DATABASE_NAME = 'luach.db';
const DATABASE_VERSION = 3;

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

  if (version === 1) {
    await db.execAsync(`
      CREATE TABLE reminders (
        id INTEGER PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        h_day INTEGER NOT NULL,
        h_month INTEGER NOT NULL,
        h_year INTEGER NOT NULL,
        time TEXT,
        repeat TEXT NOT NULL DEFAULT 'once',
        alert TEXT NOT NULL DEFAULT 'hour',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    version = 2;
  }

  if (version === 2) {
    // Fix round 1: 'אחר' can show years; a reminder alert is minutes before its time.
    // Only new columns, so every saved row stays. Old 'hour' alerts are still read as 60 minutes.
    await db.execAsync(`
      ALTER TABLE events ADD COLUMN show_years INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE reminders ADD COLUMN alert_minutes INTEGER;
    `);
    version = 3;
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
  show_years: number | null;
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
    showYears: row.show_years === 1,
  };
}

export async function listEvents(db: SQLiteDatabase): Promise<FamilyEvent[]> {
  const rows = await db.getAllAsync<EventRow>('SELECT * FROM events');
  return rows.map(fromRow);
}

export type NewEvent = Omit<FamilyEvent, 'id'>;

export async function addEvent(db: SQLiteDatabase, ev: NewEvent): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO events (type, title, h_day, h_month, h_year, after_sunset, greg_date, reminder, show_years)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ev.type, ev.title, ev.hDay, ev.hMonth, ev.hYear, ev.afterSunset ? 1 : 0, ev.gregDate, ev.reminder, ev.showYears ? 1 : 0],
  );
  return result.lastInsertRowId;
}

export async function updateEvent(db: SQLiteDatabase, ev: FamilyEvent): Promise<void> {
  await db.runAsync(
    `UPDATE events SET type = ?, title = ?, h_day = ?, h_month = ?, h_year = ?, after_sunset = ?, greg_date = ?, reminder = ?, show_years = ?
     WHERE id = ?`,
    [ev.type, ev.title, ev.hDay, ev.hMonth, ev.hYear, ev.afterSunset ? 1 : 0, ev.gregDate, ev.reminder, ev.showYears ? 1 : 0, ev.id],
  );
}

export async function deleteEvent(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM events WHERE id = ?', [id]);
}

type ReminderRow = {
  id: number;
  title: string;
  h_day: number;
  h_month: number;
  h_year: number;
  time: string | null;
  repeat: string;
  alert: string;
  alert_minutes: number | null;
  created_at: string;
};

function reminderFromRow(row: ReminderRow): Reminder {
  return {
    id: row.id,
    title: row.title,
    hDay: row.h_day,
    hMonth: row.h_month,
    hYear: row.h_year,
    time: row.time,
    repeat: row.repeat as RepeatKind,
    alert: alertFromStored(row.alert, row.alert_minutes ?? null),
    createdAt: row.created_at,
  };
}

export async function listReminders(db: SQLiteDatabase): Promise<Reminder[]> {
  const rows = await db.getAllAsync<ReminderRow>('SELECT * FROM reminders');
  return rows.map(reminderFromRow);
}

export type NewReminder = Omit<Reminder, 'id' | 'createdAt'>;

export async function addReminder(db: SQLiteDatabase, r: NewReminder): Promise<number> {
  const stored = alertToStored(r.alert);
  const result = await db.runAsync(
    `INSERT INTO reminders (title, h_day, h_month, h_year, time, repeat, alert, alert_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [r.title, r.hDay, r.hMonth, r.hYear, r.time, r.repeat, stored.alert, stored.minutes],
  );
  return result.lastInsertRowId;
}

export async function updateReminder(db: SQLiteDatabase, r: NewReminder & { id: number }): Promise<void> {
  const stored = alertToStored(r.alert);
  await db.runAsync(
    `UPDATE reminders SET title = ?, h_day = ?, h_month = ?, h_year = ?, time = ?, repeat = ?, alert = ?, alert_minutes = ?
     WHERE id = ?`,
    [r.title, r.hDay, r.hMonth, r.hYear, r.time, r.repeat, stored.alert, stored.minutes, r.id],
  );
}

export async function deleteReminder(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM reminders WHERE id = ?', [id]);
}
