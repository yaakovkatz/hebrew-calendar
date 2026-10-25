import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OptionSheet } from '@/components/OptionSheet';
import { useEvents } from '@/data/useEvents';
import { useSettings } from '@/data/useSettings';
import {
  clampHebrew,
  formatHebrewFull,
  gregDayOptions,
  gregMonthOptions,
  gregYearOptions,
  hebrewDayOptions,
  hebrewMonthOptions,
  hebrewYearOptions,
  type Option,
} from '@/lib/datePicking';
import {
  headline,
  hebrewFromGregorian,
  nextOccurrence,
  TYPE_LABEL,
  type EventType,
  type FamilyEvent,
  type ReminderTime,
} from '@/lib/events';
import { hebrewDateAt } from '@/lib/hebrewDay';
import { fonts, usePalette } from '@/theme/tokens';

const TYPES: EventType[] = ['birthday', 'anniversary', 'other'];
const REMINDERS: { value: ReminderTime; label: string }[] = [
  { value: 'evening', label: 'בערב שבו היום מתחיל' },
  { value: 'morning', label: 'בבוקר' },
  { value: 'week', label: 'שבוע לפני' },
];

const NAME_FIELD: Record<EventType, { label: string; placeholder: string; hint: string }> = {
  birthday: { label: 'של מי?', placeholder: 'נועה', hint: 'רק השם. יופיע: יום ההולדת של …' },
  anniversary: { label: 'של מי?', placeholder: 'ההורים', hint: 'רק השם. יופיע: יום הנישואין של …' },
  other: { label: 'שם האירוע', placeholder: 'בר מצווה של דוד', hint: 'יופיע כמו שכתבת' },
};

type Sheet = null | 'hDay' | 'hMonth' | 'hYear' | 'gDay' | 'gMonth' | 'gYear' | 'reminder';

