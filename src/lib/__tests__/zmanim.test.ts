import { HDate, months } from '@hebcal/core';
import { CITIES } from '../cities';
import { dayZmanim, formatCountdown, nextShabbatTime, nextZman, sunProgress, upcomingShabbatTimes } from '../zmanim';

const jerusalem = CITIES.find((c) => c.id === 'jerusalem')!;
const fridayMorning = new Date('2026-10-23T07:28:00Z'); // 10:28 in Jerusalem
const shabbatAfternoon = new Date('2026-10-24T12:00:00Z'); // 15:00 in Jerusalem
const friday = new HDate(12, months.CHESHVAN, 5787);

describe('dayZmanim', () => {
  it('lists the zmanim in time order', () => {
    const times = dayZmanim(fridayMorning, jerusalem).map((z) => z.time.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times.length).toBe(9);
  });
});

describe('nextZman', () => {
  it('is the first zman after now', () => {
    const next = nextZman(fridayMorning, jerusalem)!;
    expect(next.time.getTime()).toBeGreaterThan(fridayMorning.getTime());
    expect(['סוף זמן תפילה', 'סוף זמן קריאת שמע', 'חצות']).toContain(next.label);
  });

  it('is null late at night', () => {
    expect(nextZman(new Date('2026-10-23T20:30:00Z'), jerusalem)).toBeNull();
  });
});

describe('sunProgress', () => {
  it('is between 0 and 1 during the day and null at night', () => {
    const p = sunProgress(fridayMorning, jerusalem)!;
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(0.5);
    expect(sunProgress(new Date('2026-10-23T20:30:00Z'), jerusalem)).toBeNull();
  });
});

describe('nextShabbatTime', () => {
  it('is candle lighting on Friday morning', () => {
    const t = nextShabbatTime(fridayMorning, jerusalem, friday)!;
    expect(t.kind).toBe('candles');
  });

  it('is havdalah on Shabbat afternoon', () => {
    const t = nextShabbatTime(shabbatAfternoon, jerusalem, friday.next())!;
    expect(t.kind).toBe('havdalah');
    expect(t.time.getTime()).toBeGreaterThan(shabbatAfternoon.getTime());
  });
});

describe('upcomingShabbatTimes', () => {
  it('has both candles and havdalah on Friday morning, havdalah after candles', () => {
    const t = upcomingShabbatTimes(fridayMorning, jerusalem, friday);
    expect(t.candles).not.toBeNull();
    expect(t.havdalah!.getTime()).toBeGreaterThan(t.candles!.getTime());
  });

  it('has only havdalah once Shabbat has started', () => {
    const t = upcomingShabbatTimes(shabbatAfternoon, jerusalem, friday.next());
    expect(t.candles).toBeNull();
    expect(t.havdalah).not.toBeNull();
  });
});

describe('formatCountdown', () => {
  const from = new Date('2026-10-23T10:00:00Z');
  it('uses minutes under an hour', () => {
    expect(formatCountdown(from, new Date('2026-10-23T10:06:00Z'))).toBe('בעוד 6 דק׳');
  });
  it('uses hours and minutes above an hour', () => {
    expect(formatCountdown(from, new Date('2026-10-23T16:40:00Z'))).toBe('בעוד 6:40 שע׳');
  });
  it('never goes negative', () => {
    expect(formatCountdown(from, new Date('2026-10-23T09:00:00Z'))).toBe('בעוד 0 דק׳');
  });
});
