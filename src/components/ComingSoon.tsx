import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, usePalette } from '@/theme/tokens';

/** Placeholder for tabs that later stage-1 steps fill in. */
export function ComingSoon({ title, note }: { title: string; note: string }) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 40 }]}>
      <Text style={[styles.title, { color: palette.ink }]}>{title}</Text>
      <Text style={[styles.note, { color: palette.muted }]}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 24 },
  title: { fontFamily: fonts.serif, fontSize: 34 },
  note: { fontFamily: fonts.sans, fontSize: 13, marginTop: 4 },
});