/** Approved design: type as the big title, name, Hebrew date (or Gregorian + after sunset), reminder. */
export function AddEventScreen({ onClose, initial }: { onClose: () => void; initial?: FamilyEvent }) {
  const palette = usePalette();
  const { city } = useSettings();
  const insets = useSafeAreaInsets();
  const { add, update } = useEvents();
  const today = hebrewDateAt(new Date(), city);
  const now = new Date();

  // Editing starts from the saved event; a Gregorian entry reopens in Gregorian mode.
  const savedGreg = initial?.gregDate ? initial.gregDate.split('-').map(Number) : null;
  const [type, setType] = useState<EventType>(initial?.type ?? 'birthday');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [byGregorian, setByGregorian] = useState(!!savedGreg);
  const [h, setH] = useState(
    initial
      ? { day: initial.hDay, month: initial.hMonth, year: initial.hYear }
      : { day: today.getDate(), month: today.getMonth(), year: today.getFullYear() },
  );
  const [g, setG] = useState(
    savedGreg
      ? { year: savedGreg[0], month: savedGreg[1], day: savedGreg[2] }
      : { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() },
  );
  const [afterSunset, setAfterSunset] = useState(initial?.afterSunset ?? false);
  const [reminder, setReminder] = useState<ReminderTime>(initial?.reminder ?? 'evening');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The Hebrew date is the source of truth; a Gregorian entry is converted.
  const hebrew = useMemo(() => {
    if (!byGregorian) return h;
    const hd = hebrewFromGregorian(g.year, g.month, g.day, afterSunset);
    return { day: hd.getDate(), month: hd.getMonth(), year: hd.getFullYear() };
  }, [byGregorian, h, g, afterSunset]);

  const thisYear = useMemo(() => {
    const occ = nextOccurrence(
      { id: 0, type, title, hDay: hebrew.day, hMonth: hebrew.month, hYear: hebrew.year, afterSunset, gregDate: null, reminder },
      today,
    );
    return new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(occ.greg());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hebrew.day, hebrew.month, hebrew.year, today.abs()]);

  const setHebrew = (patch: Partial<typeof h>) => setH((cur) => {
    const next = { ...cur, ...patch };
    return { ...next, ...clampHebrew(next.day, next.month, next.year) };
  });
  const setGreg = (patch: Partial<typeof g>) => setG((cur) => {
    const next = { ...cur, ...patch };
    const max = new Date(next.year, next.month, 0).getDate();
    return { ...next, day: Math.min(next.day, max) };
  });

  const save = async () => {
    if (!title.trim()) {
      setError(type === 'other' ? 'צריך שם לאירוע' : 'צריך לכתוב של מי, למשל "נועה"');
      return;
    }
    setSaving(true);
    const fields = {
      type,
      title: title.trim(),
      hDay: hebrew.day,
      hMonth: hebrew.month,
      hYear: hebrew.year,
      afterSunset: byGregorian && afterSunset,
      gregDate: byGregorian ? `${g.year}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}` : null,
      reminder,
    };
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
      case 'hYear': return { title: 'שנה', options: hebrewYearOptions(today.getFullYear()), selected: h.year, onSelect: (year) => setHebrew({ year }) };
      case 'gDay': return { title: 'יום', options: gregDayOptions(g.month, g.year), selected: g.day, onSelect: (day) => setGreg({ day }) };
      case 'gMonth': return { title: 'חודש', options: gregMonthOptions(), selected: g.month, onSelect: (month) => setGreg({ month }) };
      case 'gYear': return { title: 'שנה', options: gregYearOptions(now.getFullYear()), selected: g.year, onSelect: (year) => setGreg({ year }) };
      case 'reminder': return { title: 'תזכורת', options: REMINDERS, selected: reminder, onSelect: setReminder };
      default: return null;
    }
  };
  const open = sheetProps();

  const Field = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={[styles.chip, { borderBottomColor: palette.line }]} accessibilityRole="button">
      <Text style={[styles.chipText, { color: palette.ink }]}>{label}</Text>
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
        <Text style={[styles.big, { color: palette.ink }]}>{initial ? 'עריכת אירוע' : 'אירוע חדש'}</Text>
        <View style={[styles.segment, { borderColor: palette.line }]}>
          {TYPES.map((t) => {
            const on = t === type;
            return (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.segmentItem, on && { backgroundColor: palette.ink }]}
              >
                <Text style={[styles.segmentText, { color: on ? palette.paper : palette.muted }]}>{TYPE_LABEL[t]}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: palette.muted }]}>{NAME_FIELD[type].label}</Text>
        <TextInput
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            if (error) setError(null);
          }}
          placeholder={NAME_FIELD[type].placeholder}
          placeholderTextColor={palette.muted}
          style={[styles.input, { color: palette.ink, borderBottomColor: error ? palette.red : palette.line }]}
          textAlign="right"
          returnKeyType="done"
        />
        {error ? (
          <Text style={[styles.error, { color: palette.red }]}>{error}</Text>
        ) : (
          <Text style={[styles.preview, { color: palette.sun }]}>
            {title.trim()
              ? `יופיע: ${headline({ id: 0, type, title: title.trim(), hDay: 1, hMonth: 1, hYear: 1, afterSunset: false, gregDate: null, reminder })}`
              : NAME_FIELD[type].hint}
          </Text>
        )}

        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: palette.muted }]}>{byGregorian ? 'תאריך לועזי' : 'תאריך עברי'}</Text>
          <Pressable onPress={() => setByGregorian((v) => !v)} hitSlop={8}>
            <Text style={[styles.label, { color: palette.red }]}>{byGregorian ? 'לפי תאריך עברי' : 'לפי תאריך לועזי'}</Text>
          </Pressable>
        </View>

        {byGregorian ? (
          <>
            <View style={styles.fields}>
              <Field label={String(g.day)} onPress={() => setSheet('gDay')} />
              <Field label={gregMonthOptions()[g.month - 1].label} onPress={() => setSheet('gMonth')} />
              <Field label={String(g.year)} onPress={() => setSheet('gYear')} />
            </View>
            <View style={[styles.row, { borderBottomColor: palette.lineSoft }]}>
              <Text style={[styles.rowText, { color: palette.ink }]}>אחרי השקיעה</Text>
              <Switch value={afterSunset} onValueChange={setAfterSunset} trackColor={{ true: palette.sun, false: palette.line }} thumbColor="#fff" />
            </View>
            <Text style={[styles.small, { color: palette.muted, marginTop: 6 }]}>{formatHebrewFull(hebrew.day, hebrew.month, hebrew.year)}</Text>
          </>
        ) : (
          <View style={styles.fields}>
            <Field label={hebrewDayOptions(h.month, h.year)[h.day - 1].label} onPress={() => setSheet('hDay')} />
            <Field label={`ב${hebrewMonthOptions(h.year).find((o) => o.value === h.month)!.label}`} onPress={() => setSheet('hMonth')} />
            <Field label={hebrewYearOptions(today.getFullYear()).find((o) => o.value === h.year)!.label.split(' ')[0]} onPress={() => setSheet('hYear')} />
          </View>
        )}

        <Pressable onPress={() => setSheet('reminder')} style={[styles.row, { borderBottomColor: palette.lineSoft, marginTop: 14 }]}>
          <Text style={[styles.rowText, { color: palette.ink }]}>תזכורת</Text>
          <Text style={[styles.small, { color: palette.muted }]}>{REMINDERS.find((r) => r.value === reminder)!.label} ›</Text>
        </Pressable>

        <Text style={[styles.small, styles.footer, { color: palette.muted }]}>השנה: {thisYear}</Text>
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
  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: 18, padding: 2, marginTop: 14 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 16 },
  segmentText: { fontFamily: fonts.sans, fontSize: 13 },
  preview: { fontFamily: fonts.sans, fontSize: 12, marginTop: 6 },
  small: { fontFamily: fonts.sans, fontSize: 13 },
  label: { fontFamily: fonts.sans, fontSize: 12, marginTop: 22, marginBottom: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  input: { fontFamily: fonts.serif, fontSize: 20, borderBottomWidth: 1, paddingVertical: 6 },
  error: { fontFamily: fonts.sans, fontSize: 12, marginTop: 4 },
  fields: { flexDirection: 'row', gap: 14 },
  chip: { borderBottomWidth: 1, paddingVertical: 6, paddingHorizontal: 2 },
  chipText: { fontFamily: fonts.serif, fontSize: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  rowText: { fontFamily: fonts.sans, fontSize: 15 },
  footer: { textAlign: 'center', marginTop: 28 },
});
