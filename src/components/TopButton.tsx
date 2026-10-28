import { Pressable, StyleSheet, Text } from 'react-native';
import { fonts, usePalette } from '@/theme/tokens';

type Props = { label: string; onPress: () => void };

/**
 * Approved 28.10.2026 (option ב): "ביטול" / "‹ אירועים" at the top as an outlined pill,
 * in ink instead of small grey text.
 */
export function TopButton({ label, onPress }: Props) {
  const palette = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={10}
      style={({ pressed }) => [styles.pill, { borderColor: palette.line }, pressed && { backgroundColor: palette.lineSoft }]}
    >
      <Text style={[styles.text, { color: palette.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 6 },
  text: { fontFamily: fonts.sans, fontSize: 14 },
});
