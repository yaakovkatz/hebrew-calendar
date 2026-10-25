import { CandleLightingEvent, HDate, HebrewCalendar, months } from '@hebcal/core';
import { toLocation, type City } from './cities';
import { headline, nextOccurrence, type FamilyEvent } from './events';
import { formatTime } from './hebrewDay';
import { buildMonth, shiftMonth, WEEKDAYS, yearLabel, type MonthGrid } from './month';

/** What goes on the printed calendar ("מה יודפס"). */
export type PrintInclude = { holidays: boolean; parsha: boolean; family: boolean; candles: boolean };

/** Base64 TTF data; when missing the page falls back to system fonts. */
export type PrintFonts = { serif: string; sans: string };

export type CalendarOptions = {
  hebrewYear: number;
  /** 'משפחת כהן'; printed on the cover and at the bottom of each page. May be empty. */
  title: string;
  il: boolean;
  city: City;
  include: PrintInclude;
  events: FamilyEvent[];
  fonts?: PrintFonts | null;
};

/** A4 in points, for expo-print's width/height. */
export const A4_POINTS = { width: 595, height: 842 };

export const PRINT_ERROR = 'לא הצלחנו ליצור את הלוח. נסו שוב.';

const SERIF = "'Frank Ruhl Libre', 'Noto Serif Hebrew', 'David', serif";
const SANS = "'Heebo', 'Noto Sans Hebrew', 'Arial', sans-serif";

const COLORS = { paper: '#FFFDF8', ink: '#2B2118', muted: '#9A8B73', line: '#D9CDB6', red: '#A32D2D', sun: '#B5651D' };

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** @font-face rules for the embedded fonts; empty without them (system fallback). */
export function fontFaceCss(fonts: PrintFonts | null | undefined): string {
  if (!fonts) return '';
  const face = (family: string, b64: string) =>
    `@font-face{font-family:'${family}';src:url(data:font/ttf;base64,${b64}) format('truetype');font-weight:400;font-style:normal;}`;
  return face('Frank Ruhl Libre', fonts.serif) + face('Heebo', fonts.sans);
}

/** All months of a Hebrew year in calendar order, Tishrei to Elul (13 in a leap year). */
export function monthsOfYear(hebrewYear: number): number[] {
  const list: number[] = [];
  let cur = { year: hebrewYear, month: months.TISHREI as number };
  while (cur.year === hebrewYear) {
    list.push(cur.month);
    cur = shiftMonth(cur.year, cur.month, 1);
  }
  return list;
}

