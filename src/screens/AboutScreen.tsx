import Constants from 'expo-constants';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, usePalette } from '@/theme/tokens';

const REPO_URL = 'https://github.com/yaakovkatz/hebrew-calendar';
const PRIVACY_URL = 'https://github.com/yaakovkatz/hebrew-calendar/blob/main/docs/privacy.md';

type Props = { onBack: () => void; onOpenLicenses: () => void; onOpenContact: () => void };

/** Approved design: icon, name, version; GitHub, licenses, privacy, contact; a halachic note. */
export function AboutScreen({ onBack, onOpenLicenses, onOpenContact }: Props) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version;

  const rows: [string, () => void][] = [
    ['קוד פתוח ב-GitHub', () => Linking.openURL(REPO_URL).catch(() => {})],
    ['רישיונות', onOpenLicenses],
    ['מדיניות פרטיות', () => Linking.openURL(PRIVACY_URL).catch(() => {})],
    ['יצירת קשר', onOpenContact],
  ];

  return (
    <View style={[styles.screen, { backgroundColor: palette.paper, paddingTop: insets.top + 12 }]}>
      <Pressable onPress={onBack} accessibilityRole="button" hitSlop={12} style={styles.back}>
        <Text style={[styles.backText, { color: palette.muted }]}>‹ הגדרות</Text>
      </Pressable>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <Image source={require('../../assets/icon.png')} style={styles.icon} accessibilityIgnoresInvertColors />
          <Text style={[styles.name, { color: palette.ink }]}>לוח יהודי</Text>
          {version ? <Text style={[styles.small, { color: palette.muted }]}>גרסה {version}</Text> : null}
        </View>

        <View style={[styles.divider, { backgroundColor: palette.line }]} />
        {rows.map(([label, onPress], i) => (
          <Pressable
            key={label}
            onPress={onPress}
            accessibilityRole="button"
            style={[styles.row, i < rows.length - 1 && { borderBottomColor: palette.lineSoft, borderBottomWidth: 1 }]}
          >
            <Text style={[styles.rowLabel, { color: palette.ink }]}>{label}</Text>
            <Text style={[styles.chevron, { color: palette.muted }]}>›</Text>
          </Pressable>
        ))}

        <Text style={[styles.note, { color: palette.muted }]}>
          {'הזמנים לעיון בלבד, לפי שיטת הגר״א.\nבשאלה הלכתית פנו לרב.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  back: { paddingHorizontal: 24 },
  backText: { fontFamily: fonts.sans, fontSize: 15 },
  body: { paddingHorizontal: 24, paddingTop: 22 },
  header: { alignItems: 'center' },
  icon: { width: 72, height: 72, borderRadius: 18 },
  name: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 40, marginTop: 10 },
  small: { fontFamily: fonts.sans, fontSize: 12 },
  divider: { height: 1, marginTop: 22, marginBottom: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  rowLabel: { fontFamily: fonts.serif, fontSize: 17 },
  chevron: { fontFamily: fonts.sans, fontSize: 18 },
  note: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 24 },
});
