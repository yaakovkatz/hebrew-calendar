import { useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, ZmanAlertSheet } from '@/components/ZmanAlertSheet';
import { useSettings } from '@/data/useSettings';
import { useZmanAlerts } from '@/data/useZmanAlerts';
import { civilNoon, formatTime } from '@/lib/hebrewDay';
import { useNow } from '@/lib/useNow';
import { ZMAN_ALERT_ERROR } from '@/lib/zmanimAlerts';
import {
  addDays,
  civilDayLine,
  dafYomi,
  fullZmanim,
  hebrewDayTitle,
  nextZmanKey,
  shabbatRows,
  ZMAN_LABEL,
  type ZmanKey,
} from '@/lib/zmanimFull';
import { ZmanAlertScreen } from './ZmanAlertScreen';
import { fonts, usePalette } from '@/theme/tokens';

const SWIPE_MIN = 60;

/**
 * Approved mockup "4 · לשונית זמנים": one day's zmanim, ‹ › to move between days.
 * Daily zman alerts (PLAN.md "תזכורת לזמנים", mockups א–ג): a bell by a zman that has one,
 * a tap on a row opens "להזכיר לפני …", and "+ התראה לפני שקיעה ועוד" opens "התראה יומית".
 */
export function ZmanimScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { city, il } = useSettings();
  const now = useNow();
  const [offset, setOffset] = useState(0);
  const { alerts, save, remove } = useZmanAlerts();
  const [editing, setEditing] = useState<ZmanKey | null>(null);
  const [page, setPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alertFor = (key: ZmanKey) => alerts.find((a) => a.zman === key);

  const today = civilNoon(now, city.tzid);
  const day = addDays(today, offset);
  const isToday = offset === 0;

  const rows = fullZmanim(day, city, il);
  const shabbat = shabbatRows(day, city, il);
  const nextKey = isToday ? nextZmanKey(rows, now) : null;
  const daf = dafYomi(day);
  const todayTime = (key: ZmanKey) => formatTime(fullZmanim(today, city, il).find((r) => r.key === key)?.time, city.tzid);
  const act = (work: Promise<void>) => {
    setError(null);
    work.catch(() => setError(ZMAN_ALERT_ERROR));
  };

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
    <View style={{ flex: 1, paddingTop: insets.top }} {...pan.panHandlers}>
      {/* The status bar area stays clear: scrolled content stops below it (phone test 27.10.2026). */}
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: 28 }]}>
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
          const hasAlert = !!alertFor(row.key);
          return (
            <Pressable
              key={row.key}
              onPress={() => setEditing(row.key)}
              accessibilityRole="button"
              accessibilityHint={hasAlert ? 'יש התראה' : undefined}
              style={[styles.row, { borderBottomColor: palette.lineSoft }]}
            >
              <Text style={[styles.label, next && styles.labelBold, { color }]}>{row.label}</Text>
              <View style={styles.timeWrap}>
                {hasAlert ? <Bell color={palette.sun} /> : null}
                <Text style={[styles.time, next && styles.bold, { color }]}>{formatTime(row.time, city.tzid)}</Text>
              </View>
            </Pressable>
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

      {/* Fixed under the list, like "+ חדש" in the events tab (approved mockup א). */}
      {error ? <Text style={[styles.error, { color: palette.red }]}>{error}</Text> : null}
      <Pressable onPress={() => setPage(true)} accessibilityRole="button" style={styles.add}>
        <Text style={[styles.addText, { color: palette.red }]}>+ התראה לפני שקיעה ועוד</Text>
      </Pressable>

      {editing ? (
        <ZmanAlertSheet
          visible
          title={`להזכיר לפני ${ZMAN_LABEL[editing]}`}
          subtitle={`היום ${todayTime(editing)} · ${city.name}`}
          selected={alertFor(editing)?.minutesBefore ?? null}
          onSave={(m) => act(save(editing, m))}
          onRemove={() => act(remove(editing))}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {page ? <ZmanAlertScreen onBack={() => setPage(false)} /> : null}
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
  timeWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginStart: 12 },
  time: { fontFamily: fonts.sans, fontSize: 16 },
  labelBold: { fontFamily: fonts.serifMedium },
  bold: { fontFamily: fonts.sansMedium },
  dafRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 20 },
  dafLabel: { fontFamily: fonts.sans, fontSize: 13 },
  daf: { fontFamily: fonts.serif, fontSize: 18 },
  add: { alignItems: 'center', paddingVertical: 16 },
  addText: { fontFamily: fonts.sans, fontSize: 15 },
  error: { fontFamily: fonts.sans, fontSize: 12, textAlign: 'center' },
  disclaimer: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 28 },
});
