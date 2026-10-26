import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { ZmanAlert } from '@/lib/zmanimAlerts';
import type { ZmanKey } from '@/lib/zmanimFull';
import { deleteZmanAlert, listZmanAlerts, setZmanAlert } from './db';

type Snapshot = { alerts: ZmanAlert[]; loaded: boolean };

type ZmanAlertsStore = Snapshot & {
  /** Adds the zman's daily alert, or changes its time (one per zman). */
  save: (zman: ZmanKey, minutesBefore: number) => Promise<void>;
  /** "בלי התראה". */
  remove: (zman: ZmanKey) => Promise<void>;
};

// One shared list for the Zmanim tab, the events list and the notification scheduler.
// A module store instead of a context provider, so it needs no wrapper in App.tsx;
// it still reads the one database from SQLiteProvider.
let snapshot: Snapshot = { alerts: [], loaded: false };
let loading = false;
const listeners = new Set<() => void>();

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => snapshot;

export function useZmanAlerts(): ZmanAlertsStore {
  const db = useSQLiteContext();
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const reload = useCallback(async () => {
    publish({ alerts: await listZmanAlerts(db), loaded: true });
  }, [db]);

  useEffect(() => {
    if (snapshot.loaded || loading) return;
    loading = true;
    reload()
      .catch(() => publish({ alerts: [], loaded: true }))
      .finally(() => {
        loading = false;
      });
  }, [reload]);

  const save = useCallback(
    async (zman: ZmanKey, minutesBefore: number) => {
      await setZmanAlert(db, zman, minutesBefore);
      await reload();
    },
    [db, reload],
  );

  const remove = useCallback(
    async (zman: ZmanKey) => {
      await deleteZmanAlert(db, zman);
      await reload();
    },
    [db, reload],
  );

  return { ...state, save, remove };
}
