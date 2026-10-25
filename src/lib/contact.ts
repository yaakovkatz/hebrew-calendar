import Constants from 'expo-constants';
import { Platform } from 'react-native';

// TODO(owner): create a Formspree form and paste its endpoint here,
// e.g. 'https://formspree.io/f/xxxxxxxx'. While empty, sending shows a friendly
// "not set up yet" message. The endpoint is public by design (no secret key).
export const FORM_ENDPOINT = '';

export type ContactKind = 'question' | 'bug' | 'idea';

export const KIND_LABEL: Record<ContactKind, string> = {
  question: 'שאלה',
  bug: 'תקלה',
  idea: 'רעיון',
};

/** Only the OS and the app version. Never names, dates or anything personal. */
export type DeviceInfo = { os: string; osVersion: string; appVersion: string };

export type ContactInput = {
  kind: ContactKind;
  message: string;
  replyEmail: string;
  includeDevice: boolean;
  device?: DeviceInfo;
};

export type ContactPayload = {
  kind: ContactKind;
  kindLabel: string;
  message: string;
  email?: string;
  device?: DeviceInfo;
};

export type SendResult = { ok: true } | { ok: false; error: string };

// User-facing messages. Never show raw technical errors (CLAUDE.md).
export const CONTACT_ERRORS = {
  emptyMessage: 'צריך לכתוב הודעה',
  badEmail: 'כתובת המייל לא נראית תקינה',
  notConfigured: 'השליחה עוד לא מוגדרת. נסו שוב בקרוב.',
  offline: 'אין חיבור לאינטרנט. נסו שוב.',
  failed: 'לא הצלחנו לשלוח. נסו שוב.',
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact({ message, replyEmail }: Pick<ContactInput, 'message' | 'replyEmail'>): string | null {
  if (!message.trim()) return CONTACT_ERRORS.emptyMessage;
  const email = replyEmail.trim();
  if (email && !EMAIL_RE.test(email)) return CONTACT_ERRORS.badEmail;
  return null;
}

export function buildContactPayload({ kind, message, replyEmail, includeDevice, device }: ContactInput): ContactPayload {
  const payload: ContactPayload = { kind, kindLabel: KIND_LABEL[kind], message: message.trim() };
  const email = replyEmail.trim();
  if (email) payload.email = email;
  if (includeDevice && device) payload.device = device;
  return payload;
}

export function currentDevice(): DeviceInfo {
  return {
    os: Platform.OS,
    osVersion: String(Platform.Version),
    appVersion: Constants.expoConfig?.version ?? '',
  };
}

export async function sendContact(
  payload: ContactPayload,
  fetchImpl: typeof fetch = fetch,
  endpoint: string = FORM_ENDPOINT,
): Promise<SendResult> {
  if (!endpoint) return { ok: false, error: CONTACT_ERRORS.notConfigured };
  let res: Response;
  try {
    res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, error: CONTACT_ERRORS.offline };
  }
  return res.ok ? { ok: true } : { ok: false, error: CONTACT_ERRORS.failed };
}
