import { CITIES } from '../cities';
import { MAX_SCHEDULED } from '../notificationPlan';
import { planAll } from '../planAll';
import type { ZmanAlert } from '../zmanimAlerts';
import { ZMAN_KEYS } from '../zmanimFull';

const jerusalem = CITIES[0];
// Monday 26.10.2026, 10:00 in Israel: no Shabbat or chag in the next few days.
const now = new Date('2026-10-26T07:00:00Z');
const sunset: ZmanAlert = { id: 1, zman: 'sunset', minutesBefore: 15 };

describe('planAll', () => {
  it('adds daily zman alerts to the plan', () => {
    const plan = planAll({ now, events: [], reminders: [], zmanAlerts: [sunset], city: jerusalem, il: true });
    const zman = plan.filter((n) => n.kind === 'zman');
    expect(zman.length).toBeGreaterThan(0);
    expect(zman[0].id).toBe('zman-1-20261026');
    expect(zman[0].stub).toBeDefined();
  });

  it('keeps the plan soonest first', () => {
    const plan = planAll({ now, events: [], reminders: [], zmanAlerts: [sunset], city: jerusalem, il: true });
    const times = plan.map((n) => n.at.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('caps everything together', () => {
    const many: ZmanAlert[] = ZMAN_KEYS.map((zman, i) => ({ id: i + 1, zman, minutesBefore: 5 }));
    const plan = planAll({ now, events: [], reminders: [], zmanAlerts: many, city: jerusalem, il: true });
    expect(plan.length).toBeLessThanOrEqual(MAX_SCHEDULED);
  });

  it('is the old plan when there are no zman alerts', () => {
    const plan = planAll({ now, events: [], reminders: [], zmanAlerts: [], city: jerusalem, il: true });
    expect(plan.some((n) => n.kind === 'zman')).toBe(false);
  });
});
