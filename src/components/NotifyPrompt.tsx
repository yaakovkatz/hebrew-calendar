import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '@/data/useEvents';
import { useReminders } from '@/data/useReminders';
import { useSettings } from '@/data/useSettings';
import { requestNotifications } from '@/lib/scheduler';
import { fonts, usePalette } from '@/theme/tokens';

type Props = {
  visible: boolean;
  onYes: () => void;
  onLater: () => void;
};

/** "להזכיר לך?": bottom sheet, one line, two buttons (PLAN.md: asked after the first event). */
export function NotifyPrompt({ visible, onYes, onLater }: Props) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onLater}>
      <Pressable style={styles.backdrop} onPress={onLater} accessibilityLabel="סגירה" />
      <View style={[styles.sheet, { backgroundColor: palette.paper, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.handle, { backgroundColor: palette.line }]} />
        <Text style={[styles.title, { color: palette.ink }]}>להזכיר לך?</Text>
        <Text style={[styles.line, { color: palette.inkSoft }]}>נזכיר לפני אירועים, תזכורות ושבת.</Text>
        <Pressable
          onPress={onYes}
          accessibilityRole="button"
          style={[styles.primary, { backgroundColor: palette.ink }]}
        >
          <Text style={[styles.primaryText, { color: palette.paper }]}>כן, להזכיר</Text>
        </Pressable>
        <Pressable onPress={onLater} accessibilityRole="button" style={styles.secondary} hitSlop={8}>
          <Text style={[styles.secondaryText, { color: palette.muted }]}>לא עכשיו</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

/**
 * Shows "להזכיר לך?" once, after the first event or reminder is saved.
 * `ready`: App passes false while an add/edit screen is open, so the sheet waits until it closes.
 * Both answers mark it as asked; "כן" also asks Android, and the scheduler re-runs on the change.
 */
export function useNotifyPrompt(ready: boolean) {
  const { onboarded, notifyAsked, markNotifyAsked } = useSettings();
  const { events, loaded: eventsLoaded } = useEvents();
  const { reminders, loaded: remindersLoaded } = useReminders();
  const [busy, setBusy] = useState(false);
  const hasData = events.length + reminders.length > 0;
  const visible = ready && onboarded && !notifyAsked && eventsLoaded && remindersLoaded && hasData && !busy;

  const accept = useCallback(async () => {
    setBusy(true);
    await requestNotifications();
    markNotifyAsked();
    setBusy(false);
  }, [markNotifyAsked]);

  return { visible, accept, dismiss: markNotifyAsked };
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0006' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 24 },
  handle: { alignSelf: 'center', width: 34, height: 3, borderRadius: 2, marginTop: 10, marginBottom: 18 },
  title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 36 },
  line: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, marginTop: 6, marginBottom: 24 },
  primary: { alignItems: 'center', paddingVertical: 14, borderRadius: 26 },
  primaryText: { fontFamily: fonts.sans, fontSize: 16 },
  secondary: { alignItems: 'center', paddingVertical: 14 },
  secondaryText: { fontFamily: fonts.sans, fontSize: 15 },
});
