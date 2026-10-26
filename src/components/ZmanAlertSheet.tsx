import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { noOrphan } from '@/lib/text';
import { customZmanMinutes, ZMAN_ALERT_PRESETS, zmanAlertWhen } from '@/lib/zmanimAlerts';
import { fonts, usePalette } from '@/theme/tokens';

type Unit = 'minutes' | 'hours';
const UNITS: { value: Unit; label: string }[] = [
  { value: 'minutes', label: 'דקות' },
  { value: 'hours', label: 'שעות' },
];

type Props = {
  visible: boolean;
  /** 'להזכיר לפני שקיעה', or 'מתי להזכיר' on the "התראה יומית" page. */
  title: string;
  /** 'היום 16:51 · ירושלים' */
  subtitle?: string;
  /** Minutes before; null when the zman has no alert yet (15 is marked). */
  selected: number | null;
  /**
   * With actions (approved mockup ב): rows only mark a choice, and "שמירה" / "בלי התראה" act.
   * Without (the "התראה יומית" page): a row picks and closes, like AlertSheet.
   */
  onSave: (minutes: number) => void;
  onRemove?: () => void;
  onClose: () => void;
};

/** A small bell like in the approved mockup, for a zman that has an alert. */
export function Bell({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zM18 16V11a6 6 0 0 0-12 0v5l-2 2h16z" />
    </Svg>
  );
}

function splitMinutes(m: number): { amount: string; unit: Unit } {
  return m % 60 === 0 ? { amount: String(m / 60), unit: 'hours' } : { amount: String(m), unit: 'minutes' };
}

/**
 * "להזכיר לפני <זמן>" (PLAN.md "תזכורת לזמנים", approved mockup ב):
 * בזמן · 5 · 15 · 30 דק׳ · שעה לפני · אחר… (minutes or hours), every day except Shabbat and Yom Tov.
 */
export function ZmanAlertSheet({ visible, title, subtitle, selected, onSave, onRemove, onClose }: Props) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  // A percentage would resolve against the wrapper, which is only as tall as the sheet.
  const { height } = useWindowDimensions();
  const withActions = !!onRemove;
  const start = selected ?? 15;
  const startIsPreset = ZMAN_ALERT_PRESETS.includes(start);
  const [choice, setChoice] = useState<number | null>(startIsPreset ? start : null);
  const [customOpen, setCustomOpen] = useState(!startIsPreset);
  const initial = startIsPreset ? { amount: '', unit: 'minutes' as Unit } : splitMinutes(start);
  const [amount, setAmount] = useState(initial.amount);
  const [unit, setUnit] = useState<Unit>(initial.unit);

  const custom = customOpen ? customZmanMinutes(amount, unit) : null;
  const chosen = customOpen ? custom : choice;

  const pickPreset = (m: number) => {
    setCustomOpen(false);
    setChoice(m);
    if (!withActions) {
      onSave(m);
      onClose();
    }
  };

  const applyCustom = (nextAmount: string, nextUnit: Unit) => {
    setAmount(nextAmount);
    setUnit(nextUnit);
    const m = customZmanMinutes(nextAmount, nextUnit);
    if (!withActions && m !== null) onSave(m);
  };

  const rowStyle = (on: boolean) => [styles.row, { borderBottomColor: palette.lineSoft }, on && { backgroundColor: palette.today }];

  return (
    <Modal visible={visible} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="סגירה" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { backgroundColor: palette.paper, maxHeight: height * 0.85, paddingBottom: insets.bottom + 18 }]}>
          <View style={[styles.handle, { backgroundColor: palette.line }]} />
          <Text style={[styles.title, { color: palette.ink }]}>{noOrphan(title)}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: palette.muted }]}>{subtitle}</Text> : null}
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.list}>
            {ZMAN_ALERT_PRESETS.map((m) => {
              const on = !customOpen && choice === m;
              return (
                <Pressable key={m} onPress={() => pickPreset(m)} accessibilityRole="button" accessibilityState={{ selected: on }} style={rowStyle(on)}>
                  <Text style={[styles.label, { color: palette.ink }]}>{zmanAlertWhen(m)}</Text>
                  <Text style={[styles.check, { color: palette.ink }]}>{on ? '✓' : ''}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={() => setCustomOpen(true)} accessibilityRole="button" accessibilityState={{ selected: customOpen }} style={rowStyle(customOpen)}>
              <Text style={[styles.label, { color: palette.ink }]}>{customOpen ? 'אחר: כמה זמן לפני?' : 'אחר…'}</Text>
              <Text style={[styles.check, { color: palette.ink }]}>{customOpen && custom !== null ? '✓' : ''}</Text>
            </Pressable>
            {customOpen ? (
              <View style={styles.customRow}>
                <TextInput
                  value={amount}
                  onChangeText={(t) => applyCustom(t.replace(/\D/g, '').slice(0, 3), unit)}
                  keyboardType="number-pad"
                  maxLength={3}
                  autoFocus={startIsPreset}
                  placeholder="10"
                  placeholderTextColor={palette.muted}
                  style={[styles.amount, { color: palette.ink, borderBottomColor: palette.ink }]}
                  textAlign="center"
                  accessibilityLabel="כמה זמן לפני"
                />
                <View style={[styles.segment, { borderColor: palette.line }]}>
                  {UNITS.map((u) => {
                    const on = u.value === unit;
                    return (
                      <Pressable
                        key={u.value}
                        onPress={() => applyCustom(amount, u.value)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        style={[styles.segmentItem, on && { backgroundColor: palette.ink }]}
                      >
                        <Text style={[styles.segmentText, { color: on ? palette.paper : palette.muted }]}>{u.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
            <Text style={[styles.note, { color: palette.muted }]}>כל יום, חוץ משבת וחג</Text>
          </ScrollView>

          {withActions ? (
            <View style={styles.actions}>
              <Pressable
                onPress={() => {
                  if (chosen === null) return;
                  onSave(chosen);
                  onClose();
                }}
                disabled={chosen === null}
                accessibilityRole="button"
                hitSlop={12}
                style={{ opacity: chosen === null ? 0.4 : 1 }}
              >
                <Text style={[styles.action, { color: palette.red }]}>שמירה</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onRemove?.();
                  onClose();
                }}
                accessibilityRole="button"
                hitSlop={12}
              >
                <Text style={[styles.action, { color: palette.muted }]}>בלי התראה</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0006' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20 },
  handle: { alignSelf: 'center', width: 34, height: 3, borderRadius: 2, marginTop: 10, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 30 },
  subtitle: { fontFamily: fonts.sans, fontSize: 12, marginTop: 2 },
  list: { marginTop: 8 },
  row: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  label: { fontFamily: fonts.serif, fontSize: 18 },
  check: { fontFamily: fonts.sans, fontSize: 15 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, paddingHorizontal: 8 },
  amount: { width: 60, fontFamily: fonts.serif, fontSize: 22, borderBottomWidth: 1.5, paddingVertical: 2 },
  segment: { flex: 1, flexDirection: 'row', borderWidth: 1, borderRadius: 16, padding: 2 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 14 },
  segmentText: { fontFamily: fonts.sans, fontSize: 13 },
  note: { fontFamily: fonts.sans, fontSize: 12, marginTop: 12, paddingHorizontal: 8 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 16 },
  action: { fontFamily: fonts.sans, fontSize: 16 },
});
