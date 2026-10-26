import { Location } from '@hebcal/core';

export type City = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  tzid: string;
  /** Minutes before sunset, by local custom (see the note above CITIES). */
  candleLightingMins: number;
};

const TZ = 'Asia/Jerusalem';

function city(id: string, name: string, latitude: number, longitude: number, candleLightingMins = 20): City {
  return { id, name, latitude, longitude, tzid: TZ, candleLightingMins };
}

// Israeli cities. Jerusalem stays first: it is the default city and the fallback.
// Candle lighting (checked 26.10.2026):
// - 20 minutes: the common Israeli custom and hebcal's Israel default.
// - Jerusalem 40, Haifa 30, Zikhron Ya'akov 30: hebcal's city overrides.
// - Petah Tikva 40: the old local custom (Ohr Somayach "Ask the Rabbi",
//   Hamichlol "נרות שבת ויום טוב"). Some households there light 20-30.
// No reliable source found for a city-wide custom elsewhere (Bnei Brak, Safed,
// Beit Shemesh, Beitar Illit, ...), so they stay at 20.
// Coordinates are city centers, within ~3 km of GeoNames (hebcal's list).
export const CITIES: City[] = [
  city('jerusalem', 'ירושלים', 31.7683, 35.2137, 40),
  city('tel-aviv', 'תל אביב', 32.0853, 34.7818),
  city('haifa', 'חיפה', 32.794, 34.9896, 30),
  city('bnei-brak', 'בני ברק', 32.0807, 34.8338),
  city('zikhron-yaakov', 'זכרון יעקב', 32.5707, 34.952, 30),
  city('beer-sheva', 'באר שבע', 31.2518, 34.7913),
  city('ashdod', 'אשדוד', 31.8014, 34.6435),
  city('ashkelon', 'אשקלון', 31.6688, 34.5743),
  city('netanya', 'נתניה', 32.3215, 34.8532),
  city('petah-tikva', 'פתח תקווה', 32.084, 34.8878, 40),
  city('rishon-lezion', 'ראשון לציון', 31.973, 34.7925),
  city('rehovot', 'רחובות', 31.8928, 34.8113),
  city('holon', 'חולון', 32.0158, 34.7874),
  city('bat-yam', 'בת ים', 32.0171, 34.7454),
  city('ramat-gan', 'רמת גן', 32.0684, 34.8248),
  city('herzliya', 'הרצליה', 32.1663, 34.8433),
  city('kfar-saba', 'כפר סבא', 32.175, 34.9069),
  city('raanana', 'רעננה', 32.1848, 34.8713),
  city('hadera', 'חדרה', 32.434, 34.9196),
  city('modiin', 'מודיעין', 31.898, 35.0104),
  city('modiin-illit', 'מודיעין עילית', 31.9322, 35.042),
  city('beit-shemesh', 'בית שמש', 31.747, 34.9881),
  city('beitar-illit', 'ביתר עילית', 31.696, 35.115),
  city('elad', 'אלעד', 32.0522, 34.951),
  city('tiberias', 'טבריה', 32.7922, 35.5312),
  city('safed', 'צפת', 32.9646, 35.496),
  city('karmiel', 'כרמיאל', 32.919, 35.295),
  city('nahariya', 'נהריה', 33.0089, 35.0981),
  city('afula', 'עפולה', 32.6078, 35.2897),
  city('kiryat-gat', 'קריית גת', 31.61, 34.7642),
  city('eilat', 'אילת', 29.5577, 34.9519),
];

export const DEFAULT_CITY_ID = 'jerusalem';

export function findCity(id: string | null | undefined): City | undefined {
  return CITIES.find((c) => c.id === id);
}

/** Ignores quote marks, doubled vav/yod and extra spaces, so "פתח תקוה" or "קרית גת" still match. */
export function normalizeCityName(s: string): string {
  return s
    .replace(/["'״׳`]/g, '')
    .replace(/וו/g, 'ו')
    .replace(/יי/g, 'י')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cities for the picker: Jerusalem first, then by Hebrew name, filtered by the search text. */
export function searchCities(query: string): City[] {
  const q = normalizeCityName(query);
  const sorted = [...CITIES].sort((a, b) =>
    a.id === DEFAULT_CITY_ID ? -1 : b.id === DEFAULT_CITY_ID ? 1 : a.name.localeCompare(b.name, 'he'),
  );
  return q ? sorted.filter((c) => normalizeCityName(c.name).includes(q)) : sorted;
}

export function toLocation(city: City): Location {
  return new Location(city.latitude, city.longitude, true, city.tzid, city.name, 'IL');
}
