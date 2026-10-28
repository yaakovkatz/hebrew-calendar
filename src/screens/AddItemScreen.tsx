import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HDate } from '@hebcal/core';
import { AlertSheet } from '@/components/AlertSheet';
import { OptionSheet } from '@/components/OptionSheet';
import { useEvents } from '@/data/useEvents';
import { useReminders } from '@/data/useReminders';
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
  EVENT_TYPES,
  hebrewFromGregorian,
  mitzvahDate,
  mitzvahTitle,
  nextOccurrence,
  previewLine,
  REMINDER_LABEL,
  TYPE_LABEL,
  type EventType,
  type FamilyEvent,
  type MitzvahKind,
  type ReminderTime,
} from '@/lib/events';
import { defaultItemDate, hebrewDateAt } from '@/lib/hebrewDay';
import { yearLabel } from '@/lib/month';
import {
  ALERT_MORNING,
  alertLabel,
  dayOffWarning,
  DEFAULT_ALERT,
  effectiveAlert,
  gregorianLine,
  hebrewDateWithB,
  maskTime,
  nextReminderDate,
  parseTimeInput,
  REPEAT_LABEL,
  TIME_SHORTCUTS,
  type Reminder,
  type ReminderAlert,
  type RepeatKind,
} from '@/lib/reminders';
import { fonts, usePalette } from '@/theme/tokens';
import { TopButton } from '@/components/TopButton';

export type ItemKind = 'event' | 'reminder';
export type AddItemInitial = { kind: 'event'; event: FamilyEvent } | { kind: 'reminder'; reminder: Reminder };

type Props = {
  onClose: () => void;
  /** Editing: the saved item. The kind can't change then. */
  initial?: AddItemInitial;
  /** A new item starts on this kind (default: event). */
  defaultKind?: ItemKind;
};

const EVENT_REMINDERS: Option<ReminderTime>[] = (['evening', 'morning', 'week'] as const).map((value) => ({
  value,
  label: REMINDER_LABEL[value],
}));
// Approved 27.10.2026 (option ב): no event/reminder switch; "תזכורת" is the first type.
type ItemType = EventType | 'reminder';
const TYPE_OPTIONS: Option<ItemType>[] = [{ value: 'reminder', label: 'תזכורת', hint: 'משהו בתאריך ובשעה מסוימים' }, ...EVENT_TYPES];
const REPEATS: Option<RepeatKind>[] = [
  { value: 'once', label: REPEAT_LABEL.once },
  { value: 'yearly', label: REPEAT_LABEL.yearly },
];

const NAME_FIELD: Record<EventType, { label: string; placeholder: string; hint: string }> = {
  birthday: { label: 'של מי?', placeholder: 'נועה', hint: 'רק השם. יופיע: יום ההולדת של …' },
  anniversary: { label: 'של מי?', placeholder: 'ההורים', hint: 'רק השם. יופיע: יום הנישואין של …' },
  yahrzeit: { label: 'של מי?', placeholder: 'סבא משה', hint: 'רק השם. יופיע: האזכרה של …' },
  aliyah: { label: 'של מי?', placeholder: 'סבתא', hint: 'רק השם. יופיע: יום העלייה של …' },
  other: { label: 'שם האירוע', placeholder: 'פתיחת העסק', hint: 'יופיע כמו שכתבת' },
};

// Messages from the central list (PLAN.md): never technical text.
const ERR = {
  name: 'צריך לכתוב של מי, למשל "נועה"',
  eventName: 'צריך שם לאירוע',
  what: 'צריך לכתוב מה התזכורת',
  time: 'השעה לא תקינה',
  past: 'התאריך כבר עבר',
  save: 'לא הצלחנו לשמור. נסו שוב.',
};

type Sheet = null | 'type' | 'hDay' | 'hMonth' | 'hYear' | 'gDay' | 'gMonth' | 'gYear' | 'eventReminder' | 'repeat' | 'alert';

/**
 * Fix round 1, items 1, 3, 4 (approved mockups 1א, 1ב, 1ג, 2): one add/edit screen for events and reminders.
 * The two kinds stay in their own tables; only this screen and the list are shared.
 */
