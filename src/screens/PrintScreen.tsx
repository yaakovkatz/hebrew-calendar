import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { OptionSheet } from '@/components/OptionSheet';
import { useEvents } from '@/data/useEvents';
import { useSettings } from '@/data/useSettings';
import { clampHebrew, hebrewMonthOptions } from '@/lib/datePicking';
import { hebrewDateAt } from '@/lib/hebrewDay';
import { hebrewMonthName, yearLabel } from '@/lib/month';
import { A4_POINTS, buildCalendarHtml, PRINT_ERROR, type PrintInclude, type PrintScope } from '@/lib/printCalendar';
import { loadPrintFonts } from '@/lib/printFonts';
import { fonts, usePalette } from '@/theme/tokens';
import { TopButton } from '@/components/TopButton';

const CHECKS: { key: keyof PrintInclude; label: string }[] = [
  { key: 'holidays', label: 'חגים ומועדים' },
  { key: 'parsha', label: 'פרשת השבוע' },
  { key: 'family', label: 'ימי המשפחה' },
  { key: 'candles', label: 'הדלקת נרות' },
];

type ScopeKind = PrintScope['kind'];

const SCOPES: { kind: ScopeKind; label: string }[] = [
  { kind: 'year', label: 'כל השנה' },
  { kind: 'month', label: 'חודש אחד' },
];

const TITLE_PREFIX = 'משפחת ';

/** "משפחת" alone (nothing typed after it) prints no title. */
function printedTitle(title: string): string {
  const t = title.trim();
  return t === TITLE_PREFIX.trim() ? '' : t;
}

