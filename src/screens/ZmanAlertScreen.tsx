import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OptionSheet } from '@/components/OptionSheet';
import { ZmanAlertSheet } from '@/components/ZmanAlertSheet';
import { useSettings } from '@/data/useSettings';
import { useZmanAlerts } from '@/data/useZmanAlerts';
import { useNow } from '@/lib/useNow';
import { DEFAULT_ZMAN_MINUTES, nextAlertsLine, ZMAN_ALERT_ERROR, ZMAN_OPTIONS, zmanAlertWhen } from '@/lib/zmanimAlerts';
import { ZMAN_LABEL, type ZmanKey } from '@/lib/zmanimFull';
import { fonts, usePalette } from '@/theme/tokens';

type Props = { onBack: () => void };

/**
 * "התראה יומית" (PLAN.md "תזכורת לזמנים", approved mockup ג): opened from "+ התראה לפני שקיעה ועוד"
 * at the bottom of the Zmanim tab. Choosing a zman that already has an alert shows (and replaces) its time.
 */
export function ZmanAlertScreen({ onBack }: Props) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { city, il } = useSettings();
  const { alerts, save } = useZmanAlerts();
  const minutesFor = (key: ZmanKey) => alerts.find((a) => a.zman === key)?.minutesBefore ?? DEFAULT_ZMAN_MINUTES;
  const [zman, setZman] = useState<ZmanKey>('sunset');
  const [minutes, setMinutes] = useState(() => minutesFor('sunset'));
  const [sheet, setSheet] = useState<null | 'zman' | 'when'>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = nextAlertsLine({ now, zman, minutesBefore: minutes, city, il });

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await save(zman, minutes);
      onBack();
    } catch {
      setError(ZMAN_ALERT_ERROR);
      setSaving(false);
    }
  };

  const Row = ({ label, value, onPress }: { label: string; value: string; onPress: () => void }) => (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.row, { borderBottomColor: palette.lineSoft }]}>
      <Text style={[styles.rowText, { color: palette.ink }]}>{label}</Text>
      <Text style={[styles.rowText, { color: palette.ink }]}>{`${value} ›`}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.screen, { backgroundColor: palette.paper, paddingTop: insets.top + 12 }]}>
      <Pressable onPress={onBack} accessibilityRole="button" hitSlop={12} style={styles.back}>
        <Text style={[styles.backText, { color: palette.muted }]}>‹ זמנים</Text>
      </Pressable>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
        <Text style={[styles.title, { color: palette.ink }]}>התראה יומית</Text>
        <Text style={[styles.subtitle, { color: palette.muted }]}>התראה כל יום, לפני זמן שבוחרים</Text>
        <View style={styles.rows}>
          <Row label="זמן" value={ZMAN_LABEL[zman]} onPress={() => setSheet('zman')} />
          <Row label="מתי להזכיר" value={zmanAlertWhen(minutes)} onPress={() => setSheet('when')} />
        </View>
        {next ? <Text style={[styles.next, { color: palette.sun }]}>{next}</Text> : null}
        <Text style={[styles.note, { color: palette.muted }]}>לא נשלחת בשבת ובחג</Text>
        {error ? <Text style={[styles.note, { color: palette.red }]}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.saveBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={submit}
          disabled={saving}
          accessibilityRole="button"
          style={[styles.saveButton, { backgroundColor: palette.ink, opacity: saving ? 0.6 : 1 }]}
        >
          <Text style={[styles.saveText, { color: palette.paper }]}>שמירה</Text>
        </Pressable>
      </View>

      {sheet === 'zman' ? (
        <OptionSheet
          visible
          title="זמן"
          options={ZMAN_OPTIONS}
          selected={zman}
          onSelect={(key) => {
            setZman(key);
            setMinutes(minutesFor(key));
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
      {sheet === 'when' ? (
        <ZmanAlertSheet
          visible
          title="מתי להזכיר"
          selected={minutes}
          onSave={setMinutes}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  back: { paddingHorizontal: 24 },
  backText: { fontFamily: fonts.sans, fontSize: 15 },
  body: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 40 },
  title: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 44 },
  subtitle: { fontFamily: fonts.sans, fontSize: 13, marginTop: 4 },
  rows: { marginTop: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  rowText: { fontFamily: fonts.sans, fontSize: 15 },
  next: { fontFamily: fonts.sans, fontSize: 14, marginTop: 14 },
  note: { fontFamily: fonts.sans, fontSize: 12, marginTop: 4 },
  saveBar: { paddingHorizontal: 24, paddingTop: 8 },
  saveButton: { alignItems: 'center', paddingVertical: 14, borderRadius: 26 },
  saveText: { fontFamily: fonts.sans, fontSize: 16 },
});