function dateParts(d: HDate) {
  return { day: d.getDate(), month: d.getMonth(), year: d.getFullYear() };
}

export function AddItemScreen({ onClose, initial, defaultKind = 'event' }: Props) {
  const palette = usePalette();
  const { city, il } = useSettings();
  const insets = useSafeAreaInsets();
  const events = useEvents();
  const reminders = useReminders();
  const today = hebrewDateAt(new Date(), city);
  const now = new Date();

  const initEvent = initial?.kind === 'event' ? initial.event : undefined;
  const initRem = initial?.kind === 'reminder' ? initial.reminder : undefined;
  const editing = !!initial;

  const [kind, setKind] = useState<ItemKind>(initial?.kind ?? defaultKind);
  const [title, setTitle] = useState(initEvent?.title ?? initRem?.title ?? '');
  const [h, setH] = useState(() => {
    const src = initEvent ?? initRem;
    return src
      ? { day: src.hDay, month: src.hMonth, year: src.hYear }
      : dateParts(defaultItemDate(initial?.kind ?? defaultKind, now, city));
  });

  // Event fields. A Gregorian entry reopens in Gregorian mode.
  const savedGreg = initEvent?.gregDate ? initEvent.gregDate.split('-').map(Number) : null;
  const [type, setType] = useState<EventType>(initEvent?.type ?? 'birthday');
  const [showYears, setShowYears] = useState(initEvent?.showYears ?? false);
  const [byGregorian, setByGregorian] = useState(!!savedGreg);
  const [g, setG] = useState(
    savedGreg
      ? { year: savedGreg[0], month: savedGreg[1], day: savedGreg[2] }
      : { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() },
  );
  const [afterSunset, setAfterSunset] = useState(initEvent?.afterSunset ?? false);
  const [eventReminder, setEventReminder] = useState<ReminderTime>(initEvent?.reminder ?? 'evening');

  // Reminder fields.
  const [allDay, setAllDay] = useState(initRem ? initRem.time === null : false);
  const [timeText, setTimeText] = useState(initRem ? initRem.time ?? '' : '09:00');
  const [repeat, setRepeat] = useState<RepeatKind>(initRem?.repeat ?? 'once');
  const [alert, setAlert] = useState<ReminderAlert>(initRem?.alert ?? DEFAULT_ALERT);

  const [sheet, setSheet] = useState<Sheet>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEvent = kind === 'event';
  const time = allDay ? null : parseTimeInput(timeText);
  // An all-day reminder can't alert "minutes before": it alerts in the morning.
  const shownAlert = effectiveAlert(alert, allDay ? null : timeText || '00:00');

  // The Hebrew date is the source of truth; a Gregorian entry is converted.
  const hebrew = useMemo(() => {
    if (!isEvent || !byGregorian) return h;
    const hd = hebrewFromGregorian(g.year, g.month, g.day, afterSunset);
    return { day: hd.getDate(), month: hd.getMonth(), year: hd.getFullYear() };
  }, [isEvent, byGregorian, h, g, afterSunset]);

  const draftEvent: FamilyEvent = {
    id: initEvent?.id ?? 0,
    type,
    title: title.trim(),
    hDay: hebrew.day,
    hMonth: hebrew.month,
    hYear: hebrew.year,
    afterSunset: byGregorian && afterSunset,
    gregDate: byGregorian ? `${g.year}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}` : null,
    reminder: eventReminder,
    showYears: type === 'other' && showYears,
  };
  const draftReminder: Reminder = {
    id: initRem?.id ?? 0,
    title: title.trim(),
    hDay: h.day,
    hMonth: h.month,
    hYear: h.year,
    time,
    repeat,
    alert: shownAlert,
    createdAt: initRem?.createdAt ?? '',
  };

  const eventThisYear = isEvent ? nextOccurrence(draftEvent, today) : null;
  // A reminder counts days by the civil date (see defaultItemDate): after sunset today is still today.
  const reminderToday = defaultItemDate('reminder', now, city);
  const reminderShown = isEvent ? null : nextReminderDate(draftReminder, reminderToday);
  const warning = reminderShown ? dayOffWarning(reminderShown, reminderToday, il) : null;

  const clearError = () => {
    if (error) setError(null);
  };
  const setHebrew = (patch: Partial<typeof h>) => {
    setH((cur) => {
      const next = { ...cur, ...patch };
      return { ...next, ...clampHebrew(next.day, next.month, next.year) };
    });
    clearError();
  };
  const setGreg = (patch: Partial<typeof g>) =>
    setG((cur) => {
      const next = { ...cur, ...patch };
      const max = new Date(next.year, next.month, 0).getDate();
      return { ...next, day: Math.min(next.day, max) };
    });
  const pickTime = (t: string | null) => {
    setAllDay(t === null);
    setTimeText(t ?? '');
    setTimeError(false);
  };

  const reminderYears: Option<number>[] = Array.from({ length: 11 }, (_, i) => {
    const y = today.getFullYear() + i;
    return { value: y, label: yearLabel(y) };
  });
  if (!reminderYears.some((o) => o.value === h.year)) reminderYears.unshift({ value: h.year, label: yearLabel(h.year) });

  /** After a new birthday: "להוסיף גם בר/בת מצווה?" — a one-time, all-day reminder on that date. */
  const offerMitzvah = (ev: FamilyEvent) => {
    const dates: { kind: MitzvahKind; date: HDate }[] = (['bar', 'bat'] as const)
      .map((k) => ({ kind: k, date: mitzvahDate(ev, k) }))
      .filter((d) => d.date.abs() >= today.abs());
    if (!dates.length) {
      onClose();
      return;
    }
    const addMitzvah = async (k: MitzvahKind, date: HDate) => {
      try {
        await reminders.add({
          title: mitzvahTitle(ev.title, k),
          hDay: date.getDate(),
          hMonth: date.getMonth(),
          hYear: date.getFullYear(),
          time: null,
          repeat: 'once',
          alert: ALERT_MORNING,
        });
      } catch {
        // The birthday itself is saved; the extra reminder can be added by hand.
      }
      onClose();
    };
    Alert.alert(
      'להוסיף גם בר/בת מצווה?',
      dates.map((d) => `${d.kind === 'bar' ? 'בר מצווה' : 'בת מצווה'}: ${hebrewDateWithB(d.date)} ${yearLabel(d.date.getFullYear())}`).join('\n'),
      [
        { text: 'לא', style: 'cancel', onPress: onClose },
        ...dates.map((d) => ({ text: d.kind === 'bar' ? 'בר מצווה' : 'בת מצווה', onPress: () => addMitzvah(d.kind, d.date) })),
      ],
      { cancelable: true, onDismiss: onClose },
    );
  };

  const save = async () => {
    if (!title.trim()) {
      setError(isEvent ? (type === 'other' ? ERR.eventName : ERR.name) : ERR.what);
      return;
    }
    if (!isEvent) {
      if (!allDay && !time) {
        setTimeError(true);
        return;
      }
      if (!reminderShown) {
        setError(ERR.past);
        return;
      }
    }
    setSaving(true);
    try {
      if (isEvent) {
        const { id, ...fields } = draftEvent;
        if (initEvent) await events.update({ ...fields, id: initEvent.id });
        else await events.add(fields);
        if (!initEvent && type === 'birthday') {
          offerMitzvah(draftEvent);
          return;
        }
      } else {
        const { id, createdAt, ...fields } = draftReminder;
        if (initRem) await reminders.update({ ...fields, id: initRem.id });
        else await reminders.add(fields);
      }
      onClose();
    } catch {
      setError(ERR.save);
      setSaving(false);
    }
  };

  const switchKind = (k: ItemKind) => {
    if (k === kind) return;
    // An untouched default date follows the kind (they differ after sunset).
    const from = dateParts(defaultItemDate(kind, now, city));
    if (!editing && h.day === from.day && h.month === from.month && h.year === from.year) {
      setH(dateParts(defaultItemDate(k, now, city)));
    }
    setKind(k);
    setError(null);
    setTimeError(false);
  };

  const sheetProps = (): { title: string; options: Option<any>[]; selected: any; onSelect: (v: any) => void } | null => {
    switch (sheet) {
      case 'type':
        return {
          title: 'סוג',
          // Editing keeps the item in its own list: a reminder stays a reminder, an event an event.
          options: editing ? TYPE_OPTIONS.filter((o) => (o.value === 'reminder') === !isEvent) : TYPE_OPTIONS,
          selected: isEvent ? type : 'reminder',
          onSelect: (t: ItemType) => {
            if (t === 'reminder') switchKind('reminder');
            else {
              switchKind('event');
              setType(t);
            }
            clearError();
          },
        };
      case 'hDay': return { title: 'יום', options: hebrewDayOptions(h.month, h.year), selected: h.day, onSelect: (day) => setHebrew({ day }) };
      case 'hMonth': return { title: 'חודש', options: hebrewMonthOptions(h.year), selected: h.month, onSelect: (month) => setHebrew({ month }) };
      case 'hYear':
        return isEvent
          ? { title: 'שנה', options: hebrewYearOptions(today.getFullYear()), selected: h.year, onSelect: (year) => setHebrew({ year }) }
          : { title: 'שנה', options: reminderYears, selected: h.year, onSelect: (year) => setHebrew({ year }) };
      case 'gDay': return { title: 'יום', options: gregDayOptions(g.month, g.year), selected: g.day, onSelect: (day) => setGreg({ day }) };
      case 'gMonth': return { title: 'חודש', options: gregMonthOptions(), selected: g.month, onSelect: (month) => setGreg({ month }) };
      case 'gYear': return { title: 'שנה', options: gregYearOptions(now.getFullYear()), selected: g.year, onSelect: (year) => setGreg({ year }) };
      case 'eventReminder': return { title: 'מתי להזכיר', options: EVENT_REMINDERS, selected: eventReminder, onSelect: setEventReminder };
      case 'repeat': return { title: 'חוזר', options: REPEATS, selected: repeat, onSelect: (r) => { setRepeat(r); clearError(); } };
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

  const hebrewFields = (
    <View style={styles.fields}>
      <Field label={hebrewDayOptions(h.month, h.year)[h.day - 1].label} onPress={() => setSheet('hDay')} />
      <Field label={`ב${hebrewMonthOptions(h.year).find((o) => o.value === h.month)!.label}`} onPress={() => setSheet('hMonth')} />
      <Field label={yearLabel(h.year)} onPress={() => setSheet('hYear')} />
    </View>
  );

  const nameField = isEvent ? NAME_FIELD[type] : { label: 'מה', placeholder: 'רופא שיניים', hint: '' };

  return (
    <View style={[styles.screen, { backgroundColor: palette.paper, paddingTop: insets.top + 12 }]}>
      <View style={styles.topBar}>
        <TopButton label="ביטול" onPress={onClose} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={[styles.big, { color: palette.ink }]}>{editing ? 'עריכה' : 'חדש'}</Text>
        <View style={{ marginTop: 14 }}>
          <Row label="סוג" value={isEvent ? TYPE_LABEL[type] : 'תזכורת'} onPress={() => setSheet('type')} />
        </View>

        <Text style={[styles.label, { color: palette.muted }]}>{nameField.label}</Text>
        <TextInput
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            clearError();
          }}
          placeholder={nameField.placeholder}
          placeholderTextColor={palette.muted}
          style={[styles.input, { color: palette.ink, borderBottomColor: error && !title.trim() ? palette.red : palette.line }]}
          textAlign="right"
          returnKeyType="done"
        />
        {isEvent ? (
          error ? (
            <Text style={[styles.note, { color: palette.red }]}>{error}</Text>
          ) : (
            <Text style={[styles.note, { color: palette.sun }]}>{title.trim() ? previewLine(draftEvent, today) : nameField.hint}</Text>
          )
        ) : null}

        {isEvent && type === 'other' ? (
          <View style={[styles.row, { borderBottomColor: palette.lineSoft, marginTop: 10 }]}>
            <Text style={[styles.rowText, { color: palette.ink }]}>להראות כמה שנים</Text>
            <Switch value={showYears} onValueChange={setShowYears} trackColor={{ true: palette.sun, false: palette.line }} thumbColor="#fff" />
          </View>
        ) : null}

        {isEvent ? (
          <>
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
              hebrewFields
            )}
            <View style={{ marginTop: 14 }}>
              <Row label="מתי להזכיר" value={REMINDER_LABEL[eventReminder]} onPress={() => setSheet('eventReminder')} />
            </View>
            {eventThisYear ? (
              <Text style={[styles.small, styles.footer, { color: palette.muted }]}>
                השנה: {new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(eventThisYear.greg())}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Text style={[styles.label, { color: palette.muted }]}>תאריך עברי</Text>
            {hebrewFields}
            {error ? (
              <Text style={[styles.note, { color: palette.red }]}>{error}</Text>
            ) : warning ? (
              <Text style={[styles.note, { color: palette.red }]}>{warning}</Text>
            ) : null}

            <Text style={[styles.label, { color: palette.muted }]}>שעה</Text>
            <TextInput
              value={allDay ? 'כל היום' : timeText}
              onChangeText={(t) => {
                setAllDay(false);
                setTimeText(maskTime(t));
                setTimeError(false);
              }}
              // The mask adds ':' by itself; on Android the cursor then stays before it and the next
              // digit lands in the wrong place ('2010' became '20:01'). Typing always goes at the end.
              selection={allDay ? undefined : { start: timeText.length, end: timeText.length }}
              onFocus={() => {
                if (allDay) {
                  setAllDay(false);
                  setTimeText('');
                }
              }}
              keyboardType="number-pad"
              maxLength={7}
              placeholder="10:30"
              placeholderTextColor={palette.muted}
              style={[styles.time, { color: palette.ink, borderBottomColor: timeError ? palette.red : palette.ink }]}
              textAlign="right"
              accessibilityLabel="שעה"
            />
            {timeError ? <Text style={[styles.note, { color: palette.red }]}>{ERR.time}</Text> : null}
            <View style={styles.shortcuts}>
              {[...TIME_SHORTCUTS, null].map((t) => {
                const on = t === null ? allDay : !allDay && timeText === t;
                return (
                  <Pressable
                    key={t ?? 'all'}
                    onPress={() => pickTime(t)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.shortcut, { borderColor: palette.line }, on && { backgroundColor: palette.ink, borderColor: palette.ink }]}
                  >
                    <Text style={[styles.shortcutText, { color: on ? palette.paper : palette.inkSoft }]}>{t ?? 'כל היום'}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ marginTop: 10 }}>
              <Row label="חוזר" value={REPEAT_LABEL[repeat]} onPress={() => setSheet('repeat')} />
              <Row label="מתי להזכיר" value={alertLabel(shownAlert)} onPress={() => setSheet('alert')} />
            </View>
            {reminderShown ? <Text style={[styles.small, styles.footer, { color: palette.muted }]}>{gregorianLine(reminderShown)}</Text> : null}
          </>
        )}
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
      {sheet === 'alert' ? (
        <AlertSheet
          visible
          time={allDay ? null : timeText || '00:00'}
          selected={shownAlert}
          onSelect={setAlert}
          onClose={() => setSheet(null)}
        />
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
  body: { paddingHorizontal: 24, paddingBottom: 40 },
  big: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 44, marginTop: 18 },
  note: { fontFamily: fonts.sans, fontSize: 12, marginTop: 6 },
  small: { fontFamily: fonts.sans, fontSize: 13 },
  label: { fontFamily: fonts.sans, fontSize: 12, marginTop: 22, marginBottom: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  input: { fontFamily: fonts.serif, fontSize: 20, borderBottomWidth: 1, paddingVertical: 6 },
  time: { alignSelf: 'flex-start', minWidth: 90, fontFamily: fonts.serif, fontSize: 26, borderBottomWidth: 1.5, paddingVertical: 2 },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  shortcut: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 5 },
  shortcutText: { fontFamily: fonts.sans, fontSize: 13 },
  fields: { flexDirection: 'row', gap: 14 },
  chip: { borderBottomWidth: 1, paddingVertical: 6, paddingHorizontal: 2 },
  chipText: { fontFamily: fonts.serif, fontSize: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  rowText: { fontFamily: fonts.sans, fontSize: 15 },
  footer: { textAlign: 'center', marginTop: 28 },
});
