import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReminders } from '@/data/useReminders';
import { useSettings } from '@/data/useSettings';
import { shortHebrewDate } from '@/lib/events';
import { hebrewDateAt } from '@/lib/hebrewDay';
import { WEEKDAYS } from '@/lib/month';
import { reminderRowLabel, reminderWhen, sortedReminders } from '@/lib/reminders';
import { useNow } from '@/lib/useNow';
import { fonts, usePalette } from '@/theme/tokens';


/** Approved design (as events): the next reminder's title big, countdown small in orange, then a plain list. */
export function RemindersScreen({ onAdd, onOpen }: { onAdd: () => void; onOpen: (id: number) => void }) {
  const palette = usePalette();
  const { city } = useSettings();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { reminders, loaded } = useReminders();
  const list = sortedReminders(reminders, hebrewDateAt(now, city));
  // Only an upcoming reminder can be "the next one"; past ones stay in the list below.
  const next = list[0] && !list[0].past ? list[0] : null;
  const rest = next ? list.slice(1) : list;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 36 }]}>
        {!loaded ? null : list.length ? (
          <>
            {next ? (
              <Pressable onPress={() => onOpen(next.reminder.id)} accessibilityRole="button">
                <Text style={[styles.small, { color: palette.muted }]}>התזכורת הבאה</Text>
                <Text style={[styles.big, { color: palette.ink }]}>{next.reminder.title}</Text>
                <Text style={[styles.headline, { color: palette.sun }]}>{reminderWhen(next)}</Text>
                <Text style={[styles.small, { color: palette.muted }]}>
                  {[shortHebrewDate(next.date), `יום ${WEEKDAYS[next.date.getDay()]}`, next.reminder.time].filter(Boolean).join(' · ')}
                </Text>
              </Pressable>
            ) : (
              <Text style={[styles.title, { color: palette.ink }]}>תזכורות</Text>
            )}
            <View style={[styles.divider, { backgroundColor: palette.line }]} />
            {rest.map((item) => (
              <Pressable
                key={item.reminder.id}
                onPress={() => onOpen(item.reminder.id)}
                accessibilityRole="button"
                style={[styles.row, { borderBottomColor: palette.lineSoft }]}
              >
                <Text style={[styles.rowTitle, { color: item.past ? palette.muted : palette.ink }]} numberOfLines={1}>
                  {item.reminder.title}
                </Text>
                <Text style={[styles.rowDate, { color: item.past ? palette.muted : palette.ink }]}>{reminderRowLabel(item)}</Text>
              </Pressable>
            ))}
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: palette.ink }]}>תזכורות</Text>
            <Text style={[styles.empty, { color: palette.muted }]}>תור לרופא, אסיפת הורים, כל דבר עם תאריך ושעה.</Text>
          </>
        )}
      </ScrollView>
      <Pressable onPress={onAdd} accessibilityRole="button" style={styles.add}>
        <Text style={[styles.addText, { color: palette.red }]}>+ תזכורת חדשה</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 24, paddingBottom: 24 },
  small: { fontFamily: fonts.sans, fontSize: 12 },
  // The reminder's title is the headline; the countdown sits under it, smaller.
  big: { fontFamily: fonts.serif, fontSize: 38, lineHeight: 46, marginTop: 2 },
  headline: { fontFamily: fonts.serif, fontSize: 20, marginTop: 4 },
  title: { fontFamily: fonts.serif, fontSize: 34 },
  empty: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, marginTop: 8 },
  divider: { height: 1, marginTop: 24, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 13, borderBottomWidth: 1 },
  rowTitle: { flex: 1, fontFamily: fonts.serif, fontSize: 17 },
  rowDate: { fontFamily: fonts.sans, fontSize: 13, marginStart: 12 },
  add: { alignItems: 'center', paddingVertical: 16 },
  addText: { fontFamily: fonts.sans, fontSize: 15 },
});
