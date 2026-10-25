import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { renderWidgetByName } from './renderWidget';

/** Runs headless for every widget event. Taps use clickAction="OPEN_APP", handled natively. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(await renderWidgetByName(props.widgetInfo.widgetName));
      break;
    default:
      break;
  }
}
