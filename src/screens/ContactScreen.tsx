import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  buildContactPayload,
  currentDevice,
  KIND_LABEL,
  sendContact,
  validateContact,
  type ContactKind,
} from '@/lib/contact';
import { fonts, usePalette } from '@/theme/tokens';
import { TopButton } from '@/components/TopButton';

const KINDS: ContactKind[] = ['question', 'bug', 'idea'];

/** Approved design: kind, message, optional reply email, device info switch; sends through a form service. */
export function ContactScreen({ onBack }: { onBack: () => void }) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<ContactKind>('bug');
  const [message, setMessage] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [includeDevice, setIncludeDevice] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    const invalid = validateContact({ message, replyEmail });
    if (invalid) {
      setError(invalid);
      return;
    }
    setSending(true);
    setError(null);
    const payload = buildContactPayload({ kind, message, replyEmail, includeDevice, device: currentDevice() });
    const result = await sendContact(payload);
    setSending(false);
    if (result.ok) setSent(true);
    else setError(result.error);
  };

  const bottomButton = (label: string, onPress: () => void, disabled = false) => (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 16 }]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        style={[styles.button, { backgroundColor: palette.ink, opacity: disabled ? 0.6 : 1 }]}
      >
        <Text style={[styles.buttonText, { color: palette.paper }]}>{label}</Text>
      </Pressable>
    </View>
  );

  if (sent) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.paper, paddingTop: insets.top + 12 }]}>
        <View style={styles.thanks}>
          <Text style={[styles.thanksTitle, { color: palette.ink }]}>תודה</Text>
          <Text style={[styles.star, { color: palette.red }]}>✦</Text>
          <Text style={[styles.thanksText, { color: palette.muted }]}>{'ההודעה התקבלה.\nאם השארתם מייל, נחזור אליכם.'}</Text>
        </View>
        {bottomButton('חזרה', onBack)}
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.paper, paddingTop: insets.top + 12 }]}>
      <View style={styles.back}>
        <TopButton label="‹ אודות" onPress={onBack} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: palette.ink }]}>יצירת קשר</Text>
        <Text style={[styles.subtitle, { color: palette.muted }]}>שאלה, תקלה או רעיון. נשמח לשמוע</Text>

        <View style={[styles.segment, { borderColor: palette.line }]}>
          {KINDS.map((k) => {
            const on = k === kind;
            return (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.segmentItem, on && { backgroundColor: palette.ink }]}
              >
                <Text style={[styles.segmentText, { color: on ? palette.paper : palette.muted }]}>{KIND_LABEL[k]}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: palette.muted }]}>מה קרה?</Text>
        <TextInput
          value={message}
          onChangeText={(t) => {
            setMessage(t);
            if (error) setError(null);
          }}
          placeholder="כתבו כאן…"
          placeholderTextColor={palette.muted}
          multiline
          textAlignVertical="top"
          textAlign="right"
          style={[styles.input, styles.multiline, { color: palette.ink, borderBottomColor: palette.line }]}
        />

        <Text style={[styles.label, { color: palette.muted }]}>מייל לתשובה (לא חובה)</Text>
        <TextInput
          value={replyEmail}
          onChangeText={(t) => {
            setReplyEmail(t);
            if (error) setError(null);
          }}
          placeholder="name@example.com"
          placeholderTextColor={palette.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textAlign="right"
          style={[styles.input, { color: palette.ink, borderBottomColor: palette.line }]}
        />

        <View style={styles.switchRow}>
          <Text style={[styles.switchText, { color: palette.ink }]}>לצרף פרטי מכשיר וגרסה</Text>
          <Switch value={includeDevice} onValueChange={setIncludeDevice} trackColor={{ true: palette.sun, false: palette.line }} thumbColor="#fff" />
        </View>

        {error ? <Text style={[styles.error, { color: palette.red }]}>{error}</Text> : null}
      </ScrollView>

      {bottomButton('שליחה', send, sending)}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  back: { paddingHorizontal: 24 },
  body: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 40 },
  title: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 44 },
  subtitle: { fontFamily: fonts.sans, fontSize: 13, marginTop: 4 },
  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: 18, padding: 2, marginTop: 18 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 16 },
  segmentText: { fontFamily: fonts.sans, fontSize: 13 },
  label: { fontFamily: fonts.sans, fontSize: 12, marginTop: 22, marginBottom: 4 },
  input: { fontFamily: fonts.sans, fontSize: 16, borderBottomWidth: 1, paddingVertical: 6 },
  multiline: { minHeight: 96 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  switchText: { fontFamily: fonts.sans, fontSize: 14 },
  error: { fontFamily: fonts.sans, fontSize: 13, marginTop: 14 },
  bar: { paddingHorizontal: 24, paddingTop: 8 },
  button: { alignItems: 'center', paddingVertical: 14, borderRadius: 26 },
  buttonText: { fontFamily: fonts.sans, fontSize: 16 },
  thanks: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  thanksTitle: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 48 },
  star: { fontFamily: fonts.serif, fontSize: 18, marginVertical: 12 },
  thanksText: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, textAlign: 'center' },
});
