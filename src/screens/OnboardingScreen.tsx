import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gematriya, HDate } from '@hebcal/core';
import { useSettings } from '@/data/useSettings';
import { fonts, usePalette } from '@/theme/tokens';
import { CityPickerScreen } from './CityPickerScreen';

/** First run: the cover ("פתיחה"), then the city ("מיקום"). Picking a city finishes. */
export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useSettings();
  const [step, setStep] = useState<'cover' | 'city'>('cover');
  // Cover label only; a few hours' drift before sunset does not matter here.
  const year = gematriya(new HDate().getFullYear() % 1000);

  const back = useCallback(() => setStep('cover'), []);
  const finish = useCallback(() => {
    completeOnboarding();
    onDone();
  }, [completeOnboarding, onDone]);

  if (step === 'city') {
    return <CityPickerScreen onClose={back} onPick={finish} closeLabel="‹ חזרה" stepLabel="שלב 1 מתוך 1" />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.paper, paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.center}>
        <Text style={[styles.year, { color: palette.muted }]}>{year}</Text>
        <Text style={[styles.title, { color: palette.ink }]}>לוח יהודי</Text>
        <Text style={[styles.ornament, { color: palette.red }]}>✦</Text>
        <Text style={[styles.lines, { color: palette.muted }]}>
          {'תאריכים עבריים, זמני היום,\nוכל הימים שחשוב לזכור'}
        </Text>
      </View>
      <Pressable
        onPress={() => setStep('city')}
        accessibilityRole="button"
        style={[styles.button, { backgroundColor: palette.ink }]}
      >
        <Text style={[styles.buttonText, { color: palette.paper }]}>מתחילים</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, paddingHorizontal: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  year: { fontFamily: fonts.sans, fontSize: 13, letterSpacing: 3 },
  title: { fontFamily: fonts.serif, fontSize: 52, lineHeight: 62, marginTop: 8 },
  ornament: { fontSize: 16, marginTop: 20, marginBottom: 16 },
  lines: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 24, textAlign: 'center' },
  button: { alignItems: 'center', paddingVertical: 14, borderRadius: 26 },
  buttonText: { fontFamily: fonts.sans, fontSize: 16 },
});
