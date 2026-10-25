import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ComingSoon } from '@/components/ComingSoon';
import { TabBar, type TabId } from '@/components/TabBar';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/data/db';
import { EventsProvider, useEvents } from '@/data/useEvents';
import { SettingsProvider, useSettings } from '@/data/useSettings';
import { AboutScreen } from '@/screens/AboutScreen';
import { AddEventScreen } from '@/screens/AddEventScreen';
import { CalendarScreen } from '@/screens/CalendarScreen';
import { ContactScreen } from '@/screens/ContactScreen';
import { EventDetailsScreen } from '@/screens/EventDetailsScreen';
import { EventsScreen } from '@/screens/EventsScreen';
import { LicensesScreen } from '@/screens/LicensesScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { usePalette } from '@/theme/tokens';

type ScreenProps = {
  tab: TabId;
  onAddEvent: () => void;
  onOpenEvent: (id: number) => void;
  onOpenAbout: () => void;
};

function Screen({ tab, onAddEvent, onOpenEvent, onOpenAbout }: ScreenProps) {
  switch (tab) {
    case 'calendar':
      return <CalendarScreen onAddEvent={onAddEvent} onOpenEvent={onOpenEvent} />;
    case 'family':
      return <EventsScreen onAdd={onAddEvent} onOpen={onOpenEvent} />;
    case 'reminders':
      return <ComingSoon title="תזכורות" note="בקרוב, בהמשך שלב 1" />;
    case 'settings':
      return <SettingsScreen onOpenAbout={onOpenAbout} />;
  }
}

type Overlay = null | 'about' | 'licenses' | 'contact';

// App state lives below SQLiteProvider: its memo ignores `children`, so state held
// above it would never reach the screens.
function Main() {
  const palette = usePalette();
  const scheme = useColorScheme();
  const { events } = useEvents();
  const { onboarded } = useSettings();
  const [tab, setTab] = useState<TabId>('calendar');
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const editingEvent = editing ? events.find((e) => e.id === openId) : undefined;
  const statusBar = <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;

  if (!onboarded) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.paper }}>
        <OnboardingScreen onDone={() => setTab('calendar')} />
        {statusBar}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.paper }}>
      <View style={{ flex: 1 }}>
        <Screen
          tab={tab}
          onAddEvent={() => setAdding(true)}
          onOpenEvent={setOpenId}
          onOpenAbout={() => setOverlay('about')}
        />
      </View>
      <TabBar active={tab} onSelect={setTab} />
      {openId !== null ? (
        <EventDetailsScreen eventId={openId} onBack={() => setOpenId(null)} onEdit={() => setEditing(true)} />
      ) : null}
      {adding ? <AddEventScreen onClose={() => setAdding(false)} /> : null}
      {editingEvent ? <AddEventScreen initial={editingEvent} onClose={() => setEditing(false)} /> : null}
      {/* Licenses and contact sit on top of About, so "back" returns to it. */}
      {overlay ? (
        <AboutScreen
          onBack={() => setOverlay(null)}
          onOpenLicenses={() => setOverlay('licenses')}
          onOpenContact={() => setOverlay('contact')}
        />
      ) : null}
      {overlay === 'licenses' ? <LicensesScreen onBack={() => setOverlay('about')} /> : null}
      {overlay === 'contact' ? <ContactScreen onBack={() => setOverlay('about')} /> : null}
      {statusBar}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
        <SettingsProvider>
          <EventsProvider>
            <Main />
          </EventsProvider>
        </SettingsProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
