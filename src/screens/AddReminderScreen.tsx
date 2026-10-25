import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OptionSheet } from '@/components/OptionSheet';
import { useReminders } from '@/data/useReminders';
import { useSettings } from '@/data/useSettings';
import { clampHebrew, hebrewDayOptions, hebrewMonthOptions, type Option } from '@/lib/datePicking';
import { hebrewDateAt } from '@/lib/hebrewDay';
import { yearLabel } from '@/lib/month';
import {
  ALERT_LABEL,
  alertOptions,
  dayOffWarning,
  gregorianLine,
  nextReminderDate,
  REPEAT_LABEL,
  timeLabel,
  timeOptions,
  type AlertTime,
  type Reminder,
  type RepeatKind,
} from '@/lib/reminders';
import { fonts, usePalette } from '@/theme/tokens';

const REPEATS: Option<RepeatKind>[] = [
  { value: 'once', label: REPEAT_LABEL.once },
  { value: 'yearly', label: REPEAT_LABEL.yearly },
];

type Sheet = null | 'hDay' | 'hMonth' | 'hYear' | 'time' | 'repeat' | 'alert';

/** Approved design: "מה", Hebrew date, time, repeat, alert; Shabbat warning; Gregorian date at the bottom. */
export function AddReminderScreen({ onClose, initial }: { onClose: () => void; initial?: Reminder }) {
  const palette = usePalette();
  const { city, il } = useSettings();
  const insets = useSafeAreaInsets();
  const { add, update } = useReminders();
  const today = hebrewDateAt(new Date(), city);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [h, setH] = useState(
    initial
      ? { day: initial.hDay, month: initial.hMonth, year: initial.hYear }
      : { day: today.getDate(), month: today.getMonth(), year: today.getFullYear() },
  );
  const [time, setTime] = useState<string | null>(initial ? initial.time : '09:00');
  const [repeat, setRepeat] = useState<RepeatKind>(initial?.repeat ?? 'once');
  const [alert, setAlert] = useState<AlertTime>(initial?.alert ?? 'hour');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Shown date: the date itself, or this year's date for a yearly reminder.
  const shown = useMemo(() => {
    const draft: Reminder = { id: 0, title, hDay: h.day, hMonth: h.month, hYear: h.year, time, repeat, alert, createdAt: '' };
    return nextReminderDate(draft, today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h.day, h.month, h.year, repeat, today.abs()]);
  const warning = shown ? dayOffWarning(shown, today, il) : null;

  const setHebrew = (patch: Partial<typeof h>) => {
    setH((cur) => {
      const next = { ...cur, ...patch };
      return { ...next, ...clampHebrew(next.day, next.month, next.year) };
    });
    if (error) setError(null);
  };

  const pickTime = (t: string | null) => {
    setTime(t);
    // "שעה לפני" needs a time; an all-day reminder alerts in the morning.
    if (!t && alert === 'hour') setAlert('morning');
  };

  const yearOptions: Option<number>[] = Array.from({ length: 11 }, (_, i) => {
    const y = today.getFullYear() + i;
    return { value: y, label: yearLabel(y) };
  });
  if (!yearOptions.some((o) => o.value === h.year)) yearOptions.unshift({ value: h.year, label: yearLabel(h.year) });

  const save = async () => {
    if (!title.trim()) {
      setError('צריך לכתוב מה התזכורת');
      return;
    }
    if (!shown) {
      setError('התאריך כבר עבר');
      return;
    }
    setSaving(true);
    const fields = { title: title.trim(), hDay: h.day, hMonth: h.month, hYear: h.year, time, repeat, alert };
    try {
      if (initial) await update({ ...fields, id: initial.id });
      else await add(fields);
      onClose();
    } catch {
      setError('לא הצלחנו לשמור. נסו שוב.');
      setSaving(false);
    }
  };

  const sheetProps = (): { title: string; options: Option<any>[]; selected: any; onSelect: (v: any) => void } | null => {
    switch (sheet) {
      case 'hDay': return { title: 'יום', options: hebrewDayOptions(h.month, h.year), selected: h.day, onSelect: (day) => setHebrew({ day }) };
      case 'hMonth': return { title: 'חודש', options: hebrewMonthOptions(h.year), selected: h.month, onSelect: (month) => setHebrew({ month }) };
      case 'hYear': return { title: 'שנה', options: yearOptions, selected: h.year, onSelect: (year) => setHebrew({ year }) };
      case 'time': return { title: 'שעה', options: timeOptions(), selected: time, onSelect: pickTime };
      case 'repeat': return { title: 'חוזר', options: REPEATS, selected: repeat, onSelect: (r) => { setRepeat(r); if (error) setError(null); } };
      case 'alert': return { title: 'התראה', options: alertOptions(time), selected: alert, onSelect: setAlert };
      default: return null;
    }
  };
  const open = sheetProps();

  const Field = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={[styles.chip, { borderBottomColor: palette.line }]} accessibilityRole="button">
      <Text style={[styles.chipText, { color: palette.ink }]}>{label}</Text>
    </Pressable>
  );

  const Row = ({ label, value, onPress }: { label: string; value: string; onPress: () => void }) => (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.row, { borderBottomColor: palette.lineSoft }]}>
      <Text style={[styles.rowText, { color: palette.ink }]}>{label}</Text>
      <Text style={[styles.small, { color: palette.muted }]}>{value} ›</Text>
    </Pressable>
  );

  return (
    <View style={[styles.screen, { backgroundColor: palette.paper, paddingTop: insets.top + 12 }]}>
      <View style={styles.topBar}>
        <Pressable onPress={onClose} accessibilityRole="button" hitSlop={12}>
          <Text style={[styles.topText, { color: palette.muted }]}>ביטול</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={[styles.big, { color: palette.ink }]}>{initial ? 'עריכת תזכורת' : 'תזכורת חדשה'}</Text>

        <Text style={[styles.label, { color: palette.muted }]}>מה</Text>
        <TextInput
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            if (error) setError(null);
          }}
          placeholder="רופא שיניים"
          placeholderTextColor={palette.muted}
          style={[styles.input, { color: palette.ink, borderBottomColor: error && !title.trim() ? palette.red : palette.line }]}
          textAlign="right"
          returnKeyType="done"
        />

        <Text style={[styles.label, { color: palette.muted }]}>תאריך עברי</Text>
        <View style={styles.fields}>
          <Field label={hebrewDayOptions(h.month, h.year)[h.day - 1].label} onPress={() => setSheet('hDay')} />
          <Field label={`ב${hebrewMonthOptions(h.year).find((o) => o.value === h.month)!.label}`} onPress={() => setSheet('hMonth')} />
          <Field label={yearLabel(h.year)} onPress={() => setSheet('hYear')} />
        </View>
        {error ? (
          <Text style={[styles.warning, { color: palette.red }]}>{error}</Text>
        ) : warning ? (
          <Text style={[styles.warning, { color: palette.red }]}>{warning}</Text>
        ) : null}

        <View style={{ marginTop: 14 }}>
          <Row label="שעה" value={timeLabel(time)} onPress={() => setSheet('time')} />
          <Row label="חוזר" value={REPEAT_LABEL[repeat]} onPress={() => setSheet('repeat')} />
          <Row label="התראה" value={ALERT_LABEL[alert]} onPress={() => setSheet('alert')} />
        </View>

        {shown ? <Text style={[styles.small, styles.footer, { color: palette.muted }]}>{gregorianLine(shown)}</Text> : null}
      </ScrollView>

      <View style={[styles.saveBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={save}
          disabled={saving}
          accessibilityRole="button"
          style={[styles.saveButton, { backgroundColor: palette.ink, opacity: saving ? 0.6 : 1 }]}
        >
          <Text style={[styles.saveText, { color: palette.paper }]}>שמירה</Text>
        </Pressable>
      </View>

      {open ? (
        <OptionSheet visible title={open.title} options={open.options} selected={open.selected} onSelect={open.onSelect} onClose={() => setSheet(null)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24 },
  saveBar: { paddingHorizontal: 24, paddingTop: 8 },
  saveButton: { alignItems: 'center', paddingVertical: 14, borderRadius: 26 },
  saveText: { fontFamily: fonts.sans, fontSize: 16 },
  topText: { fontFamily: fonts.sans, fontSize: 15 },
  body: { paddingHorizontal: 24, paddingBottom: 40 },
  big: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 44, marginTop: 18 },
  small: { fontFamily: fonts.sans, fontSize: 13 },
  label: { fontFamily: fonts.sans, fontSize: 12, marginTop: 22, marginBottom: 4 },
  input: { fontFamily: fonts.serif, fontSize: 20, borderBottomWidth: 1, paddingVertical: 6 },
  warning: { fontFamily: fonts.sans, fontSize: 12, marginTop: 6 },
  fields: { flexDirection: 'row', gap: 14 },
  chip: { borderBottomWidth: 1, paddingVertical: 6, paddingHorizontal: 2 },
  chipText: { fontFamily: fonts.serif, fontSize: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  rowText: { fontFamily: fonts.sans, fontSize: 15 },
  footer: { textAlign: 'center', marginTop: 28 },
});
