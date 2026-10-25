import { CITIES, findCity, searchCities } from '../cities';
import {
  candleLightingLabel,
  cityFor,
  DEFAULT_SETTINGS,
  parseSettings,
  sanitizeSettings,
  serializeSettings,
} from '../../data/settings';

describe('settings defaults and parsing', () => {
  it('has the agreed defaults', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      cityId: 'jerusalem',
      il: true,
      showEventsInCalendar: true,
      onboarded: false,
      openOn: 'month',
    });
  });

  it('returns defaults for empty or broken input', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{not json')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('42')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('null')).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid fields and replaces invalid ones', () => {
    const s = sanitizeSettings({ cityId: 'haifa', il: false, showEventsInCalendar: 'yes', onboarded: true, openOn: 'week' });
    expect(s).toEqual({ cityId: 'haifa', il: false, showEventsInCalendar: true, onboarded: true, openOn: 'month' });
  });

  it('falls back to Jerusalem for an unknown city', () => {
    expect(parseSettings(JSON.stringify({ cityId: 'atlantis' })).cityId).toBe('jerusalem');
    expect(cityFor('atlantis').id).toBe('jerusalem');
    expect(cityFor(null).id).toBe('jerusalem');
    expect(cityFor('haifa').name).toBe('חיפה');
  });

  it('round-trips through serialize and parse', () => {
    const s = { cityId: 'eilat', il: false, showEventsInCalendar: false, onboarded: true, openOn: 'day' as const };
    expect(parseSettings(serializeSettings(s))).toEqual(s);
  });

  it('formats candle lighting', () => {
    expect(candleLightingLabel(cityFor('jerusalem'))).toBe('40 דק׳ לפני');
  });
});

describe('cities', () => {
  it('has about 25 cities with unique ids', () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(25);
    expect(new Set(CITIES.map((c) => c.id)).size).toBe(CITIES.length);
    expect(new Set(CITIES.map((c) => c.name)).size).toBe(CITIES.length);
  });

  it('keeps the original ids, Jerusalem first', () => {
    expect(CITIES[0].id).toBe('jerusalem');
    for (const id of ['jerusalem', 'tel-aviv', 'haifa', 'bnei-brak']) expect(findCity(id)).toBeDefined();
  });

  it('uses the hebcal candle-lighting defaults', () => {
    expect(findCity('jerusalem')!.candleLightingMins).toBe(40);
    expect(findCity('haifa')!.candleLightingMins).toBe(30);
    expect(findCity('zikhron-yaakov')!.candleLightingMins).toBe(30);
    const others = CITIES.filter((c) => !['jerusalem', 'haifa', 'zikhron-yaakov'].includes(c.id));
    for (const c of others) expect(c.candleLightingMins).toBe(20);
  });

  it('are all in Israel, in Asia/Jerusalem', () => {
    for (const c of CITIES) {
      expect(c.tzid).toBe('Asia/Jerusalem');
      expect(c.latitude).toBeGreaterThan(29);
      expect(c.latitude).toBeLessThan(33.5);
      expect(c.longitude).toBeGreaterThan(34);
      expect(c.longitude).toBeLessThan(36);
    }
  });

  it('search puts Jerusalem first and ignores spelling variants', () => {
    expect(searchCities('')[0].id).toBe('jerusalem');
    expect(searchCities('')).toHaveLength(CITIES.length);
    expect(searchCities('חיפ').map((c) => c.id)).toEqual(['haifa']);
    expect(searchCities('פתח תקוה').map((c) => c.id)).toEqual(['petah-tikva']);
    expect(searchCities('קרית גת').map((c) => c.id)).toEqual(['kiryat-gat']);
    expect(searchCities('xyz')).toEqual([]);
  });
});
