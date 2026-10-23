import { Location } from '@hebcal/core';

export type City = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  tzid: string;
  /** Minutes before sunset. Values must be verified before release (PLAN.md). */
  candleLightingMins: number;
};

// Temporary short list for the stage-0 spike. The full Israeli list comes from GeoNames.
export const CITIES: City[] = [
  { id: 'jerusalem', name: 'ירושלים', latitude: 31.7683, longitude: 35.2137, tzid: 'Asia/Jerusalem', candleLightingMins: 40 },
  { id: 'tel-aviv', name: 'תל אביב', latitude: 32.0853, longitude: 34.7818, tzid: 'Asia/Jerusalem', candleLightingMins: 20 },
  { id: 'haifa', name: 'חיפה', latitude: 32.794, longitude: 34.9896, tzid: 'Asia/Jerusalem', candleLightingMins: 30 },
  { id: 'bnei-brak', name: 'בני ברק', latitude: 32.0807, longitude: 34.8338, tzid: 'Asia/Jerusalem', candleLightingMins: 20 },
];

export function toLocation(city: City): Location {
  return new Location(city.latitude, city.longitude, true, city.tzid, city.name, 'IL');
}
