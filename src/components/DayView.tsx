import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { gematriya, HDate } from '@hebcal/core';
import type { City } from '@/lib/cities';
import { civilNoon, formatTime, hebrewDateAt } from '@/lib/hebrewDay';
import { buildMonth, dayLetters, hebrewMonthName, WEEKDAYS } from '@/lib/month';
import { dayZmanim, formatCountdown, nextShabbatTime, nextZman, sunProgress } from '@/lib/zmanim';
import { fonts, usePalette } from '@/theme/tokens';
import { SunArc } from './SunArc';

type Props = { now: Date; city: City; il: boolean };

/** Today in the city: big Hebrew date, sun arc, next zman, Shabbat time and the week. */
export function DayView({ now, city, il }: Props) {
  const palette = usePalette();
  const tz = city.tzid;
  const today = hebrewDateAt(now, city);

  const info = useMemo(() => {
    const grid = buildMonth(today.getFullYear(), today.getMonth(), today, il);
    const cell = grid.cells.find((c) => c.isToday);
    const zmanim = dayZmanim(now, city);
    const find = (label: string) => zmanim.find((z) => z.label === label)?.time;
    const weekStart = today.subtract(today.getDay(), 'd');
    const week = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'd'));
    const shabbatParsha = buildMonth(week[6].getFullYear(), week[6].getMonth(), today, il).cells.find(
      (c) => c.hd.abs() === week[6].abs(),
    )?.parsha;
    return {
      holidays: cell?.holidays ?? [],
      sunrise: find('הנץ החמה'),
      chatzot: find('חצות'),
      sunset: find('שקיעה'),
      tzeit: find('צאת הכוכבים'),
      week,
      shabbatParsha,
    };
    // `now` changes every minute; the day's data only when the Hebrew date does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today.abs(), city.id, il]);

  const progress = sunProgress(now, city);
  const night = progress === null && now.getTime() > (info.sunset?.getTime() ?? Infinity);
  const next = nextZman(now, city);
  const shabbat = nextShabbatTime(now, city, new HDate(civilNoon(now, tz)));

  const dateLine = new Intl.DateTimeFormat('he-IL', { timeZone: tz, day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  const weekday = night ? `ליל ${WEEKDAYS[today.getDay()]}` : `יום ${WEEKDAYS[today.getDay()]}`;
  const subtitle = info.holidays[0] ?? shabbatLine(today, info.shabbatParsha);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.meta, { color: palette.muted }]}>
        {weekday} · {dateLine}
      </Text>
      <Text style={[styles.big, { color: palette.ink }]}>
        {gematriya(today.getDate())} {hebrewMonthName(today.getMonth(), today.getFullYear())}
      </Text>
      {subtitle ? <Text style={[styles.subtitle, { color: palette.red }]}>{subtitle}</Text> : null}

      <View style={styles.arc}>
        <SunArc
          progress={progress}
          sunrise={`הנץ ${formatTime(info.sunrise, tz)}`}
          middle={night ? `צאה״כ ${formatTime(info.tzeit, tz)}` : `חצות ${formatTime(info.chatzot, tz)}`}
          sunset={`שקיעה ${formatTime(info.sunset, tz)}`}
        />
      </View>

      {next ? (
        <View style={[styles.nextBox, { borderColor: palette.line }]}>
          <View>
            <Text style={[styles.small, { color: palette.muted }]}>הזמן הבא</Text>
            <Text style={[styles.nextLabel, { color: palette.ink }]}>{next.label}</Text>
          </View>
          <View style={styles.alignEnd}>
            <Text style={[styles.nextTime, { color: palette.sun }]}>{formatTime(next.time, tz)}</Text>
            <Text style={[styles.small, { color: palette.muted }]}>{formatCountdown(now, next.time)}</Text>
          </View>
        </View>
      ) : null}

      {shabbat ? (
        <View style={styles.shabbatRow}>
          <Text style={[styles.shabbatLabel, { color: palette.ink }]}>{shabbat.title}</Text>
          <Text style={[styles.shabbatTime, { color: palette.ink }]}>
            {formatTime(shabbat.time, tz)} <Text style={[styles.small, { color: palette.muted }]}>· {formatCountdown(now, shabbat.time)}</Text>
          </Text>
        </View>
      ) : null}

      <View style={[styles.week, { borderTopColor: palette.line }]}>
        {info.week.map((hd, i) => {
          const isToday = hd.abs() === today.abs();
          const color = i === 6 ? palette.red : palette.ink;
          return (
            <View key={hd.abs()} style={[styles.weekDay, isToday && { backgroundColor: palette.today }]}>
              <Text style={[styles.weekName, { color: i === 6 ? palette.red : palette.muted }]}>{'אבגדהוש'[i]}</Text>
              <Text style={[styles.weekNum, { color }]}>{dayLetters(hd.getDate())}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function shabbatLine(today: HDate, parsha: string | null | undefined): string | null {
  if (!parsha) return null;
  if (today.getDay() === 5) return `ערב שבת ${parsha}`;
  if (today.getDay() === 6) return `שבת ${parsha}`;
  return null;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'stretch', paddingTop: 18 },
  meta: { fontFamily: fonts.sans, fontSize: 12, textAlign: 'center' },
  big: { fontFamily: fonts.serif, fontSize: 52, lineHeight: 62, textAlign: 'center', marginTop: 2 },
  subtitle: { fontFamily: fonts.serif, fontSize: 16, textAlign: 'center' },
  arc: { alignItems: 'center', marginTop: 8 },
  nextBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  alignEnd: { alignItems: 'flex-end' },
  small: { fontFamily: fonts.sans, fontSize: 11 },
  nextLabel: { fontFamily: fonts.serif, fontSize: 18 },
  nextTime: { fontFamily: fonts.serif, fontSize: 24 },
  shabbatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginHorizontal: 24, marginTop: 10 },
  shabbatLabel: { fontFamily: fonts.serif, fontSize: 16 },
  shabbatTime: { fontFamily: fonts.serif, fontSize: 18 },
  week: { flexDirection: 'row', marginHorizontal: 20, marginTop: 18, borderTopWidth: 1 },
  weekDay: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  weekName: { fontFamily: fonts.sans, fontSize: 10 },
  weekNum: { fontFamily: fonts.serif, fontSize: 17 },
});
