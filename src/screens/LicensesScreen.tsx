import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LICENSES } from '@/lib/licenses';
import { fonts, usePalette } from '@/theme/tokens';
import { TopButton } from '@/components/TopButton';

/** Approved design: plain rows, name on the right and license on the left. */
export function LicensesScreen({ onBack }: { onBack: () => void }) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: palette.paper, paddingTop: insets.top + 12 }]}>
      <View style={styles.back}>
        <TopButton label="‹ אודות" onPress={onBack} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.title, { color: palette.ink }]}>רישיונות</Text>
        <View style={[styles.divider, { backgroundColor: palette.line }]} />
        {LICENSES.map((item, i) => (
          <Pressable
            key={item.name}
            onPress={() => Linking.openURL(item.url).catch(() => {})}
            accessibilityRole="link"
            style={[styles.row, i < LICENSES.length - 1 && { borderBottomColor: palette.lineSoft, borderBottomWidth: 1 }]}
          >
            <Text style={[styles.rowLabel, { color: palette.ink }]}>{item.name}</Text>
            <Text style={[styles.rowValue, { color: palette.muted }]}>{item.license} ›</Text>
          </Pressable>
        ))}
        <Text style={[styles.note, { color: palette.muted }]}>לחיצה על שורה פותחת את נוסח הרישיון המלא.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  back: { paddingHorizontal: 24 },
  body: { paddingHorizontal: 24, paddingTop: 22 },
  title: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 44 },
  divider: { height: 1, marginTop: 16, marginBottom: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, paddingVertical: 13 },
  rowLabel: { flexShrink: 1, fontFamily: fonts.serif, fontSize: 16 },
  rowValue: { fontFamily: fonts.sans, fontSize: 13, textAlign: 'left' },
  note: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 19, marginTop: 16 },
});
