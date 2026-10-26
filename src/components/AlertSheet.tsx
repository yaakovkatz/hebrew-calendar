import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ALERT_UNITS,
  alertLabel,
  alertPresets,
  customAlert,
  sameAlert,
  splitAlert,
  type AlertUnit,
  type ReminderAlert,
} from '@/lib/reminders';
import { fonts, usePalette } from '@/theme/tokens';

type Props = {
  visible: boolean;
  /** The reminder's time; without one only "בבוקר" and "יום לפני" make sense. */
  time: string | null;
  selected: ReminderAlert;
  onSelect: (alert: ReminderAlert) => void;
  onClose: () => void;
};

/**
 * Approved mockup 2: "מתי להזכיר" with the fixed rows, then "אחר: כמה זמן לפני?"
 * with a number and a unit (דקות · שעות · ימים). A valid custom value applies as it is typed.
 */
export function AlertSheet({ visible, time, selected, onSelect, onClose }: Props) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  // A percentage would resolve against the wrapper, which is only as tall as the sheet.
  const { height } = useWindowDimensions();
  const presets = alertPresets(time);
  const isPreset = presets.some((p) => sameAlert(p, selected));
  const initial = isPreset ? { amount: '', unit: 'minutes' as AlertUnit } : splitAlert(selected);
  const [amount, setAmount] = useState(initial.amount);
  const [unit, setUnit] = useState<AlertUnit>(initial.unit);

  const applyCustom = (nextAmount: string, nextUnit: AlertUnit) => {
    setAmount(nextAmount);
    setUnit(nextUnit);
    const alert = customAlert(nextAmount, nextUnit);
    if (alert) onSelect(alert);
  };

  return (
    <Modal visible={visible} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="סגירה" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { backgroundColor: palette.paper, maxHeight: height * 0.85, paddingBottom: insets.bottom + 18 }]}>
          <View style={[styles.handle, { backgroundColor: palette.line }]} />
          <Text style={[styles.title, { color: palette.muted }]}>מתי להזכיר</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            {presets.map((p) => {
              const on = sameAlert(p, selected);
              return (
                <Pressable
                  key={alertLabel(p)}
                  onPress={() => {
                    onSelect(p);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.row, { borderBottomColor: palette.lineSoft }, on && { backgroundColor: palette.today }]}
                >
                  <Text style={[styles.label, { color: palette.ink }]}>{alertLabel(p)}</Text>
                  <Text style={[styles.check, { color: palette.ink }]}>{on ? '✓' : ''}</Text>
                </Pressable>
              );
            })}

            {time ? (
              <View style={styles.custom}>
                <Text style={[styles.label, { color: palette.ink }]}>אחר: כמה זמן לפני?</Text>
                <View style={styles.customRow}>
                  <TextInput
                    value={amount}
                    onChangeText={(t) => applyCustom(t.replace(/\D/g, '').slice(0, 4), unit)}
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholder="1"
                    placeholderTextColor={palette.muted}
                    style={[styles.amount, { color: palette.ink, borderBottomColor: palette.ink }]}
                    textAlign="center"
                    accessibilityLabel="כמה זמן לפני"
                  />
                  <View style={[styles.segment, { borderColor: palette.line }]}>
                    {ALERT_UNITS.map((u) => {
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
              </View>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0006' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20 },
  handle: { alignSelf: 'center', width: 34, height: 3, borderRadius: 2, marginTop: 10, marginBottom: 10 },
  title: { fontFamily: fonts.sans, fontSize: 12, marginBottom: 4 },
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
  custom: { paddingTop: 14, paddingHorizontal: 8 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  amount: { width: 60, fontFamily: fonts.serif, fontSize: 22, borderBottomWidth: 1.5, paddingVertical: 2 },
  segment: { flex: 1, flexDirection: 'row', borderWidth: 1, borderRadius: 16, padding: 2 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 14 },
  segmentText: { fontFamily: fonts.sans, fontSize: 13 },
});
