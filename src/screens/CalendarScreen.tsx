import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DaySheet } from '@/components/DaySheet';
import { DayView } from '@/components/DayView';
import { MonthView } from '@/components/MonthView';
import { useEvents } from '@/data/useEvents';
import { useSettings } from '@/data/useSettings';
import { headline, shortHebrewDate, upcoming } from '@/lib/events';
import { civilNoon, formatTime, hebrewDateAt } from '@/lib/hebrewDay';
import { shiftMonth } from '@/lib/month';
import { useNow } from '@/lib/useNow';
import { upcomingShabbatTimes } from '@/lib/zmanim';
import { HDate } from '@hebcal/core';
import { fonts, usePalette } from '@/theme/tokens';


type Mode = 'month' | 'day';

export function CalendarScreen({ onAddEvent, onOpenEvent }: { onAddEvent: () => void; onOpenEvent: (id: number) => void }) {
  const { events } = useEvents();
  const { city, il: IL, showEventsInCalendar, openOn } = useSettings();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const today = hebrewDateAt(now, city);
  const [mode, setMode] = useState<Mode>(openOn);
  const [selected, setSelected] = useState<{ hd: HDate; holidays: string[] } | null>(null);
  const [shown, setShown] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const onCurrentMonth = shown.year === today.getFullYear() && shown.month === today.getMonth();

  const times = upcomingShabbatTimes(now, city, new HDate(civilNoon(now, city.tzid)));
  const fmt = (d: Date | null) => (d ? formatTime(d, city.tzid) : null);
  const [first] = upcoming(events, today);
  const nextEvent = first
    ? {
        title: headline(first.event),
        when: first.daysUntil === 0 ? 'היום' : first.daysUntil === 1 ? 'מחר' : `${first.daysUntil} ימים`,
        date: shortHebrewDate(first.date),
      }
    : null;

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
            candles={onCurrentMonth ? fmt(times.candles) : undefined}
            havdalah={onCurrentMonth ? fmt(times.havdalah) : undefined}
            nextEvent={nextEvent}
            onOpenNext={first ? () => onOpenEvent(first.event.id) : undefined}
            events={events}
            showEvents={showEventsInCalendar}
            onAddEvent={onAddEvent}
            onSelectDay={(hd, holidays) => setSelected({ hd, holidays })}
          />
          <DaySheet
            day={selected?.hd ?? null}
            holidays={selected?.holidays ?? []}
            events={events}
            city={city}
            onClose={() => setSelected(null)}
            onOpenEvent={onOpenEvent}
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
