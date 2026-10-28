import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { noOrphan } from '@/lib/text';
import { fonts, usePalette } from '@/theme/tokens';
import { TopButton } from '@/components/TopButton';

// Short steps; menu names differ a little between phone versions.
const SECTIONS: { title: string; steps: string[] }[] = [
  {
    title: 'שיאומי',
    steps: ['חיסכון בסוללה › ללא הגבלות', 'הפעלה אוטומטית › להפעיל'],
  },
  {
    title: 'סמסונג',
    steps: ['סוללה › ללא הגבלה', 'להוציא מרשימת אפליקציות במצב שינה'],
  },
  {
    title: 'כל טלפון',
    steps: ['התראות › מותרות', 'שעונים מעוררים ותזכורות › מותר'],
  },
];

/** Battery-saver help (PLAN.md): plain rows and one link to the app's settings. */
export function BatteryHelpScreen({ onBack }: { onBack: () => void }) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: palette.paper, paddingTop: insets.top + 12 }]}>
      <View style={styles.back}>
        <TopButton label="‹ הגדרות" onPress={onBack} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.title, { color: palette.ink }]}>התראות בזמן</Text>
        <Text style={[styles.intro, { color: palette.inkSoft }]}>
          {noOrphan('חיסכון בסוללה עלול לעכב התראות. כדאי לאשר את אלה בהגדרות האפליקציה:')}
        </Text>
        <View style={[styles.divider, { backgroundColor: palette.line }]} />
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.muted }]}>{section.title}</Text>
            {section.steps.map((step, i) => (
              <View
                key={step}
                style={[styles.row, i < section.steps.length - 1 && { borderBottomColor: palette.lineSoft, borderBottomWidth: 1 }]}
              >
                <Text style={[styles.rowLabel, { color: palette.ink }]}>{noOrphan(step)}</Text>
              </View>
            ))}
          </View>
        ))}
        <Pressable
          onPress={() => Linking.openSettings().catch(() => {})}
          accessibilityRole="button"
          style={[styles.button, { backgroundColor: palette.ink }]}
        >
          <Text style={[styles.buttonText, { color: palette.paper }]}>פתיחת הגדרות האפליקציה</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  back: { paddingHorizontal: 24 },
  body: { paddingHorizontal: 24, paddingTop: 22 },
  title: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 44 },
  intro: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, marginTop: 8 },
  divider: { height: 1, marginTop: 16, marginBottom: 6 },
  section: { marginTop: 14 },
  sectionTitle: { fontFamily: fonts.sans, fontSize: 12, marginBottom: 2 },
  row: { paddingVertical: 12 },
  rowLabel: { fontFamily: fonts.serif, fontSize: 16 },
  button: { alignItems: 'center', paddingVertical: 14, borderRadius: 26, marginTop: 28 },
  buttonText: { fontFamily: fonts.sans, fontSize: 16 },
});