function isoDate(hd: HDate): string {
  const d = hd.greg();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Family events of the year, by day (HDate.abs). */
function familyByDay(events: FamilyEvent[], hebrewYear: number): Map<number, string[]> {
  const map = new Map<number, string[]>();
  const start = new HDate(1, months.TISHREI, hebrewYear);
  for (const event of events) {
    const occ = nextOccurrence(event, start);
    if (occ.getFullYear() !== hebrewYear) continue;
    const list = map.get(occ.abs()) ?? [];
    list.push(headline(event));
    map.set(occ.abs(), list);
  }
  return map;
}

/** Candle lighting times (Shabbat and Yom Tov) by day for the city. */
function candlesByDay(hebrewYear: number, city: City, il: boolean): Map<number, string> {
  const start = new HDate(1, months.TISHREI, hebrewYear).subtract(7, 'd');
  const end = new HDate(1, months.TISHREI, hebrewYear + 1).add(7, 'd');
  const events = HebrewCalendar.calendar({
    start,
    end,
    location: toLocation(city),
    candlelighting: true,
    candleLightingMins: city.candleLightingMins,
    il,
  });
  const map = new Map<number, string>();
  for (const ev of events) {
    if (ev instanceof CandleLightingEvent && !map.has(ev.getDate().abs())) {
      map.set(ev.getDate().abs(), formatTime(ev.eventTime, city.tzid));
    }
  }
  return map;
}

function cellHtml(
  cell: MonthGrid['cells'][number],
  include: PrintInclude,
  family: Map<number, string[]>,
  candles: Map<number, string>,
): string {
  const classes = ['day'];
  if (cell.isShabbat) classes.push('shabbat');
  if (!cell.inMonth) classes.push('out');
  const notes: string[] = [];
  if (cell.inMonth) {
    if (include.parsha && cell.parsha) notes.push(`<em class="parsha">${escapeHtml(cell.parsha)}</em>`);
    if (include.holidays) for (const h of cell.holidays) notes.push(`<em class="holiday">${escapeHtml(h)}</em>`);
    if (include.family) for (const f of family.get(cell.hd.abs()) ?? []) notes.push(`<em class="family">${escapeHtml(f)}</em>`);
    const time = candles.get(cell.hd.abs());
    if (include.candles && time) notes.push(`<em class="candles">הדלקת נרות ${escapeHtml(time)}</em>`);
  }
  return (
    `<td class="${classes.join(' ')}" data-date="${isoDate(cell.hd)}">` +
    `<span class="greg">${cell.gregDay}</span><span class="hday">${cell.label}</span>${notes.join('')}</td>`
  );
}

function monthPage(grid: MonthGrid, footer: string, include: PrintInclude, family: Map<number, string[]>, candles: Map<number, string>): string {
  const weeks: string[] = [];
  for (let i = 0; i < grid.cells.length; i += 7) {
    weeks.push(`<tr>${grid.cells.slice(i, i + 7).map((c) => cellHtml(c, include, family, candles)).join('')}</tr>`);
  }
  const head = WEEKDAYS.map((d, i) => `<th${i === 6 ? ' class="shabbat"' : ''}>${d}</th>`).join('');
  return `<section class="page month" data-month="${grid.month}">
<header><div class="year">${grid.yearLabel}</div><h1>${escapeHtml(grid.title)}</h1><div class="greg-range">${escapeHtml(grid.gregRange)}</div></header>
<table><thead><tr>${head}</tr><tr><th colspan="7" class="ornament"><span></span>✦<span></span></th></tr></thead>
<tbody class="weeks-${weeks.length}">${weeks.join('')}</tbody></table>
${footer ? `<footer>${footer}</footer>` : ''}
</section>`;
}

function styles(fonts: PrintFonts | null | undefined): string {
  const c = COLORS;
  return `${fontFaceCss(fonts)}
@page{size:A4;margin:12mm;}
*{box-sizing:border-box;margin:0;padding:0;}
html,body{background:${c.paper};color:${c.ink};font-family:${SERIF};}
.page{height:272mm;display:flex;flex-direction:column;overflow:hidden;page-break-after:always;break-after:page;}
.page:last-child{page-break-after:auto;break-after:auto;}
.cover{justify-content:center;align-items:center;text-align:center;}
.cover .brand{font-family:${SANS};font-size:13pt;letter-spacing:3px;color:${c.muted};}
.cover .big-year{font-size:76pt;line-height:1.1;margin:10mm 0 4mm;}
.cover .greg-years{font-family:${SANS};font-size:11pt;color:${c.muted};}
.cover .ornament-line{color:${c.red};margin:10mm 0;font-size:14pt;}
.cover .title{font-size:26pt;}
.cover .city{font-family:${SANS};font-size:10pt;color:${c.muted};margin-top:4mm;}
header{text-align:center;margin-bottom:6mm;}
header .year{font-family:${SANS};font-size:10pt;letter-spacing:2px;color:${c.muted};}
header h1{font-weight:400;font-size:40pt;line-height:1.1;}
header .greg-range{font-family:${SANS};font-size:10pt;color:${c.muted};}
table{width:100%;flex:1;border-collapse:collapse;table-layout:fixed;}
th{font-family:${SANS};font-weight:400;font-size:9pt;color:${c.muted};padding-bottom:2mm;}
th.shabbat{color:${c.red};}
th.ornament{color:${c.red};font-size:9pt;padding-bottom:2mm;}
th.ornament span{display:inline-block;width:44%;height:1px;background:${c.line};vertical-align:middle;margin:0 2mm;}
td{vertical-align:top;border-top:1px solid ${c.line};padding:1.5mm 1.5mm 1mm;font-size:16pt;line-height:1.1;overflow:hidden;}
tbody.weeks-4 td{height:52mm;}tbody.weeks-5 td{height:41mm;}tbody.weeks-6 td{height:34mm;}
td .greg{float:left;font-family:${SANS};font-size:8pt;color:${c.muted};}
td .hday{display:block;}
td em{display:block;font-style:normal;font-family:${SANS};font-size:7pt;line-height:1.25;margin-top:1mm;color:${c.muted};}
td.shabbat{color:${c.red};}
td em.parsha{color:${c.red};}
td em.family{color:${c.sun};}
td.out{opacity:.3;}
footer{text-align:center;font-family:${SANS};font-size:10pt;letter-spacing:1px;color:${c.muted};margin-top:4mm;}`;
}

/** The whole printable wall calendar: a cover and one A4 page per Hebrew month. Pure. */
export function buildCalendarHtml(opts: CalendarOptions): string {
  const { hebrewYear, il, city, include, events } = opts;
  const title = escapeHtml(opts.title.trim());
  const first = new HDate(1, months.TISHREI, hebrewYear);
  const family = include.family ? familyByDay(events, hebrewYear) : new Map<number, string[]>();
  const candles = include.candles ? candlesByDay(hebrewYear, city, il) : new Map<number, string>();
  const gregStart = first.greg().getFullYear();

  const cover = `<section class="page cover">
<div class="brand">לוח יהודי</div>
<div class="big-year">${yearLabel(hebrewYear)}</div>
<div class="greg-years">${gregStart}–${gregStart + 1}</div>
<div class="ornament-line">✦</div>
${title ? `<div class="title">${title}</div>` : ''}
<div class="city">${escapeHtml(city.name)}</div>
</section>`;

  const pages = monthsOfYear(hebrewYear).map((m) =>
    monthPage(buildMonth(hebrewYear, m, first, il), title, include, family, candles),
  );

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>לוח יהודי ${yearLabel(hebrewYear)}</title>
<style>${styles(opts.fonts)}</style></head>
<body>
${cover}
${pages.join('\n')}
</body>
</html>`;
}
