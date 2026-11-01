import { useColorScheme } from 'react-native';

// Wall-calendar palette from design/screens.html. Dark mode is "paper at night".
const light = {
  paper: '#F6F0E4',
  ink: '#2B2118',
  inkSoft: '#6B5E4B',
  muted: '#9A8B73',
  line: '#D9CDB6',
  lineSoft: '#E6DDCB',
  today: '#EADFC8',
  red: '#A32D2D',
  sun: '#B5651D',
  // Names in the month grid: reminders blue, memorials purple (family dates use sun).
  remind: '#3F6E9E',
  memorial: '#765A9C',
};

const dark: typeof light = {
  paper: '#17140F',
  ink: '#EDE4D3',
  inkSoft: '#B3A68F',
  muted: '#8C8170',
  line: '#3A3328',
  lineSoft: '#2A251D',
  today: '#2C261D',
  red: '#E8806F',
  sun: '#EF9F27',
  remind: '#8DB4DE',
  memorial: '#B9A3D9',
};

export type Palette = typeof light;

export const fonts = {
  serif: 'FrankRuhlLibre_400Regular',
  serifMedium: 'FrankRuhlLibre_500Medium',
  sans: 'Heebo_400Regular',
  sansMedium: 'Heebo_500Medium',
};

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
