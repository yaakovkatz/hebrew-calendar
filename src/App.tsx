import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TabBar, type TabId } from '@/components/TabBar';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/data/db';
import { EventsProvider, useEvents } from '@/data/useEvents';
import { RemindersProvider, useReminders } from '@/data/useReminders';
import { SettingsProvider, useSettings } from '@/data/useSettings';
import { AboutScreen } from '@/screens/AboutScreen';
import { AddItemScreen } from '@/screens/AddItemScreen';
import { CalendarScreen } from '@/screens/CalendarScreen';
import { ContactScreen } from '@/screens/ContactScreen';
import { EventDetailsScreen } from '@/screens/EventDetailsScreen';
import { EventsListScreen } from '@/screens/EventsListScreen';
import { LicensesScreen } from '@/screens/LicensesScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { ReminderDetailsScreen } from '@/screens/ReminderDetailsScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { BatteryHelpScreen } from '@/screens/BatteryHelpScreen';
import { PrintScreen } from '@/screens/PrintScreen';
import { ZmanimScreen } from '@/screens/ZmanimScreen';
import { NotifyPrompt, useNotifyPrompt } from '@/components/NotifyPrompt';
import { useNotificationScheduler } from '@/data/useNotificationScheduler';
import { usePalette } from '@/theme/tokens';

type ScreenProps = {
  tab: TabId;
  onAddEvent: () => void;
  onOpenEvent: (id: number) => void;
  onOpenAbout: () => void;
  onOpenPrint: () => void;
  onOpenBatteryHelp: () => void;
  onOpenReminder: (id: number) => void;
};

function Screen(props: ScreenProps) {
  const { tab, onAddEvent, onOpenEvent, onOpenAbout, onOpenReminder } = props;
  switch (tab) {
    case 'calendar':
      return <CalendarScreen onAddEvent={onAddEvent} onOpenEvent={onOpenEvent} onOpenReminder={onOpenReminder} />;
    case 'zmanim':
      return <ZmanimScreen />;
    case 'family':
      return <EventsListScreen onAdd={onAddEvent} onOpenEvent={onOpenEvent} onOpenReminder={onOpenReminder} />;
    case 'settings':
      return <SettingsScreen onOpenAbout={onOpenAbout} onOpenPrint={props.onOpenPrint} onOpenBatteryHelp={props.onOpenBatteryHelp} />;
  }
}

type Overlay = null | 'about' | 'licenses' | 'contact' | 'print' | 'battery';

// App state lives below SQLiteProvider: its memo ignores `children`, so state held
// above it would never reach the screens.
function Main() {
  const palette = usePalette();
  const scheme = useColorScheme();
  const { events } = useEvents();
  const { onboarded } = useSettings();
  const { reminders } = useReminders();
  const [openReminderId, setOpenReminderId] = useState<number | null>(null);
  const [editingReminder, setEditingReminder] = useState(false);
  const editingReminderItem = editingReminder ? reminders.find((r) => r.id === openReminderId) : undefined;
  const [tab, setTab] = useState<TabId>('calendar');
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const editingEvent = editing ? events.find((e) => e.id === openId) : undefined;
  useNotificationScheduler();
  const prompt = useNotifyPrompt(!adding && !editing && !editingReminder);
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
          onOpenPrint={() => setOverlay('print')}
          onOpenBatteryHelp={() => setOverlay('battery')}
          onOpenReminder={setOpenReminderId}
        />
      </View>
      <TabBar active={tab} onSelect={setTab} />
      {openId !== null ? (
        <EventDetailsScreen eventId={openId} onBack={() => setOpenId(null)} onEdit={() => setEditing(true)} />
      ) : null}
      {adding ? <AddItemScreen onClose={() => setAdding(false)} /> : null}
      {editingEvent ? (
        <AddItemScreen initial={{ kind: 'event', event: editingEvent }} onClose={() => setEditing(false)} />
      ) : null}
      {openReminderId !== null ? (
        <ReminderDetailsScreen
          reminderId={openReminderId}
          onBack={() => setOpenReminderId(null)}
          onEdit={() => setEditingReminder(true)}
        />
      ) : null}
      {editingReminderItem ? (
        <AddItemScreen
          initial={{ kind: 'reminder', reminder: editingReminderItem }}
          onClose={() => setEditingReminder(false)}
        />
      ) : null}
      {/* Licenses and contact sit on top of About, so "back" returns to it. */}
      {overlay === 'about' || overlay === 'licenses' || overlay === 'contact' ? (
        <AboutScreen
          onBack={() => setOverlay(null)}
          onOpenLicenses={() => setOverlay('licenses')}
          onOpenContact={() => setOverlay('contact')}
        />
      ) : null}
      {overlay === 'licenses' ? <LicensesScreen onBack={() => setOverlay('about')} /> : null}
      {overlay === 'contact' ? <ContactScreen onBack={() => setOverlay('about')} /> : null}
      {overlay === 'print' ? <PrintScreen onBack={() => setOverlay(null)} /> : null}
      {overlay === 'battery' ? <BatteryHelpScreen onBack={() => setOverlay(null)} /> : null}
      <NotifyPrompt visible={prompt.visible} onYes={prompt.accept} onLater={prompt.dismiss} />
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
            <RemindersProvider>
              <Main />
            </RemindersProvider>
          </EventsProvider>
        </SettingsProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
