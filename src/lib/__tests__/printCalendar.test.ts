import { HDate, months } from '@hebcal/core';
import { cityFor } from '../../data/settings';
import type { FamilyEvent } from '../events';
import { buildMonth } from '../month';
import { buildCalendarHtml, escapeHtml, fontFaceCss, monthsOfYear, type CalendarOptions } from '../printCalendar';

const ALL = { holidays: true, parsha: true, family: true, candles: true };

const mom: FamilyEvent = {
  id: 1,
  type: 'birthday',
  title: 'אמא',
  hDay: 25,
  hMonth: months.CHESHVAN,
  hYear: 5722,
  afterSunset: false,
  gregDate: null,
  reminder: 'evening',
  showYears: false,
};

function build(over: Partial<CalendarOptions> = {}): string {
  return buildCalendarHtml({
    hebrewYear: 5787,
    title: 'משפחת כהן',
    il: true,
    city: cityFor('jerusalem'),
    include: ALL,
    events: [mom],
    ...over,
  });
}

function iso(hd: HDate): string {
  const d = hd.greg();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The inner HTML of the in-month cell for a date (skips faded copies on neighbour pages). */
function cell(html: string, hd: HDate): string {
  const re = new RegExp(`<td class="day[^"]*" data-date="${iso(hd)}">(.*?)</td>`, 'g');
  const found = [...html.matchAll(re)].filter((m) => !m[0].includes(' out"'));
  expect(found).toHaveLength(1);
  return found[0][1];
}

const pages = (html: string) => html.match(/<section class="page/g)?.length ?? 0;

describe('buildCalendarHtml', () => {
  it('has a cover and one page per month: 13 + 1 in leap 5787, 12 + 1 in 5786', () => {
    expect(monthsOfYear(5787)).toHaveLength(13);
    expect(monthsOfYear(5786)).toHaveLength(12);
    expect(pages(build())).toBe(14);
    expect(pages(build({ hebrewYear: 5786 }))).toBe(13);
  });

  it('year scope is the default and keeps the cover', () => {
    const html = build({ scope: { kind: 'year' } });
    expect(pages(html)).toBe(14);
    expect(html).toContain('class="page cover"');
    expect(html).toBe(build());
  });

  it('month scope prints exactly one page for that month, without a cover', () => {
    const html = build({ scope: { kind: 'month', month: months.ELUL } });
    expect(pages(html)).toBe(1);
    expect(html).not.toContain('class="page cover"');
    expect(html).toContain(`data-month="${months.ELUL}"`);
    expect(html).toContain('<h1>אלול</h1>');
    expect(html.match(/<h1>/g)).toHaveLength(1);
  });

  it('month scope handles Adar II in a leap year and keeps family events', () => {
    const adar2 = build({ scope: { kind: 'month', month: months.ADAR_II } });
    expect(pages(adar2)).toBe(1);
    expect(adar2).toContain(`data-month="${months.ADAR_II}"`);
    const cheshvan = build({ scope: { kind: 'month', month: months.CHESHVAN } });
    expect(cell(cheshvan, new HDate(25, months.CHESHVAN, 5787))).toContain('יום ההולדת של אמא');
  });

  it('starts with Tishrei and ends with Elul', () => {
    const list = monthsOfYear(5787);
    expect(list[0]).toBe(months.TISHREI);
    expect(list[list.length - 1]).toBe(months.ELUL);
  });

  it('is a right-to-left Hebrew A4 document', () => {
    const html = build();
    expect(html).toMatch(/<html lang="he" dir="rtl">/);
    expect(html).toContain('size:A4');
    expect(html).toContain('תשפ״ז');
    expect(html).toContain('משפחת כהן');
  });

  it("puts the family event in its day's cell", () => {
    expect(cell(build(), new HDate(25, months.CHESHVAN, 5787))).toContain('יום ההולדת של אמא');
    expect(cell(build(), new HDate(24, months.CHESHVAN, 5787))).not.toContain('אמא');
    expect(build({ include: { ...ALL, family: false } })).not.toContain('יום ההולדת של אמא');
  });

  it('writes the parsha on Shabbat', () => {
    const shabbat = buildMonth(5787, months.CHESHVAN, new HDate(1, months.TISHREI, 5787), true).cells.find(
      (c) => c.isShabbat && c.inMonth && c.parsha,
    )!;
    expect(cell(build(), shabbat.hd)).toContain(shabbat.parsha!);
    expect(cell(build({ include: { ...ALL, parsha: false } }), shabbat.hd)).not.toContain(shabbat.parsha!);
  });

  it('removes holidays when the option is off', () => {
    const roshHashana = new HDate(1, months.TISHREI, 5787);
    expect(cell(build(), roshHashana)).toContain('ראש השנה');
    expect(cell(build({ include: { ...ALL, holidays: false } }), roshHashana)).not.toContain('ראש השנה');
  });

  it('adds candle lighting on Friday only when asked', () => {
    const friday = new HDate(1, months.TISHREI, 5787).onOrAfter(5).add(7, 'd');
    expect(cell(build(), friday)).toMatch(/הדלקת נרות \d\d:\d\d/);
    expect(cell(build({ include: { ...ALL, candles: false } }), friday)).not.toContain('הדלקת נרות');
  });

  it('escapes user text', () => {
    const evil = { ...mom, title: '<script>alert("x")</script>' };
    const html = build({ title: '<b>כהן</b>', events: [evil] });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&#60;script&#62;');
    expect(escapeHtml(`a&b<"'>`)).toBe('a&#38;b&#60;&#34;&#39;&#62;');
  });

  it('embeds fonts only when given', () => {
    expect(fontFaceCss(null)).toBe('');
    const css = fontFaceCss({ serif: 'AAA', sans: 'BBB' });
    expect(css).toContain("font-family:'Frank Ruhl Libre';src:url(data:font/ttf;base64,AAA)");
    expect(css).toContain("font-family:'Heebo';src:url(data:font/ttf;base64,BBB)");
    expect(build({ fonts: { serif: 'AAA', sans: 'BBB' } })).toContain('base64,AAA');
    expect(build()).not.toContain('@font-face');
  });
});
