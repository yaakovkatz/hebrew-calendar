import { useEffect, useMemo, useState } from 'react';
import { BackHandler, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/data/useSettings';
import { searchCities, type City } from '@/lib/cities';
import { fonts, usePalette } from '@/theme/tokens';

type Props = {
  /** Cancel / Android back. Also called after a pick when `onPick` is not given. */
  onClose: () => void;
  /** Called after the city is saved (onboarding uses it to finish). */
  onPick?: (city: City) => void;
  /** Small muted label above the title, e.g. "שלב 1 מתוך 1". */
  stepLabel?: string;
  /** Top-bar text for onClose. */
  closeLabel?: string;
};

/** Approved mockup "מיקום": "איפה אתם?", search, cities with candle-lighting minutes. */
export function CityPickerScreen({ onClose, onPick, stepLabel, closeLabel = 'ביטול' }: Props) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { cityId, setCityId } = useSettings();
  const [query, setQuery] = useState('');
  const cities = useMemo(() => searchCities(query), [query]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const pick = (city: City) => {
    setCityId(city.id);
    if (onPick) onPick(city);
    else onClose();
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.paper, paddingTop: insets.top + 12 }]}>
      <View style={styles.topBar}>
        <Pressable onPress={onClose} accessibilityRole="button" hitSlop={12}>
          <Text style={[styles.topText, { color: palette.muted }]}>{closeLabel}</Text>
        </Pressable>
      </View>

      <View style={styles.head}>
        {stepLabel ? <Text style={[styles.step, { color: palette.muted }]}>{stepLabel}</Text> : null}
        <Text style={[styles.big, { color: palette.ink }]}>איפה אתם?</Text>
        <Text style={[styles.sub, { color: palette.muted }]}>כדי לחשב זמנים והדלקת&nbsp;נרות</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="חיפוש עיר…"
          placeholderTextColor={palette.muted}
          style={[styles.search, { color: palette.ink, borderBottomColor: palette.line }]}
          textAlign="right"
          returnKeyType="search"
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={cities}
        keyExtractor={(c) => c.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        ListEmptyComponent={<Text style={[styles.empty, { color: palette.muted }]}>לא מצאנו עיר בשם&nbsp;הזה</Text>}
        renderItem={({ item }) => {
          const on = item.id === cityId;
          return (
            <Pressable
              onPress={() => pick(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${item.name}, הדלקת נרות ${item.candleLightingMins} דקות לפני השקיעה`}
              style={[styles.row, { borderBottomColor: palette.lineSoft }, on && { backgroundColor: palette.today }]}
            >
              <Text style={[styles.name, { color: palette.ink }]}>{item.name}</Text>
              <Text style={[styles.mins, { color: palette.muted }]}>{item.candleLightingMins} דק׳</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24 },
  topText: { fontFamily: fonts.sans, fontSize: 15 },
  head: { paddingHorizontal: 24 },
  step: { fontFamily: fonts.sans, fontSize: 12, marginTop: 18 },
  big: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 44, marginTop: 6 },
  sub: { fontFamily: fonts.sans, fontSize: 13, marginTop: 4 },
  search: { fontFamily: fonts.sans, fontSize: 16, borderBottomWidth: 1, paddingVertical: 10, marginTop: 24 },
  list: { paddingHorizontal: 24 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  name: { fontFamily: fonts.serif, fontSize: 19 },
  mins: { fontFamily: fonts.sans, fontSize: 13 },
  empty: { fontFamily: fonts.sans, fontSize: 14, textAlign: 'center', marginTop: 32 },
});
