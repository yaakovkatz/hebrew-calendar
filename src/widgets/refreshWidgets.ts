import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { loadWidgetInput } from './loadWidgetInput';
import { buildWidget, WIDGET_NAMES } from './renderWidget';

/**
 * Redraws every widget on the home screen. Call after saving events, reminders or settings.
 * Best effort: never throws, does nothing off Android.
 */
export async function refreshWidgets(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const input = await loadWidgetInput();
    await Promise.all(
      WIDGET_NAMES.map((widgetName) =>
        requestWidgetUpdate({ widgetName, renderWidget: () => buildWidget(widgetName, input) }).catch(() => {}),
      ),
    );
  } catch {
    // The periodic update will catch up.
  }
}
