import { StatusBar } from 'expo-status-bar';
import { I18nManager, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CITIES } from './src/lib/cities';
import {
  formatHebrewDay,
  formatTime,
  hebrewDateAt,
  nextCandleLighting,
  parshaOfWeek,
  zmanimFor,
} from './src/lib/hebrewDay';

// Stage 0 spike: proves @hebcal/core, time zones and RTL work in a real Android build.
// Not the real UI — that follows the approved screens in design/screens.html.

type Row = { label: string; value: string };

function runChecks(): Row[] {
  const city = CITIES[0];
  const now = new Date();
  const rows: Row[] = [];
  const attempt = (label: string, fn: () => string) => {
    try {
      rows.push({ label, value: fn() });
    } catch (e) {
      rows.push({ label, value: `נכשל: ${e instanceof Error ? e.message : String(e)}` });
    }
  };

  attempt('עיר', () => city.name);
  attempt('תאריך עברי', () => formatHebrewDay(hebrewDateAt(now, city)));
  attempt('שקיעה', () => formatTime(zmanimFor(now, city).sunset(), city.tzid));
  attempt('הדלקת נרות', () => formatTime(nextCandleLighting(now, city), city.tzid));
  attempt('פרשה', () => parshaOfWeek(hebrewDateAt(now, city), true) ?? '—');
  attempt('שעה בניו יורק', () => formatTime(now, 'America/New_York'));
  attempt('Temporal', () => (typeof (globalThis as any).Temporal === 'object' ? 'קיים' : 'חסר'));
  attempt('ימין לשמאל', () => (I18nManager.isRTL ? 'כן' : 'לא'));
  attempt('מערכת', () => `${Platform.OS} ${Platform.Version}`);
  return rows;
}

export default function App() {
  const rows = runChecks();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>לוח יהודי</Text>
      <Text style={styles.subtitle}>בדיקת שלב 0</Text>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
      <StatusBar style="dark" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F6F0E4', paddingHorizontal: 24, paddingTop: 72 },
  title: { fontSize: 36, color: '#2B2118' },
  subtitle: { fontSize: 13, color: '#9A8B73', marginBottom: 24 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E6DDCB',
  },
  label: { fontSize: 15, color: '#2B2118' },
  value: { fontSize: 15, color: '#6B5E4B' },
});
