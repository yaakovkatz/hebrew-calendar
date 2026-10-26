import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '@/data/useEvents';
import { useReminders } from '@/data/useReminders';
import { useSettings } from '@/data/useSettings';
import { agenda, agendaDateLine, agendaRowDate, agendaRowWhen, agendaWhen, type AgendaItem } from '@/lib/agenda';
import { hebrewDateAt } from '@/lib/hebrewDay';
import { useNow } from '@/lib/useNow';
import { fonts, usePalette } from '@/theme/tokens';

type Props = {
  onAdd: () => void;
  onOpenEvent: (id: number) => void;
  onOpenReminder: (id: number) => void;
};

/**
 * Approved mockup 3 (fix round 1, item 1): events and reminders in one list by date.
 * "הבא בתור": the name big, a small orange countdown with the time, a grey date line.
 */
export function EventsListScreen({ onAdd, onOpenEvent, onOpenReminder }: Props) {
  const palette = usePalette();
  const { city } = useSettings();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const events = useEvents();
  const reminders = useReminders();
  const loaded = events.loaded && reminders.loaded;
  const list = agenda(events.events, reminders.reminders, hebrewDateAt(now, city));
  // Only an upcoming item can be "the next one"; past reminders stay at the end of the list.
  const next = list[0] && !list[0].past ? list[0] : null;
  const rest = next ? list.slice(1) : list;
  const open = (item: AgendaItem) => (item.kind === 'event' ? onOpenEvent(item.id) : onOpenReminder(item.id));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 36 }]}>
        {!loaded ? null : list.length ? (
          <>
            {next ? (
              <Pressable onPress={() => open(next)} accessibilityRole="button">
                <Text style={[styles.small, { color: palette.muted }]}>הבא בתור</Text>
                <Text style={[styles.big, { color: palette.ink }]}>{next.title}</Text>
                <Text style={[styles.when, { color: palette.sun }]}>{agendaWhen(next)}</Text>
                <Text style={[styles.small, { color: palette.muted }]}>{agendaDateLine(next)}</Text>
              </Pressable>
            ) : (
              <Text style={[styles.title, { color: palette.ink }]}>אירועים</Text>
            )}
            <View style={[styles.divider, { backgroundColor: palette.line }]} />
            {rest.map((item) => {
              const when = agendaRowWhen(item);
              const color = item.past ? palette.muted : palette.ink;
              return (
                <Pressable
                  key={`${item.kind}-${item.id}`}
                  onPress={() => open(item)}
                  accessibilityRole="button"
                  style={[styles.row, { borderBottomColor: palette.lineSoft }]}
                >
                  <Text style={[styles.rowTitle, { color }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.rowEnd}>
                    <Text style={[styles.rowDate, { color }]}>{agendaRowDate(item)}</Text>
                    {when ? <Text style={[styles.rowWhen, { color: palette.muted }]}>{when}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: palette.ink }]}>אירועים</Text>
            <Text style={[styles.empty, { color: palette.muted }]}>
              ימי הולדת, אזכרות ותזכורות לפי התאריך העברי.
            </Text>
          </>
        )}
      </ScrollView>
      <Pressable onPress={onAdd} accessibilityRole="button" style={styles.add}>
        <Text style={[styles.addText, { color: palette.red }]}>+ חדש</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 24, paddingBottom: 24 },
  small: { fontFamily: fonts.sans, fontSize: 12 },
  // The name is the headline; the countdown sits under it, smaller.
  big: { fontFamily: fonts.serif, fontSize: 38, lineHeight: 46, marginTop: 2 },
  when: { fontFamily: fonts.serif, fontSize: 17, marginTop: 4 },
  title: { fontFamily: fonts.serif, fontSize: 34 },
  empty: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, marginTop: 8 },
  divider: { height: 1, marginTop: 24, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 13, borderBottomWidth: 1 },
  rowTitle: { flex: 1, fontFamily: fonts.serif, fontSize: 17 },
  rowEnd: { alignItems: 'flex-end', marginStart: 12 },
  rowDate: { fontFamily: fonts.sans, fontSize: 13 },
  rowWhen: { fontFamily: fonts.sans, fontSize: 11 },
  add: { alignItems: 'center', paddingVertical: 16 },
  addText: { fontFamily: fonts.sans, fontSize: 15 },
});
