import type { SQLiteDatabase } from 'expo-sqlite';
import { listReminders, migrateDbIfNeeded } from '../db';

/** Just enough of expo-sqlite to see what the migration runs. */
function fakeDb(version: number, rows: unknown[] = []) {
  const executed: string[] = [];
  const db = {
    getFirstAsync: async () => ({ user_version: version }),
    execAsync: async (sql: string) => {
      executed.push(sql);
    },
    getAllAsync: async () => rows,
  };
  return { db: db as unknown as SQLiteDatabase, executed };
}

describe('migrateDbIfNeeded', () => {
  it('v2 → v3 only adds columns (no table is dropped or rebuilt)', async () => {
    const { db, executed } = fakeDb(2);
    await migrateDbIfNeeded(db);
    const sql = executed.join('\n');
    expect(sql).toContain('ALTER TABLE events ADD COLUMN show_years');
    expect(sql).toContain('ALTER TABLE reminders ADD COLUMN alert_minutes');
    expect(sql).not.toMatch(/DROP|DELETE|CREATE TABLE/);
    expect(sql).toContain('PRAGMA user_version = 3');
  });

  it('a new install creates everything', async () => {
    const { db, executed } = fakeDb(0);
    await migrateDbIfNeeded(db);
    const sql = executed.join('\n');
    expect(sql).toContain('CREATE TABLE events');
    expect(sql).toContain('CREATE TABLE reminders');
    expect(sql).toContain('ADD COLUMN alert_minutes');
  });

  it('does nothing when up to date', async () => {
    const { db, executed } = fakeDb(3);
    await migrateDbIfNeeded(db);
    expect(executed).toEqual([]);
  });
});

describe('reading old reminder rows', () => {
  it("an old 'hour' row (no alert_minutes) is 60 minutes before", async () => {
    const row = { id: 1, title: 'x', h_day: 1, h_month: 8, h_year: 5787, time: '10:30', repeat: 'once', created_at: '' };
    const { db } = fakeDb(3, [
      { ...row, alert: 'hour', alert_minutes: null },
      { ...row, id: 2, alert: 'day', alert_minutes: null },
      { ...row, id: 3, alert: 'before', alert_minutes: 1 },
    ]);
    const list = await listReminders(db);
    expect(list.map((r) => r.alert)).toEqual([
      { kind: 'before', minutes: 60 },
      { kind: 'dayBefore' },
      { kind: 'before', minutes: 1 },
    ]);
  });
});
