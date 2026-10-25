import { refreshWidgets } from '@/widgets/refreshWidgets';
import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { Reminder } from '@/lib/reminders';
import { addReminder, deleteReminder, listReminders, updateReminder, type NewReminder } from './db';

type RemindersStore = {
  reminders: Reminder[];
  loaded: boolean;
  add: (r: NewReminder) => Promise<void>;
  update: (r: NewReminder & { id: number }) => Promise<void>;
  remove: (id: number) => Promise<void>;
};

const RemindersContext = createContext<RemindersStore | null>(null);

/** One shared list so the month, the day details and the reminders tab stay in sync. */
export function RemindersProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    setReminders(await listReminders(db));
    setLoaded(true);
  }, [db]);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = useCallback(
    async (r: NewReminder) => {
      await addReminder(db, r);
      await reload();
      refreshWidgets();
    },
    [db, reload],
  );

  const update = useCallback(
    async (r: NewReminder & { id: number }) => {
      await updateReminder(db, r);
      await reload();
      refreshWidgets();
    },
    [db, reload],
  );

  const remove = useCallback(
    async (id: number) => {
      await deleteReminder(db, id);
      await reload();
      refreshWidgets();
    },
    [db, reload],
  );

  return createElement(RemindersContext.Provider, { value: { reminders, loaded, add, update, remove } }, children);
}

export function useReminders(): RemindersStore {
  const store = useContext(RemindersContext);
  if (!store) throw new Error('useReminders must be used inside RemindersProvider');
  return store;
}
