import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gematriya, type HDate } from '@hebcal/core';
import type { City } from '@/lib/cities';
import { headline, nextOccurrence, type FamilyEvent } from '@/lib/events';
import { formatTime } from '@/lib/hebrewDay';
import { remindersOn, timeLabel, type Reminder } from '@/lib/reminders';
import { hebrewMonthName, WEEKDAYS } from '@/lib/month';
import { dayZmanim } from '@/lib/zmanim';
import { fonts, usePalette } from '@/theme/tokens';

type Props = {
  day: HDate | null;
  holidays: string[];
  events: FamilyEvent[];
  reminders: Reminder[];
  city: City;
  onClose: () => void;
  onOpenEvent: (id: number) => void;
  onOpenReminder: (id: number) => void;
};

const SHORT = ['הנץ החמה', 'שקיעה', 'צאת הכוכבים'];

/** Approved design: a bottom sheet with the date, what's on it, three zmanim and "כל הזמנים ›". */
export function DaySheet({ day, holidays, events, reminders, city, onClose, onOpenEvent, onOpenReminder }: Props) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState(false);
  if (!day) return null;

  const greg = day.greg();
  const noon = new Date(greg.getFullYear(), greg.getMonth(), greg.getDate(), 12);
  const zmanim = dayZmanim(noon, city);
  const shown = all ? zmanim : zmanim.filter((z) => SHORT.includes(z.label));
  const todays = events.filter((e) => nextOccurrence(e, day).abs() === day.abs());
  const todaysReminders = remindersOn(reminders, day);
  const gregLine = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long' }).format(greg);

  const close = () => {
    setAll(false);
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="סגירה" />
      <View style={[styles.sheet, { backgroundColor: palette.paper, paddingBottom: insets.bottom + 18 }]}>
        <View style={[styles.handle, { backgroundColor: palette.line }]} />
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={[styles.meta, { color: palette.muted }]}>
            יום {WEEKDAYS[day.getDay()]} · {gregLine}
          </Text>
          <Text style={[styles.big, { color: palette.ink }]}>
            {gematriya(day.getDate())} ב{hebrewMonthName(day.getMonth(), day.getFullYear())}
          </Text>

          {holidays.map((h) => (
            <Text key={h} style={[styles.line, { color: palette.red }]}>
              {h}
            </Text>
          ))}
          {todays.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => {
                close();
                onOpenEvent(e.id);
              }}
              accessibilityRole="button"
            >
              <Text style={[styles.line, { color: palette.sun }]}>{headline(e)} ›</Text>
            </Pressable>
          ))}

          {todaysReminders.map((r) => (
            <Pressable
              key={`r${r.id}`}
              onPress={() => {
                close();
                onOpenReminder(r.id);
              }}
              accessibilityRole="button"
              style={[styles.row, { borderBottomColor: palette.line, borderBottomWidth: 1 }]}
            >
              <Text style={[styles.reminder, { color: palette.ink }]}>{r.title}</Text>
              <Text style={[styles.rowValue, { color: palette.ink }]}>{timeLabel(r.time)}</Text>
            </Pressable>
          ))}

          <View style={styles.zmanim}>
            {shown.map((z, i) => (
              <View
                key={z.label}
                style={[styles.row, i < shown.length - 1 && { borderBottomColor: palette.lineSoft, borderBottomWidth: 1 }]}
              >
                <Text style={[styles.rowLabel, { color: palette.muted }]}>{z.label}</Text>
                <Text style={[styles.rowValue, { color: palette.ink }]}>{formatTime(z.time, city.tzid)}</Text>
              </View>
            ))}
          </View>
          <Pressable onPress={() => setAll((v) => !v)} accessibilityRole="button" style={styles.more}>
            <Text style={[styles.moreText, { color: palette.muted }]}>{all ? 'פחות זמנים' : 'כל הזמנים ›'}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0006' },
  sheet: { maxHeight: '80%', borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  handle: { alignSelf: 'center', width: 34, height: 3, borderRadius: 2, marginTop: 10 },
  body: { paddingHorizontal: 24, paddingTop: 18 },
  meta: { fontFamily: fonts.sans, fontSize: 12 },
  big: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 42 },
  line: { fontFamily: fonts.serif, fontSize: 16, marginTop: 4 },
  zmanim: { marginTop: 16 },
  reminder: { fontFamily: fonts.serif, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11 },
  rowLabel: { fontFamily: fonts.sans, fontSize: 14 },
  rowValue: { fontFamily: fonts.sans, fontSize: 14 },
  more: { alignItems: 'center', paddingVertical: 14 },
  moreText: { fontFamily: fonts.sans, fontSize: 13 },
});
