import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { queueReschedule } from '@/lib/scheduler';
import { registerBackgroundRefresh } from './backgroundRefresh';
import { useEvents } from './useEvents';
import { useReminders } from './useReminders';
import { useSettings } from './useSettings';
import { useZmanAlerts } from './useZmanAlerts';

/**
 * Keeps the OS schedule in step with the data (PLAN.md "התראות"): on app open, when the app
 * comes back to the foreground, and whenever events, reminders, daily zman alerts, city, il or
 * the notification answer change. Also registers the daily background refresh (a backup only).
 * Call once, inside the providers.
 */
export function useNotificationScheduler(): void {
  const { events, loaded: eventsLoaded } = useEvents();
  const { reminders, loaded: remindersLoaded } = useReminders();
  const { alerts: zmanAlerts, loaded: zmanAlertsLoaded } = useZmanAlerts();
  const { city, il, notifyAsked } = useSettings();
  const latest = useRef({ events, reminders, zmanAlerts, city, il });
  latest.current = { events, reminders, zmanAlerts, city, il };
  const ready = eventsLoaded && remindersLoaded && zmanAlertsLoaded;

  useEffect(() => {
    // Waiting for all the lists avoids briefly cancelling everything on launch.
    if (ready) queueReschedule(latest.current);
  }, [ready, events, reminders, zmanAlerts, city, il, notifyAsked]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && ready) queueReschedule(latest.current);
    });
    return () => sub.remove();
  }, [ready]);

  useEffect(() => {
    registerBackgroundRefresh();
  }, []);
}
