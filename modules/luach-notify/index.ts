import { requireOptionalNativeModule } from 'expo';

// Android-only local module (android/): notifications in design ה1, PLAN.md "ההתראה".
// Null where the native side is missing (Jest, iOS, web, an old dev build), so callers fall back.

export type LuachNotifyItem = {
  /** Stable and unique; also the notification tag. */
  id: string;
  /** Epoch milliseconds. */
  atMs: number;
  title: string;
  body: string;
  /** 'ט״ו'; empty hides the date stub. */
  stubDay: string;
  /** 'חשוון' */
  stubMonth: string;
  channelId: string;
};

type LuachNotifyNative = {
  /** Replaces the stored plan and its alarms; resolves to how many alarms were set. */
  schedule(items: LuachNotifyItem[]): Promise<number>;
  cancelAll(): Promise<void>;
};

export const LuachNotify = requireOptionalNativeModule<LuachNotifyNative>('LuachNotify');
