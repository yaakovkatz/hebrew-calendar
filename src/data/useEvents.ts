import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { FamilyEvent } from '@/lib/events';
import { addEvent, deleteEvent, listEvents, updateEvent, type NewEvent } from './db';

type EventsStore = {
  events: FamilyEvent[];
  loaded: boolean;
  add: (ev: NewEvent) => Promise<void>;
  update: (ev: FamilyEvent) => Promise<void>;
  remove: (id: number) => Promise<void>;
};

const EventsContext = createContext<EventsStore | null>(null);

/** One shared list so the month footer and the events tab stay in sync. */
export function EventsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    setEvents(await listEvents(db));
    setLoaded(true);
  }, [db]);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = useCallback(
    async (ev: NewEvent) => {
      await addEvent(db, ev);
      await reload();
    },
    [db, reload],
  );

  const update = useCallback(
    async (ev: FamilyEvent) => {
      await updateEvent(db, ev);
      await reload();
    },
    [db, reload],
  );

  const remove = useCallback(
    async (id: number) => {
      await deleteEvent(db, id);
      await reload();
    },
    [db, reload],
  );

  return createElement(EventsContext.Provider, { value: { events, loaded, add, update, remove } }, children);
}

export function useEvents(): EventsStore {
  const store = useContext(EventsContext);
  if (!store) throw new Error('useEvents must be used inside EventsProvider');
  return store;
}
