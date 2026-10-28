import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sheetStartIndex, type Option } from '@/lib/datePicking';
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
  const initialIndex = sheetStartIndex(options, selected);
  return (
    <Modal visible={visible} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose}>
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
                {item.hint ? (
                  <Text style={[styles.hint, { color: palette.muted }]} numberOfLines={1}>
                    {item.hint}
                  </Text>
                ) : null}
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
  row: {
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  label: { fontFamily: fonts.serif, fontSize: 18 },
  hint: { flexShrink: 1, fontFamily: fonts.sans, fontSize: 12 },
});
