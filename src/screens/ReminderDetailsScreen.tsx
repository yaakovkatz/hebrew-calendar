import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReminders } from '@/data/useReminders';
import { useSettings } from '@/data/useSettings';
import { formatHebrewFull } from '@/lib/datePicking';
import { hebrewDateAt } from '@/lib/hebrewDay';
import { alertLabel, effectiveAlert, gregorianLine, REPEAT_LABEL, reminderItem, reminderWhen, timeLabel } from '@/lib/reminders';
import { useNow } from '@/lib/useNow';
import { fonts, usePalette } from '@/theme/tokens';


type Props = { reminderId: number; onBack: () => void; onEdit: () => void };

/** Same layout as event details: title big, countdown small in orange, plain rows, edit and delete. */
export function ReminderDetailsScreen({ reminderId, onBack, onEdit }: Props) {
  const palette = usePalette();
  const { city } = useSettings();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { reminders, remove } = useReminders();
  const reminder = reminders.find((r) => r.id === reminderId);
  if (!reminder) return null;

  const item = reminderItem(reminder, hebrewDateAt(now, city));

  const confirmDelete = () =>
    Alert.alert(`למחוק את ${reminder.title}?`, 'אי אפשר לבטל את המחיקה.', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחיקה',
        style: 'destructive',
        onPress: async () => {
          onBack();
          await remove(reminder.id);
        },
      },
    ]);

  const rows: [string, string][] = [
    ['תאריך', formatHebrewFull(item.date.getDate(), item.date.getMonth(), item.date.getFullYear())],
    ['בלועזי', gregorianLine(item.date)],
    ['שעה', timeLabel(reminder.time)],
    ['חוזר', REPEAT_LABEL[reminder.repeat]],
    ['מתי להזכיר', alertLabel(effectiveAlert(reminder.alert, reminder.time))],
  ];

  return (
    <View style={[styles.screen, { backgroundColor: palette.paper, paddingTop: insets.top + 12 }]}>
      <Pressable onPress={onBack} accessibilityRole="button" hitSlop={12} style={styles.back}>
        <Text style={[styles.backText, { color: palette.muted }]}>‹ אירועים</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.small, { color: palette.muted }]}>תזכורת</Text>
        <Text style={[styles.title, { color: palette.ink }]}>{reminder.title}</Text>
        <Text style={[styles.when, { color: item.past ? palette.muted : palette.sun }]}>{reminderWhen(item)}</Text>

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
