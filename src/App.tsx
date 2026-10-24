import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ComingSoon } from '@/components/ComingSoon';
import { TabBar, type TabId } from '@/components/TabBar';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/data/db';
import { EventsProvider } from '@/data/useEvents';
import { AddEventScreen } from '@/screens/AddEventScreen';
import { CalendarScreen } from '@/screens/CalendarScreen';
import { EventsScreen } from '@/screens/EventsScreen';
import { usePalette } from '@/theme/tokens';

function Screen({ tab, onAddEvent }: { tab: TabId; onAddEvent: () => void }) {
  switch (tab) {
    case 'calendar':
      return <CalendarScreen onAddEvent={onAddEvent} />;
    case 'family':
      return <EventsScreen onAdd={onAddEvent} />;
    case 'reminders':
      return <ComingSoon title="תזכורות" note="בקרוב, בהמשך שלב 1" />;
    case 'settings':
      return <ComingSoon title="הגדרות" note="בקרוב, בהמשך שלב 1" />;
  }
}

export default function App() {
  const palette = usePalette();
  const scheme = useColorScheme();
  const [tab, setTab] = useState<TabId>('calendar');
  const [adding, setAdding] = useState(false);
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
        <EventsProvider>
          <View style={{ flex: 1, backgroundColor: palette.paper }}>
            <View style={{ flex: 1 }}>
              <Screen tab={tab} onAddEvent={() => setAdding(true)} />
            </View>
            <TabBar active={tab} onSelect={setTab} />
            {adding ? (
              <AddEventScreen
                onClose={() => {
                  setAdding(false);
                }}
              />
            ) : null}
          </View>
        </EventsProvider>
      </SQLiteProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaProvider>
  );
}
