import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { fonts, usePalette } from '@/theme/tokens';
import { FADE_OUT_MS, INTRO_LINES, LINE_MS, NAME_MS, STAR_MS, introTimeline, lineWidth } from '@/lib/splashIntro';

/**
 * Plays once per cold start over everything, then calls onDone. The system splash before it
 * is plain paper (assets/splash-blank.png), so the two read as one screen.
 * With "reduce motion" on it ends at once.
 */
export function SplashIntro({ onDone }: { onDone: () => void }) {
  const palette = usePalette();
  const lines = useRef(Array.from({ length: INTRO_LINES }, () => new Animated.Value(0))).current;
  const name = useRef(new Animated.Value(0)).current;
  const star = useRef(new Animated.Value(0)).current;
  const all = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    const t = introTimeline();
    const ease = Easing.out(Easing.cubic);
    const at = (ms: number, anim: Animated.CompositeAnimation) => Animated.sequence([Animated.delay(ms), anim]);
    const run = Animated.parallel([
      ...lines.map((v, i) => at(t.lineStart(i), Animated.timing(v, { toValue: 1, duration: LINE_MS, easing: ease, useNativeDriver: true }))),
      at(t.nameStart, Animated.timing(name, { toValue: 1, duration: NAME_MS, easing: ease, useNativeDriver: true })),
      at(t.starStart, Animated.timing(star, { toValue: 1, duration: STAR_MS, easing: Easing.out(Easing.back(2)), useNativeDriver: true })),
      at(t.fadeStart, Animated.timing(all, { toValue: 0, duration: FADE_OUT_MS, useNativeDriver: true })),
    ]);
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) onDone();
        else run.start(({ finished }) => finished && !cancelled && onDone());
      });
    return () => {
      cancelled = true;
      run.stop();
    };
  }, [lines, name, star, all, onDone]);

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: palette.paper, opacity: all }]}>
      {lines.map((v, i) => (
        <Animated.View
          key={i}
          style={[styles.line, { width: lineWidth(i), backgroundColor: palette.line, transform: [{ scaleX: v }] }]}
        />
      ))}
      <Animated.Text
        style={[
          styles.name,
          { color: palette.ink, opacity: name, transform: [{ translateY: name.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] },
        ]}
      >
        לוח יהודי
      </Animated.Text>
      <Animated.Text style={[styles.star, { color: palette.red, opacity: star, transform: [{ scale: star }] }]}>✦</Animated.Text>
      <View />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  line: { height: 1.5, marginVertical: 7 },
  name: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 52, marginTop: 14 },
  star: { fontSize: 16, marginTop: 4 },
});
