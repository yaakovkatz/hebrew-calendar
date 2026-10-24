import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Option } from '@/lib/datePicking';
import { fonts, usePalette } from '@/theme/tokens';

type Props<T> = {
  visible: boolean;
  title: string;
  options: Option<T>[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
};

/** Bottom sheet with a scrollable list; the selected row is tinted like "today". */
export function OptionSheet<T>({ visible, title, options, selected, onSelect, onClose }: Props<T>) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const initialIndex = Math.max(0, options.findIndex((o) => o.value === selected));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="סגירה" />
      <View style={[styles.sheet, { backgroundColor: palette.paper, paddingBottom: insets.bottom + 12 }]}>
        <View style={[styles.handle, { backgroundColor: palette.line }]} />
        <Text style={[styles.title, { color: palette.muted }]}>{title}</Text>
        <FlatList
          data={options}
          keyExtractor={(o) => String(o.value)}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: ROW, offset: ROW * index, index })}
          renderItem={({ item }) => {
            const on = item.value === selected;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
                accessibilityState={{ selected: on }}
                style={[styles.row, { borderBottomColor: palette.lineSoft }, on && { backgroundColor: palette.today }]}
              >
                <Text style={[styles.label, { color: palette.ink }]}>{item.label}</Text>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const ROW = 48;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0006' },
  sheet: { maxHeight: '60%', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20 },
  handle: { alignSelf: 'center', width: 34, height: 3, borderRadius: 2, marginTop: 10, marginBottom: 10 },
  title: { fontFamily: fonts.sans, fontSize: 12, marginBottom: 4 },
  row: { height: ROW, justifyContent: 'center', borderBottomWidth: 1, paddingHorizontal: 8 },
  label: { fontFamily: fonts.serif, fontSize: 18 },
});
