import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ComingSoon } from '@/components/ComingSoon';
import { TabBar, type TabId } from '@/components/TabBar';
import { CalendarScreen } from '@/screens/CalendarScreen';
import { usePalette } from '@/theme/tokens';

function Screen({ tab, onSelect }: { tab: TabId; onSelect: (id: TabId) => void }) {
  switch (tab) {
    case 'calendar':
      return <CalendarScreen onOpenFamily={() => onSelect('family')} />;
    case 'family':
      return <ComingSoon title="אירועים" note="בקרוב, בהמשך שלב 1" />;
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
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: palette.paper }}>
        <View style={{ flex: 1 }}>
          <Screen tab={tab} onSelect={setTab} />
        </View>
        <TabBar active={tab} onSelect={setTab} />
      </View>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaProvider>
  );
}
