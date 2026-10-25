import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OptionSheet } from '@/components/OptionSheet';
import { candleLightingLabel, HOLIDAYS_LABEL, OPEN_ON_LABEL, type OpenOn } from '@/data/settings';
import { useSettings } from '@/data/useSettings';
import { fonts, usePalette } from '@/theme/tokens';
import { CityPickerScreen } from './CityPickerScreen';

type Sheet = null | 'holidays' | 'openOn';

const HOLIDAY_OPTIONS = [
  { value: true, label: HOLIDAYS_LABEL.il },
  { value: false, label: HOLIDAYS_LABEL.diaspora },
];
const OPEN_ON_OPTIONS: { value: OpenOn; label: string }[] = [
  { value: 'month', label: OPEN_ON_LABEL.month },
  { value: 'day', label: OPEN_ON_LABEL.day },
];

/** Approved mockup "הגדרות": big title, plain rows, details behind "›". */
type Props = { onOpenAbout: () => void; onOpenPrint: () => void; onOpenBatteryHelp: () => void };

export function SettingsScreen({ onOpenAbout, onOpenPrint, onOpenBatteryHelp }: Props) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const s = useSettings();
  const [picking, setPicking] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);

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
    <View style={{ flex: 1, backgroundColor: palette.paper }}>
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: insets.top + 30 }]}>
        <Text style={[styles.big, { color: palette.ink }]}>הגדרות</Text>
        <View style={[styles.rule, { backgroundColor: palette.line }]} />

        <Row label="מיקום" value={`${s.city.name} ›`} onPress={() => setPicking(true)} />
        <Row label="הדלקת נרות" value={candleLightingLabel(s.city)} />
        <Row label="חגים לפי" value={`${s.il ? HOLIDAYS_LABEL.il : HOLIDAYS_LABEL.diaspora} ›`} onPress={() => setSheet('holidays')} />
        <Row
          label="הצגת אירועים בלוח"
          value={
            <Switch
              value={s.showEventsInCalendar}
              onValueChange={s.setShowEventsInCalendar}
              trackColor={{ true: palette.sun, false: palette.line }}
              thumbColor="#fff"
              accessibilityLabel="הצגת אירועים בלוח"
            />
          }
        />
        <Row label="פתיחה במסך" value={`${OPEN_ON_LABEL[s.openOn]} ›`} onPress={() => setSheet('openOn')} />
        <Row label="לוח קיר להדפסה" value="›" onPress={onOpenPrint} />
        <Row label="התראות בזמן" value="›" onPress={onOpenBatteryHelp} />
        <Row label="אודות" value="›" onPress={onOpenAbout} last />

        <Text style={[styles.note, { color: palette.muted }]}>הזמנים לעיון. בשאלה הלכתית פנו&nbsp;לרב.</Text>
      </ScrollView>

      {sheet === 'holidays' ? (
        <OptionSheet visible title="חגים לפי" options={HOLIDAY_OPTIONS} selected={s.il} onSelect={s.setIl} onClose={() => setSheet(null)} />
      ) : null}
      {sheet === 'openOn' ? (
        <OptionSheet visible title="פתיחה במסך" options={OPEN_ON_OPTIONS} selected={s.openOn} onSelect={s.setOpenOn} onClose={() => setSheet(null)} />
      ) : null}
      {picking ? <CityPickerScreen onClose={() => setPicking(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 24, paddingBottom: 40 },
  big: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 44 },
  rule: { height: 1, marginTop: 18, marginBottom: 4 },
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
  note: { fontFamily: fonts.sans, fontSize: 12, textAlign: 'center', marginTop: 36 },
});
