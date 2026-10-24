import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '@/data/useEvents';
import { CITIES } from '@/lib/cities';
import { formatHebrewFull } from '@/lib/datePicking';
import {
  headline,
  originalDateLabel,
  REMINDER_LABEL,
  shortHebrewDate,
  TYPE_LABEL,
  upcoming,
  whenLabel,
  yearsLabel,
} from '@/lib/events';
import { hebrewDateAt } from '@/lib/hebrewDay';
import { WEEKDAYS } from '@/lib/month';
import { useNow } from '@/lib/useNow';
import { fonts, usePalette } from '@/theme/tokens';

const city = CITIES[0];

type Props = { eventId: number; onBack: () => void; onEdit: () => void };

/** Approved design: countdown in orange, a few plain rows, edit and delete at the bottom. */
export function EventDetailsScreen({ eventId, onBack, onEdit }: Props) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { events, remove } = useEvents();
  const event = events.find((e) => e.id === eventId);
  if (!event) return null;

  const [item] = upcoming([event], hebrewDateAt(now, city));
  const gregThisYear = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }).format(item.date.greg());
  const original = event.gregDate
    ? `${formatHebrewFull(event.hDay, event.hMonth, event.hYear)} · ${new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(new Date(event.gregDate + 'T12:00:00'))}`
    : formatHebrewFull(event.hDay, event.hMonth, event.hYear);

  const confirmDelete = () =>
    Alert.alert(`למחוק את ${headline(event)}?`, 'אי אפשר לבטל את המחיקה.', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחיקה',
        style: 'destructive',
        onPress: async () => {
          onBack();
          await remove(event.id);
        },
      },
    ]);

  const rows: [string, string][] = [
    ['השנה', `${shortHebrewDate(item.date)} · יום ${WEEKDAYS[item.date.getDay()]}`],
    ['בלועזי', gregThisYear],
    [originalDateLabel(event.type), original],
    ['תזכורת', REMINDER_LABEL[event.reminder]],
  ];

  return (
    <View style={[styles.screen, { backgroundColor: palette.paper, paddingTop: insets.top + 12 }]}>
      <Pressable onPress={onBack} accessibilityRole="button" hitSlop={12} style={styles.back}>
        <Text style={[styles.backText, { color: palette.muted }]}>‹ אירועים</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.small, { color: palette.muted }]}>{TYPE_LABEL[event.type]}</Text>
        <Text style={[styles.title, { color: palette.ink }]}>{headline(event)}</Text>
        <Text style={[styles.when, { color: palette.sun }]}>{whenLabel(item.daysUntil)}</Text>
        {yearsLabel(item) ? <Text style={[styles.small, { color: palette.muted }]}>{yearsLabel(item)}</Text> : null}

        <View style={[styles.divider, { backgroundColor: palette.line }]} />
        {rows.map(([label, value], i) => (
          <View key={label} style={[styles.row, i < rows.length - 1 && { borderBottomColor: palette.lineSoft, borderBottomWidth: 1 }]}>
            <Text style={[styles.rowLabel, { color: palette.ink }]}>{label}</Text>
            <Text style={[styles.rowValue, { color: palette.muted }]}>{value}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable onPress={confirmDelete} accessibilityRole="button" style={[styles.button, styles.delete, { borderColor: palette.line }]}>
          <Text style={[styles.buttonText, { color: palette.red }]}>מחיקה</Text>
        </Pressable>
        <Pressable onPress={onEdit} accessibilityRole="button" style={[styles.button, styles.edit, { backgroundColor: palette.ink }]}>
          <Text style={[styles.buttonText, { color: palette.paper }]}>עריכה</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  back: { paddingHorizontal: 24 },
  backText: { fontFamily: fonts.sans, fontSize: 15 },
  body: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 24 },
  small: { fontFamily: fonts.sans, fontSize: 12 },
  // The event's name is the headline; the countdown sits under it, smaller.
  title: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 48 },
  when: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, marginTop: 6 },
  divider: { height: 1, marginTop: 20, marginBottom: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, paddingVertical: 12 },
  rowLabel: { fontFamily: fonts.serif, fontSize: 16 },
  rowValue: { flexShrink: 1, fontFamily: fonts.sans, fontSize: 13, textAlign: 'left' },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 24 },
  button: { alignItems: 'center', paddingVertical: 13, borderRadius: 24 },
  delete: { flex: 1, borderWidth: 1 },
  edit: { flex: 2 },
  buttonText: { fontFamily: fonts.sans, fontSize: 15 },
});
