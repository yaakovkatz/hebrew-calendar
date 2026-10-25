"use no memo";
import React from 'react';
import type { WidgetRepresentation } from 'react-native-android-widget';
import { loadWidgetInput } from './loadWidgetInput';
import { dateWidgetData, monthWidgetData, nextWidgetData, zmanimWidgetData, type WidgetInput } from './widgetData';
import { DateWidget, MonthWidget, NextWidget, WIDGET_DARK, WIDGET_LIGHT, ZmanimWidget, type WidgetPalette } from './Widgets';

/** Names must match app.json → react-native-android-widget → widgets[].name. */
export const WIDGET_NAMES = ['HebrewDate', 'NextUp', 'ZmanimShabbat', 'Month'] as const;

function tree(name: string, input: WidgetInput, p: WidgetPalette): React.JSX.Element {
  switch (name) {
    case 'NextUp':
      return <NextWidget data={nextWidgetData(input)} p={p} />;
    case 'ZmanimShabbat':
      return <ZmanimWidget data={zmanimWidgetData(input)} p={p} />;
    case 'Month':
      return <MonthWidget data={monthWidgetData(input)} p={p} />;
    case 'HebrewDate':
    default:
      return <DateWidget data={dateWidgetData(input.now, input.city)} p={p} />;
  }
}

/** Light and dark versions; the launcher shows the one matching the system theme. */
export function buildWidget(name: string, input: WidgetInput): WidgetRepresentation {
  return { light: tree(name, input, WIDGET_LIGHT), dark: tree(name, input, WIDGET_DARK) };
}

export async function renderWidgetByName(name: string): Promise<WidgetRepresentation> {
  return buildWidget(name, await loadWidgetInput());
}
