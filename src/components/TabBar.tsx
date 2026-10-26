import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { fonts, usePalette } from '@/theme/tokens';

export type TabId = 'calendar' | 'zmanim' | 'family' | 'settings';

export const TABS: { id: TabId; title: string; icon: string }[] = [
  { id: 'calendar', title: 'לוח', icon: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4' },
  { id: 'zmanim', title: 'זמנים', icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2' },
  {
    id: 'family',
    title: 'אירועים',
    icon: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5M14 15c3 0 8 1 8 5',
  },
  {
    id: 'settings',
    title: 'הגדרות',
    icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 1-2-1V5h-4v2l-2 1-2-1-2 4 2 1-2 1 2 4 2-1 2 1v2h4v-2l2-1 2 1 2-4z',
  },
];

/** Thin-icon tab bar from the approved navigation mockup. */
export function TabBar({ active, onSelect }: { active: TabId; onSelect: (id: TabId) => void }) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { borderTopColor: palette.line, backgroundColor: palette.paper, paddingBottom: 10 + insets.bottom }]}>
      {TABS.map((tab) => {
        const focused = tab.id === active;
        const color = focused ? palette.ink : palette.muted;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.title}
            onPress={() => onSelect(tab.id)}
            style={styles.tab}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.4}>
              <Path d={tab.icon} />
            </Svg>
            <Text style={[styles.label, { color }]}>{tab.title}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, paddingTop: 8 },
  tab: { alignItems: 'center', minWidth: 64, gap: 2 },
  label: { fontFamily: fonts.sans, fontSize: 11 },
});
