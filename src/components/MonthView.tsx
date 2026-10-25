import { useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { HDate } from '@hebcal/core';
import { eventDaysInRange, type FamilyEvent } from '@/lib/events';
import { buildMonth, WEEKDAYS, type MonthCell } from '@/lib/month';
import { fonts, usePalette, type Palette } from '@/theme/tokens';

type Props = {
  year: number;
  month: number;
  today: HDate;
  il: boolean;
  /** delta +1 = next month, -1 = previous */
  onShift: (delta: 1 | -1) => void;
  onSelectDay: (hd: HDate, holidays: string[]) => void;
  /** 'HH:MM' strings for the coming Shabbat; null hides them (e.g. on other months). */
  candles?: string | null;
  havdalah?: string | null;
  /** The next family date, or null to show the invitation to add one. */
  nextEvent?: { title: string; when: string; date: string } | null;
  onAddEvent?: () => void;
  onOpenNext?: () => void;
  /** Family dates to mark with an orange dot (setting "הצגת אירועים בלוח", on by default). */
  events?: FamilyEvent[];
  showEvents?: boolean;
};

const SWIPE_MIN = 50;

export function MonthView({
  year,
  month,
  today,
  il,
  onShift,
  onSelectDay,
  candles,
  havdalah,
  nextEvent,
  onAddEvent,
  onOpenNext,
  events = [],
  showEvents = true,
}: Props) {
  const palette = usePalette();
  const grid = useMemo(() => buildMonth(year, month, today, il), [year, month, today, il]);
  const eventDays = useMemo(
    () => (showEvents ? eventDaysInRange(events, grid.cells[0].hd, grid.cells[grid.cells.length - 1].hd) : new Set<number>()),
    [events, grid, showEvents],
  );

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
          <Cell
            key={cell.hd.abs()}
            cell={cell}
            hasEvent={eventDays.has(cell.hd.abs())}
            palette={palette}
            onPress={() => onSelectDay(cell.hd, cell.holidays)}
          />
        ))}
      </View>

      {parsha ? (
        <View style={styles.footer}>
          <Text style={[styles.footerLabel, { color: palette.muted }]}>פרשת השבוע</Text>
          <Text style={[styles.footerParsha, { color: palette.ink }]}>{parsha}</Text>
        </View>
      ) : null}

      {candles || havdalah ? (
        <View style={styles.times}>
          {candles ? <TimeBlock label="הדלקת נרות" time={candles} color={palette.red} palette={palette} /> : null}
          {candles && havdalah ? <View style={[styles.timesRule, { backgroundColor: palette.line }]} /> : null}
          {havdalah ? <TimeBlock label="מוצאי שבת" time={havdalah} color={palette.ink} palette={palette} /> : null}
        </View>
      ) : null}

      {candles !== undefined ? (
        <Pressable
          onPress={nextEvent ? onOpenNext : onAddEvent}
          accessibilityRole="button"
          style={[styles.next, { borderTopColor: palette.lineSoft }]}
        >
          <View>
            <Text style={[styles.nextLabel, { color: palette.muted }]}>הבא בתור</Text>
            <Text style={[styles.nextTitle, { color: nextEvent ? palette.ink : palette.red }]}>
              {nextEvent ? nextEvent.title : 'הוספת יום הולדת ראשון ›'}
            </Text>
          </View>
          {nextEvent ? (
            <View style={styles.alignEnd}>
              <Text style={[styles.nextTitle, { color: palette.sun }]}>{nextEvent.when}</Text>
              <Text style={[styles.nextLabel, { color: palette.muted }]}>{nextEvent.date}</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

function TimeBlock({ label, time, color, palette }: { label: string; time: string; color: string; palette: Palette }) {
  return (
    <View style={styles.timeBlock}>
      <Text style={[styles.nextLabel, { color: palette.muted }]}>{label}</Text>
      <Text style={[styles.timeValue, { color }]}>{time}</Text>
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

function Cell({ cell, hasEvent, palette, onPress }: { cell: MonthCell; hasEvent: boolean; palette: Palette; onPress: () => void }) {
  const color = cell.isShabbat ? palette.red : palette.ink;
  const note = cell.isShabbat ? cell.parsha : null;
  const hasHoliday = cell.holidays.length > 0;
  // One dot per day at most: orange for a family date, otherwise grey for a holiday.
  const dot = hasEvent ? palette.sun : hasHoliday ? palette.muted : null;
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
      ) : null}
      {dot && (!note || hasEvent) ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
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
  times: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  timeBlock: { alignItems: 'center', paddingHorizontal: 22 },
  timesRule: { width: 1 },
  timeValue: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 34 },
  next: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginHorizontal: 24,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  nextLabel: { fontFamily: fonts.sans, fontSize: 11 },
  nextTitle: { fontFamily: fonts.serif, fontSize: 17 },
  alignEnd: { alignItems: 'flex-end' },
});
