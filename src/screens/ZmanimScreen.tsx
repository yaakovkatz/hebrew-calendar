import { useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/data/useSettings';
import { civilNoon, formatTime } from '@/lib/hebrewDay';
import { useNow } from '@/lib/useNow';
import {
  addDays,
  civilDayLine,
  dafYomi,
  fullZmanim,
  hebrewDayTitle,
  nextZmanKey,
  shabbatRows,
} from '@/lib/zmanimFull';
import { fonts, usePalette } from '@/theme/tokens';

const SWIPE_MIN = 60;

/** Approved mockup "4 · לשונית זמנים": one day's zmanim, ‹ › to move between days. */
export function ZmanimScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { city, il } = useSettings();
  const now = useNow();
  const [offset, setOffset] = useState(0);

  const today = civilNoon(now, city.tzid);
  const day = addDays(today, offset);
  const isToday = offset === 0;

  const rows = fullZmanim(day, city, il);
  const shabbat = shabbatRows(day, city, il);
  const nextKey = isToday ? nextZmanKey(rows, now) : null;
  const daf = dafYomi(day);

  const shift = useRef((delta: number) => setOffset((o) => o + delta)).current;
  // Same page turn as the month view: drag to the right for the next day.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_MIN) shift(1);
        else if (g.dx < -SWIPE_MIN) shift(-1);
      },
    }),
  ).current;

  return (
    <View style={{ flex: 1 }} {...pan.panHandlers}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 28 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => shift(-1)} accessibilityRole="button" accessibilityLabel="היום הקודם" hitSlop={16} style={styles.arrow}>
            <Text style={[styles.arrowText, { color: palette.muted }]}>‹</Text>
          </Pressable>
          <View style={styles.title}>
            <Text style={[styles.hebrew, { color: palette.ink }]}>{hebrewDayTitle(day)}</Text>
            <Text style={[styles.civil, { color: palette.muted }]}>{civilDayLine(day, city.name)}</Text>
          </View>
          <Pressable onPress={() => shift(1)} accessibilityRole="button" accessibilityLabel="היום הבא" hitSlop={16} style={styles.arrow}>
            <Text style={[styles.arrowText, { color: palette.muted }]}>›</Text>
          </Pressable>
        </View>
        <View style={styles.todaySlot}>
          {isToday ? null : (
            <Pressable onPress={() => setOffset(0)} accessibilityRole="button" hitSlop={10}>
              <Text style={[styles.todayText, { color: palette.red }]}>היום</Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: palette.line }]} />

        {shabbat.map((row) => (
          <View key={row.key} style={[styles.row, { borderBottomColor: palette.lineSoft }]}>
            <Text style={[styles.label, { color: palette.red }]}>{row.label}</Text>
            <Text style={[styles.time, { color: palette.red }]}>{formatTime(row.time, city.tzid)}</Text>
          </View>
        ))}

        {rows.map((row) => {
          const next = row.key === nextKey;
          const color = next ? palette.sun : palette.ink;
          return (
            <View key={row.key} style={[styles.row, { borderBottomColor: palette.lineSoft }]}>
              <Text style={[styles.label, next && styles.labelBold, { color }]}>{row.label}</Text>
              <Text style={[styles.time, next && styles.bold, { color }]}>{formatTime(row.time, city.tzid)}</Text>
            </View>
          );
        })}

        <View style={styles.dafRow}>
          <Text style={[styles.dafLabel, { color: palette.muted }]}>דף יומי</Text>
          <Text style={[styles.daf, { color: palette.ink }]}>{daf ?? '—'}</Text>
        </View>

        <Text style={[styles.disclaimer, { color: palette.muted }]}>
          הזמנים לעיון, לפי שיטת הגר״א ומג״א. בשאלה הלכתית פנו לרב.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 24, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { paddingHorizontal: 6, paddingVertical: 4 },
  arrowText: { fontFamily: fonts.sans, fontSize: 26 },
  title: { flex: 1, alignItems: 'center' },
  hebrew: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 42 },
  civil: { fontFamily: fonts.sans, fontSize: 12, marginTop: 2 },
  // Fixed height so the list doesn't jump when "היום" appears.
  todaySlot: { height: 26, alignItems: 'center', justifyContent: 'center' },
  todayText: { fontFamily: fonts.sans, fontSize: 13 },
  divider: { height: 1, marginTop: 6, marginBottom: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 11, borderBottomWidth: 1 },
  label: { flex: 1, fontFamily: fonts.serif, fontSize: 16 },
  time: { fontFamily: fonts.sans, fontSize: 16, marginStart: 12 },
  labelBold: { fontFamily: fonts.serifMedium },
  bold: { fontFamily: fonts.sansMedium },
  dafRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 20 },
  dafLabel: { fontFamily: fonts.sans, fontSize: 13 },
  daf: { fontFamily: fonts.serif, fontSize: 18 },
  disclaimer: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 28 },
});
