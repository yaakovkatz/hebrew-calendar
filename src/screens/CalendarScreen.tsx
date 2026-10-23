import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DayView } from '@/components/DayView';
import { MonthView } from '@/components/MonthView';
import { CITIES } from '@/lib/cities';
import { hebrewDateAt } from '@/lib/hebrewDay';
import { shiftMonth } from '@/lib/month';
import { useNow } from '@/lib/useNow';
import { fonts, usePalette } from '@/theme/tokens';

// Until onboarding and settings exist, the city is Jerusalem and holidays follow Israel.
const city = CITIES[0];
const IL = true;

type Mode = 'month' | 'day';

export function CalendarScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const today = hebrewDateAt(now, city);
  const [mode, setMode] = useState<Mode>('month');
  const [shown, setShown] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const onCurrentMonth = shown.year === today.getFullYear() && shown.month === today.getMonth();

  return (
    <ScrollView style={{ backgroundColor: palette.paper }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24 }}>
      <View style={[styles.toggle, { borderColor: palette.line }]}>
        {(['month', 'day'] as const).map((m) => {
          const on = mode === m;
          return (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setMode(m)}
              style={[styles.toggleItem, on && { backgroundColor: palette.ink }]}
            >
              <Text style={[styles.toggleText, { color: on ? palette.paper : palette.muted }]}>{m === 'month' ? 'חודש' : 'יום'}</Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'month' ? (
        <>
          <MonthView
            year={shown.year}
            month={shown.month}
            today={today}
            il={IL}
            onShift={(delta) => setShown((s) => shiftMonth(s.year, s.month, delta))}
            onSelectDay={(hd) => {
              if (hd.abs() === today.abs()) setMode('day');
            }}
          />
          {!onCurrentMonth ? (
            <Pressable onPress={() => setShown({ year: today.getFullYear(), month: today.getMonth() })} style={styles.backToday}>
              <Text style={[styles.backTodayText, { color: palette.red }]}>חזרה להיום</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <DayView now={now} city={city} il={IL} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignSelf: 'center', width: 140, borderWidth: 1, borderRadius: 20, padding: 2 },
  toggleItem: { flex: 1, alignItems: 'center', paddingVertical: 4, borderRadius: 18 },
  toggleText: { fontFamily: fonts.sans, fontSize: 12 },
  backToday: { alignSelf: 'center', marginTop: 14, padding: 6 },
  backTodayText: { fontFamily: fonts.sans, fontSize: 13 },
});
