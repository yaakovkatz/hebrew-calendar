import type { SQLiteDatabase } from 'expo-sqlite';
import { deleteZmanAlert, listReminders, listZmanAlerts, migrateDbIfNeeded, setZmanAlert } from '../db';

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
  it('v2 → v4 only adds columns and a new table (nothing is dropped or rebuilt)', async () => {
    const { db, executed } = fakeDb(2);
    await migrateDbIfNeeded(db);
    const sql = executed.join('\n');
    expect(sql).toContain('ALTER TABLE events ADD COLUMN show_years');
    expect(sql).toContain('ALTER TABLE reminders ADD COLUMN alert_minutes');
    expect(sql).not.toMatch(/DROP|DELETE|CREATE TABLE (events|reminders)/);
    expect(sql).toContain('CREATE TABLE zman_alerts');
    expect(sql).toContain('PRAGMA user_version = 4');
  });

  it('v3 → v4 only adds the zman_alerts table', async () => {
    const { db, executed } = fakeDb(3);
    await migrateDbIfNeeded(db);
    const sql = executed.join('\n');
    expect(sql).toContain('CREATE TABLE zman_alerts');
    expect(sql).toMatch(/zman TEXT NOT NULL UNIQUE/);
    expect(sql).not.toMatch(/DROP|DELETE|ALTER/);
    expect(sql).toContain('PRAGMA user_version = 4');
  });

  it('a new install creates everything', async () => {
    const { db, executed } = fakeDb(0);
    await migrateDbIfNeeded(db);
    const sql = executed.join('\n');
    expect(sql).toContain('CREATE TABLE events');
    expect(sql).toContain('CREATE TABLE reminders');
    expect(sql).toContain('ADD COLUMN alert_minutes');
    expect(sql).toContain('CREATE TABLE zman_alerts');
  });

  it('does nothing when up to date', async () => {
    const { db, executed } = fakeDb(4);
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

describe('zman alerts', () => {
  it('reads rows and leaves out an unknown zman', async () => {
    const { db } = fakeDb(4, [
      { id: 1, zman: 'sunset', minutes_before: 15 },
      { id: 2, zman: 'gone', minutes_before: 5 },
    ]);
    expect(await listZmanAlerts(db)).toEqual([{ id: 1, zman: 'sunset', minutesBefore: 15 }]);
  });

  it('one per zman: saving again updates the time; removing is by zman', async () => {
    const runs: { sql: string; params: unknown[] }[] = [];
    const db = { runAsync: async (sql: string, params: unknown[]) => runs.push({ sql, params }) } as unknown as SQLiteDatabase;
    await setZmanAlert(db, 'sunset', 30);
    await deleteZmanAlert(db, 'sunset');
    expect(runs[0].sql).toMatch(/ON CONFLICT\(zman\) DO UPDATE SET minutes_before/);
    expect(runs[0].params).toEqual(['sunset', 30]);
    expect(runs[1].params).toEqual(['sunset']);
  });
});
