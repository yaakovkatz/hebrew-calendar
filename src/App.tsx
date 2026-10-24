import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ComingSoon } from '@/components/ComingSoon';
import { TabBar, type TabId } from '@/components/TabBar';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/data/db';
import { EventsProvider, useEvents } from '@/data/useEvents';
import { AddEventScreen } from '@/screens/AddEventScreen';
import { CalendarScreen } from '@/screens/CalendarScreen';
import { EventDetailsScreen } from '@/screens/EventDetailsScreen';
import { EventsScreen } from '@/screens/EventsScreen';
import { usePalette } from '@/theme/tokens';

type ScreenProps = { tab: TabId; onAddEvent: () => void; onOpenEvent: (id: number) => void };

function Screen({ tab, onAddEvent, onOpenEvent }: ScreenProps) {
  switch (tab) {
    case 'calendar':
      return <CalendarScreen onAddEvent={onAddEvent} onOpenEvent={onOpenEvent} />;
    case 'family':
      return <EventsScreen onAdd={onAddEvent} onOpen={onOpenEvent} />;
    case 'reminders':
      return <ComingSoon title="תזכורות" note="בקרוב, בהמשך שלב 1" />;
    case 'settings':
      return <ComingSoon title="הגדרות" note="בקרוב, בהמשך שלב 1" />;
  }
}

// App state lives below SQLiteProvider: its memo ignores `children`, so state held
// above it would never reach the screens.
function Main() {
  const palette = usePalette();
  const scheme = useColorScheme();
  const { events } = useEvents();
  const [tab, setTab] = useState<TabId>('calendar');
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const editingEvent = editing ? events.find((e) => e.id === openId) : undefined;
  return (
    <View style={{ flex: 1, backgroundColor: palette.paper }}>
      <View style={{ flex: 1 }}>
        <Screen tab={tab} onAddEvent={() => setAdding(true)} onOpenEvent={setOpenId} />
      </View>
      <TabBar active={tab} onSelect={setTab} />
      {openId !== null ? (
        <EventDetailsScreen eventId={openId} onBack={() => setOpenId(null)} onEdit={() => setEditing(true)} />
      ) : null}
      {adding ? <AddEventScreen onClose={() => setAdding(false)} /> : null}
      {editingEvent ? <AddEventScreen initial={editingEvent} onClose={() => setEditing(false)} /> : null}
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
        <EventsProvider>
          <Main />
        </EventsProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
