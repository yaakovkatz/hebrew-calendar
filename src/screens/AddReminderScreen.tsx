import type { Reminder } from '@/lib/reminders';
import { AddItemScreen } from './AddItemScreen';

/** @deprecated Kept only while App.tsx imports it; use AddItemScreen. Delete after the App integration. */
export function AddReminderScreen({ onClose, initial }: { onClose: () => void; initial?: Reminder }) {
  return <AddItemScreen onClose={onClose} defaultKind="reminder" initial={initial ? { kind: 'reminder', reminder: initial } : undefined} />;
}
