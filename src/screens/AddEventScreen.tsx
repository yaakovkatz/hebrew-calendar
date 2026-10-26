import type { FamilyEvent } from '@/lib/events';
import { AddItemScreen } from './AddItemScreen';

/** @deprecated Kept only while App.tsx imports it; use AddItemScreen. Delete after the App integration. */
export function AddEventScreen({ onClose, initial }: { onClose: () => void; initial?: FamilyEvent }) {
  return <AddItemScreen onClose={onClose} defaultKind="event" initial={initial ? { kind: 'event', event: initial } : undefined} />;
}
