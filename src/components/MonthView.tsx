import { useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { HDate } from '@hebcal/core';
import { buildMonth, WEEKDAYS, type MonthCell } from '@/lib/month';
import { fonts, usePalette, type Palette } from '@/theme/tokens';

type Props = {
  year: number;
  month: number;
  today: HDate;
  il: boolean;
  /** delta +1 = next month, -1 = previous */
  onShift: (delta: 1 | -1) => void;
  onSelectDay: (hd: HDate) => void;
  /** Shown under the parsha, e.g. 'הדלקת נרות 17:08 · מוצאי שבת 18:20' */
  shabbatNote?: string | null;
};

const SWIPE_MIN = 50;

export function MonthView({ year, month, today, il, onShift, onSelectDay, shabbatNote }: Props) {
  const palette = usePalette();
  const grid = useMemo(() => buildMonth(year, month, today, il), [year, month, today, il]);

  const onShiftRef = useRef(onShift);
  onShiftRef.current = onShift;

  // Hebrew page turn: drag to the right for the next month.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_MIN) onShiftRef.current(1);
        else if (g.dx < -SWIPE_MIN) onShiftRef.current(-1);
      },
    }),
  ).current;

  const parsha = grid.cells.find((c) => c.inMonth && c.isShabbat && c.hd.abs() >= today.abs())?.parsha;

  return (
    <View {...pan.panHandlers}>
      <View style={styles.header}>
        <Text style={[styles.year, { color: palette.muted }]}>{grid.yearLabel}</Text>
        <Text style={[styles.title, { color: palette.ink }]}>{grid.title}</Text>
        <Text style={[styles.greg, { color: palette.muted }]}>{grid.gregRange}</Text>
      </View>

      <View style={styles.row}>
        {WEEKDAYS.map((d, i) => (
          <Text key={d} style={[styles.weekday, { color: i === 6 ? palette.red : palette.muted }]}>
            {d}
          </Text>
        ))}
      </View>
      <Ornament palette={palette} />

      <View style={styles.grid}>
        {grid.cells.map((cell) => (
          <Cell key={cell.hd.abs()} cell={cell} palette={palette} onPress={() => onSelectDay(cell.hd)} />
        ))}
      </View>

      {parsha ? (
        <View style={styles.footer}>
          <Text style={[styles.footerLabel, { color: palette.muted }]}>פרשת השבוע</Text>
          <Text style={[styles.footerParsha, { color: palette.ink }]}>{parsha}</Text>
          {shabbatNote ? <Text style={[styles.footerNote, { color: palette.inkSoft }]}>{shabbatNote}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function Ornament({ palette }: { palette: Palette }) {
  return (
    <View style={styles.ornament}>
      <View style={[styles.rule, { backgroundColor: palette.line }]} />
      <Text style={{ color: palette.red, fontSize: 12 }}>✦</Text>
      <View style={[styles.rule, { backgroundColor: palette.line }]} />
    </View>
  );
}

function Cell({ cell, palette, onPress }: { cell: MonthCell; palette: Palette; onPress: () => void }) {
  const color = cell.isShabbat ? palette.red : palette.ink;
  const note = cell.isShabbat ? cell.parsha : null;
  const hasHoliday = cell.holidays.length > 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${cell.hd.renderGematriya(true, true)}${cell.holidays.length ? ', ' + cell.holidays.join(', ') : ''}`}
      style={[
        styles.cell,
        { borderBottomColor: palette.lineSoft, opacity: cell.inMonth ? 1 : 0.3 },
        cell.isToday && { backgroundColor: palette.today },
      ]}
    >
      <Text style={[styles.gregDay, { color: palette.muted }]}>{cell.gregDay}</Text>
      <Text style={[styles.day, { color }]}>{cell.label}</Text>
      {note ? (
        <Text numberOfLines={1} style={[styles.note, { color }]}>
          {note}
        </Text>
      ) : hasHoliday ? (
        <View style={[styles.dot, { backgroundColor: palette.muted }]} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingTop: 14, paddingBottom: 16 },
  year: { fontFamily: fonts.sans, fontSize: 12, letterSpacing: 2 },
  title: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 48 },
  greg: { fontFamily: fonts.sans, fontSize: 12 },
  row: { flexDirection: 'row', marginHorizontal: 14, paddingBottom: 8 },
  weekday: { flex: 1, textAlign: 'center', fontFamily: fonts.sans, fontSize: 10 },
  ornament: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, marginBottom: 2 },
  rule: { flex: 1, height: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 14 },
  cell: { width: `${100 / 7}%`, height: 52, borderBottomWidth: 1, alignItems: 'center', paddingTop: 8 },
  // `end` is the left side in RTL, where the wall calendar puts the Gregorian day.
  gregDay: { position: 'absolute', top: 3, end: 4, fontFamily: fonts.sans, fontSize: 10 },
  day: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 24 },
  note: { fontFamily: fonts.serif, fontSize: 9.5, lineHeight: 11 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  footer: { alignItems: 'center', paddingTop: 18 },
  footerLabel: { fontFamily: fonts.sans, fontSize: 12 },
  footerParsha: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 34 },
  footerNote: { fontFamily: fonts.serif, fontSize: 14, marginTop: 2 },
});