/** Approved mockup "לוח קיר להדפסה": details, what to print, one dark button. */
export function PrintScreen({ onBack }: { onBack: () => void }) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const { events } = useEvents();

  const today = useMemo(() => hebrewDateAt(new Date(), settings.city), [settings.city]);
  const currentYear = today.getFullYear();
  const yearOptions = useMemo(
    () =>
      [currentYear, currentYear + 1, currentYear + 2].map((y) => ({
        value: y,
        label: `${yearLabel(y)} (${y - 3761}/${String(y - 3760).slice(-2)})`,
      })),
    [currentYear],
  );

  const [year, setYear] = useState(currentYear);
  const [title, setTitle] = useState(TITLE_PREFIX);
  const [include, setInclude] = useState<PrintInclude>({ holidays: true, parsha: true, family: true, candles: false });
  const [scopeKind, setScopeKind] = useState<ScopeKind>('year');
  const [month, setMonth] = useState(today.getMonth());
  const [picking, setPicking] = useState<'year' | 'month' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);

  // Any change makes the last PDF stale.
  const change = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setFileUri(null);
    setError(null);
  };

  // Adar II doesn't exist in a regular year: it becomes Adar.
  const printMonth = clampHebrew(1, month, year).month;
  const monthOptions = useMemo(() => hebrewMonthOptions(year), [year]);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const html = buildCalendarHtml({
        hebrewYear: year,
        scope: scopeKind === 'month' ? { kind: 'month', month: printMonth } : { kind: 'year' },
        title: printedTitle(title),
        il: settings.il,
        city: settings.city,
        include,
        events,
        fonts: await loadPrintFonts(),
      });
      const { uri } = await Print.printToFileAsync({ html, ...A4_POINTS });
      setFileUri(uri);
    } catch {
      setError(PRINT_ERROR);
    } finally {
      setBusy(false);
    }
  };

  const print = async () => {
    if (!fileUri) return;
    try {
      await Print.printAsync({ uri: fileUri });
    } catch {
      setError(PRINT_ERROR);
    }
  };

  const share = async () => {
    if (!fileUri) return;
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');
      await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'לוח קיר' });
    } catch {
      setError(PRINT_ERROR);
    }
  };

  const Row = ({ label, value, onPress, last }: { label: string; value?: ReactNode; onPress?: () => void; last?: boolean }) => {
    const content = (
      <>
        <Text style={[styles.rowText, { color: palette.ink }]}>{label}</Text>
        {typeof value === 'string' ? <Text style={[styles.value, { color: palette.muted }]}>{value}</Text> : value}
      </>
    );
    const style = [styles.row, { borderBottomColor: palette.lineSoft }, last && styles.noBorder];
    return onPress ? (
      <Pressable onPress={onPress} accessibilityRole="button" style={style}>
        {content}
      </Pressable>
    ) : (
      <View style={style}>{content}</View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.paper, paddingTop: insets.top + 12 }]}>
      <View style={styles.back}>
        <TopButton label="‹ הגדרות" onPress={onBack} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={[styles.big, { color: palette.ink }]}>לוח קיר</Text>
        <Text style={[styles.sub, { color: palette.muted }]}>להדפסה או לתלייה במטבח</Text>

        <Text style={[styles.label, { color: palette.muted }]}>מה להדפיס</Text>
        <View style={[styles.segment, { borderColor: palette.line }]} accessibilityRole="radiogroup">
          {SCOPES.map(({ kind, label }) => {
            const on = scopeKind === kind;
            return (
              <Pressable
                key={kind}
                onPress={() => change(setScopeKind)(kind)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={[styles.segmentItem, on && { backgroundColor: palette.ink }]}
              >
                <Text style={[styles.segmentText, { color: on ? palette.paper : palette.muted }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        {scopeKind === 'month' ? (
          <Row label="חודש" value={`${hebrewMonthName(printMonth, year)} ${yearLabel(year)} ›`} onPress={() => setPicking('month')} last />
        ) : null}

        <Text style={[styles.label, { color: palette.muted }]}>פרטים</Text>
        <Row label="שנה" value={`${yearLabel(year)} ›`} onPress={() => setPicking('year')} />
        {/* Not via Row: Row is re-created each render and would remount the input. */}
        <View style={[styles.row, { borderBottomColor: palette.lineSoft }]}>
          <Text style={[styles.rowText, { color: palette.ink }]}>כותרת</Text>
          <TextInput
            value={title}
            onChangeText={change(setTitle)}
            placeholder="משפחת …"
            placeholderTextColor={palette.muted}
            maxLength={40}
            accessibilityLabel="כותרת"
            style={[styles.input, { color: palette.ink }]}
          />
        </View>
        <Row label="גודל" value="A4" last />

        <Text style={[styles.label, { color: palette.muted }]}>מה יודפס</Text>
        {CHECKS.map(({ key, label }, i) => (
          <Pressable
            key={key}
            onPress={() => change(setInclude)({ ...include, [key]: !include[key] })}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: include[key] }}
            style={[styles.row, { borderBottomColor: palette.lineSoft }, i === CHECKS.length - 1 && styles.noBorder]}
          >
            <Text style={[styles.rowText, { color: palette.ink }]}>{label}</Text>
            <Text style={[styles.check, { color: palette.ink }]}>{include[key] ? '✓' : ''}</Text>
          </Pressable>
        ))}

        {error ? <Text style={[styles.error, { color: palette.red }]}>{error}</Text> : null}

        {fileUri ? (
          <View style={styles.actions}>
            <Pressable onPress={print} accessibilityRole="button" style={[styles.button, styles.half, { backgroundColor: palette.ink }]}>
              <Text style={[styles.buttonText, { color: palette.paper }]}>הדפסה</Text>
            </Pressable>
            <Pressable
              onPress={share}
              accessibilityRole="button"
              style={[styles.button, styles.half, styles.outline, { borderColor: palette.ink }]}
            >
              <Text style={[styles.buttonText, { color: palette.ink }]}>שיתוף</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={create}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ busy }}
          style={[styles.button, { backgroundColor: palette.ink }, busy && styles.dim]}
        >
          {busy ? <ActivityIndicator color={palette.paper} /> : <Text style={[styles.buttonText, { color: palette.paper }]}>{scopeKind === 'month' ? 'יצירת PDF · עמוד אחד' : 'יצירת PDF'}</Text>}
        </Pressable>
      </View>

      {picking === 'year' ? (
        <OptionSheet
          visible
          title="שנה"
          options={yearOptions}
          selected={year}
          onSelect={change(setYear)}
          onClose={() => setPicking(null)}
        />
      ) : null}
      {picking === 'month' ? (
        <OptionSheet
          visible
          title="חודש"
          options={monthOptions}
          selected={printMonth}
          onSelect={change(setMonth)}
          onClose={() => setPicking(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  back: { paddingHorizontal: 24 },
  body: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 24 },
  big: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 44 },
  sub: { fontFamily: fonts.sans, fontSize: 14, marginTop: 2 },
  label: { fontFamily: fonts.sans, fontSize: 12, marginTop: 28, marginBottom: 2 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 54,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  noBorder: { borderBottomWidth: 0 },
  rowText: { fontFamily: fonts.sans, fontSize: 16 },
  value: { fontFamily: fonts.sans, fontSize: 14 },
  input: { fontFamily: fonts.sans, fontSize: 14, minWidth: 140, paddingVertical: 4 },
  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 2, marginTop: 6, marginBottom: 4 },
  segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 12 },
  segmentText: { fontFamily: fonts.sans, fontSize: 14 },
  check: { fontFamily: fonts.sans, fontSize: 16 },
  error: { fontFamily: fonts.sans, fontSize: 14, textAlign: 'center', marginTop: 20 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  footer: { paddingHorizontal: 24, paddingTop: 8 },
  button: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  half: { flex: 1 },
  outline: { borderWidth: 1.5 },
  dim: { opacity: 0.7 },
  buttonText: { fontFamily: fonts.sansMedium, fontSize: 16 },
});
