"use no memo";
// Home-screen widgets (design/screens.html → "מחוץ לאפליקציה" → "ווידג׳טים").
// The library draws each widget to a bitmap with a left-to-right root view, so rows
// are mirrored by hand (RtlRow) and text is right-aligned explicitly.
import React from 'react';
import { FlexWidget, TextWidget, type HexColor } from 'react-native-android-widget';
import type { DateWidgetData, MonthWidgetData, NextWidgetData, ZmanimWidgetData } from './widgetData';

// Same values as src/theme/tokens.ts (that file pulls in a React hook, so the colors are copied).
export type WidgetPalette = Record<'paper' | 'ink' | 'muted' | 'today' | 'red' | 'sun', HexColor>;

export const WIDGET_LIGHT: WidgetPalette = {
  paper: '#F6F0E4',
  ink: '#2B2118',
  muted: '#9A8B73',
  today: '#EADFC8',
  red: '#A32D2D',
  sun: '#B5651D',
};

export const WIDGET_DARK: WidgetPalette = {
  paper: '#17140F',
  ink: '#EDE4D3',
  muted: '#8C8170',
  today: '#2C261D',
  red: '#E8806F',
  sun: '#EF9F27',
};

// Font files are copied by the widget config plugin; the name is the file name.
const SERIF = 'FrankRuhlLibre_400Regular';
const SANS = 'Heebo_400Regular';

function Card({ p, children, padding = 12 }: { p: WidgetPalette; children: React.ReactNode; padding?: number }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: p.paper,
        borderRadius: 16,
        padding,
        flexDirection: 'column',
      }}
    >
      {children}
    </FlexWidget>
  );
}

/** A row laid out right-to-left: the first child ends up on the right. */
function RtlRow({ children, style }: { children: React.ReactNode; style?: object }) {
  const items = React.Children.toArray(children).reverse();
  return <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', ...style }}>{items}</FlexWidget>;
}

export function DateWidget({ data, p }: { data: DateWidgetData; p: WidgetPalette }) {
  return (
    <Card p={p}>
      <FlexWidget style={{ flex: 1, width: 'match_parent', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <TextWidget text={data.weekday} style={{ fontFamily: SANS, fontSize: 12, color: data.weekday === 'שבת' ? p.red : p.muted }} />
        <TextWidget text={data.day} style={{ fontFamily: SERIF, fontSize: 44, color: p.ink }} />
        <TextWidget text={data.month} style={{ fontFamily: SERIF, fontSize: 16, color: p.ink }} />
      </FlexWidget>
    </Card>
  );
}

export function NextWidget({ data, p }: { data: NextWidgetData; p: WidgetPalette }) {
  const empty = data.kind === 'empty';
  return (
    <Card p={p} padding={14}>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'column', alignItems: 'flex-end' }}>
        <TextWidget text={data.when} style={{ fontFamily: SANS, fontSize: 12, color: p.muted, textAlign: 'right' }} />
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'column', alignItems: 'flex-end', marginTop: 6 }}>
        <TextWidget
          text={data.title}
          maxLines={3}
          truncate="END"
          style={{ fontFamily: SERIF, fontSize: empty ? 16 : 19, color: empty ? p.muted : p.ink, textAlign: 'right' }}
        />
      </FlexWidget>
    </Card>
  );
}

export function ZmanimWidget({ data, p }: { data: ZmanimWidgetData; p: WidgetPalette }) {
  const col = (align: 'flex-start' | 'flex-end') =>
    ({ flex: 1, height: 'match_parent', flexDirection: 'column', alignItems: align }) as const;
  const textAlign = (a: 'flex-start' | 'flex-end') => (a === 'flex-end' ? 'right' : 'left') as 'right' | 'left';
  const right = 'flex-end';
  const left = 'flex-start';
  return (
    <Card p={p} padding={14}>
      <RtlRow style={{ flex: 1 }}>
        <FlexWidget style={col(right)}>
          <TextWidget text="הזמן הבא" style={{ fontFamily: SANS, fontSize: 12, color: p.muted, textAlign: textAlign(right) }} />
          <TextWidget text={data.nextTitle ?? '—'} style={{ fontFamily: SERIF, fontSize: 18, color: p.ink, marginTop: 2 }} />
          <TextWidget text={data.nextTime ?? ''} style={{ fontFamily: SERIF, fontSize: 26, color: p.sun }} />
        </FlexWidget>
        <FlexWidget style={col(left)}>
          {data.shabbatTitle ? (
            <TextWidget text={data.shabbatTitle} maxLines={1} truncate="END" style={{ fontFamily: SANS, fontSize: 12, color: p.muted, textAlign: textAlign(left) }} />
          ) : null}
          {data.candles ? <TextWidget text={data.candles} style={{ fontFamily: SERIF, fontSize: 16, color: p.red, marginTop: 4 }} /> : null}
          {data.havdalah ? <TextWidget text={data.havdalah} style={{ fontFamily: SERIF, fontSize: 16, color: p.ink }} /> : null}
        </FlexWidget>
      </RtlRow>
    </Card>
  );
}

export function MonthWidget({ data, p }: { data: MonthWidgetData; p: WidgetPalette }) {
  const cell = (key: string, text: string, color: HexColor, bg?: HexColor, font = SERIF, size = 14) => (
    <FlexWidget
      key={key}
      style={{
        flex: 1,
        height: 'match_parent',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        ...(bg ? { backgroundColor: bg } : {}),
      }}
    >
      <TextWidget text={text} style={{ fontFamily: font, fontSize: size, color }} />
    </FlexWidget>
  );
  return (
    <Card p={p} padding={10}>
      <FlexWidget style={{ width: 'match_parent', alignItems: 'center' }}>
        <TextWidget text={data.title} style={{ fontFamily: SERIF, fontSize: 16, color: p.ink }} />
      </FlexWidget>
      <RtlRow style={{ height: 22, marginTop: 4 }}>
        {data.weekdays.map((w, i) => cell(`w${i}`, w, i === 6 ? p.red : p.muted, undefined, SANS, 11))}
      </RtlRow>
      {data.weeks.map((week, wi) => (
        <RtlRow key={`r${wi}`} style={{ flex: 1, marginTop: 2 }}>
          {week.map((c, ci) => cell(`c${wi}-${ci}`, c.label, c.isShabbat ? p.red : p.ink, c.isToday ? p.today : undefined))}
        </RtlRow>
      ))}
    </Card>
  );
}
