import { createContext, createElement, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import Storage from 'expo-sqlite/kv-store';
import type { City } from '@/lib/cities';
import { cityFor, DEFAULT_SETTINGS, parseSettings, serializeSettings, SETTINGS_KEY, type OpenOn, type Settings } from './settings';

type SettingsStore = Settings & {
  /** The city for `cityId` (Jerusalem when the id is unknown). */
  city: City;
  setCityId: (id: string) => void;
  setIl: (il: boolean) => void;
  setShowEventsInCalendar: (show: boolean) => void;
  setOpenOn: (openOn: OpenOn) => void;
  /** Marks the first-run onboarding as done. */
  completeOnboarding: () => void;
  /** Marks "להזכיר לך?" as shown, whatever the answer. */
  markNotifyAsked: () => void;
};

const SettingsContext = createContext<SettingsStore | null>(null);

// Read synchronously so the first frame already knows the city and whether to show
// onboarding (no flash of the wrong screen). A broken store falls back to defaults.
function loadSettings(): Settings {
  try {
    return parseSettings(Storage.getItemSync(SETTINGS_KEY));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Settings live in expo-sqlite/kv-store as one JSON value; no DB migration needed. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const current = useRef(settings);

  const patch = useCallback((change: Partial<Settings>) => {
    const next = { ...current.current, ...change };
    current.current = next;
    setSettings(next);
    // Saving is best effort: the change already applies for this session.
    Storage.setItem(SETTINGS_KEY, serializeSettings(next)).catch(() => {});
  }, []);

  const value = useMemo<SettingsStore>(
    () => ({
      ...settings,
      city: cityFor(settings.cityId),
      setCityId: (cityId) => patch({ cityId }),
      setIl: (il) => patch({ il }),
      setShowEventsInCalendar: (showEventsInCalendar) => patch({ showEventsInCalendar }),
      setOpenOn: (openOn) => patch({ openOn }),
      completeOnboarding: () => patch({ onboarded: true }),
      markNotifyAsked: () => patch({ notifyAsked: true }),
    }),
    [settings, patch],
  );

  return createElement(SettingsContext.Provider, { value }, children);
}

export function useSettings(): SettingsStore {
  const store = useContext(SettingsContext);
  if (!store) throw new Error('useSettings must be used inside SettingsProvider');
  return store;
}
