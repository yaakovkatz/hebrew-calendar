import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '@/data/useEvents';
import { CITIES } from '@/lib/cities';
import { headline, shortHebrewDate, upcoming, yearsLabel, type Upcoming } from '@/lib/events';
import { hebrewDateAt } from '@/lib/hebrewDay';
import { WEEKDAYS } from '@/lib/month';
import { useNow } from '@/lib/useNow';
import { fonts, usePalette } from '@/theme/tokens';

const city = CITIES[0];

function bigWhen(days: number): string {
  if (days === 0) return 'היום';
  if (days === 1) return 'מחר';
  return `${days} ימים`;
}

/** Approved design: the next date in large type, then a plain list. */
export function EventsScreen({ onAdd }: { onAdd: () => void }) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { events, loaded, remove } = useEvents();
  const list = upcoming(events, hebrewDateAt(now, city));
  const [next, ...rest] = list;

  const confirmDelete = (item: Upcoming) =>
    Alert.alert(`למחוק את ${headline(item.event)}?`, undefined, [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחיקה', style: 'destructive', onPress: () => remove(item.event.id) },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 36 }]}>
        {!loaded ? null : next ? (
          <>
            <Text style={[styles.small, { color: palette.muted }]}>הבא בתור</Text>
            <Text style={[styles.big, { color: palette.ink }]}>{bigWhen(next.daysUntil)}</Text>
            <Text style={[styles.headline, { color: palette.ink }]}>{headline(next.event)}</Text>
            <Text style={[styles.small, { color: palette.muted }]}>
              {[shortHebrewDate(next.date), `יום ${WEEKDAYS[next.date.getDay()]}`, yearsLabel(next)].filter(Boolean).join(' · ')}
            </Text>
            <View style={[styles.divider, { backgroundColor: palette.line }]} />
            {rest.map((item) => (
              <Pressable
                key={item.event.id}
                onLongPress={() => confirmDelete(item)}
                accessibilityHint="לחיצה ארוכה למחיקה"
                style={[styles.row, { borderBottomColor: palette.lineSoft }]}
              >
                <Text style={[styles.rowTitle, { color: palette.ink }]}>{item.event.title}</Text>
                <Text style={[styles.rowDate, { color: palette.muted }]}>{shortHebrewDate(item.date)}</Text>
              </Pressable>
            ))}
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: palette.ink }]}>אירועים</Text>
            <Text style={[styles.empty, { color: palette.muted }]}>
              ימי הולדת וימי נישואין לפי התאריך העברי. נזכיר לך בערב שבו היום מתחיל.
            </Text>
          </>
        )}
      </ScrollView>
      <Pressable onPress={onAdd} accessibilityRole="button" style={styles.add}>
        <Text style={[styles.addText, { color: palette.red }]}>{next ? '+ תאריך חדש' : '+ הוספת יום הולדת ראשון'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 24, paddingBottom: 24 },
  small: { fontFamily: fonts.sans, fontSize: 12 },
  big: { fontFamily: fonts.serif, fontSize: 48, lineHeight: 56, marginTop: 2 },
  headline: { fontFamily: fonts.serif, fontSize: 19, marginTop: 2 },
  title: { fontFamily: fonts.serif, fontSize: 34 },
  empty: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, marginTop: 8 },
  divider: { height: 1, marginTop: 24, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 13, borderBottomWidth: 1 },
  rowTitle: { fontFamily: fonts.serif, fontSize: 17 },
  rowDate: { fontFamily: fonts.sans, fontSize: 13 },
  add: { alignItems: 'center', paddingVertical: 16 },
  addText: { fontFamily: fonts.sans, fontSize: 15 },
});
