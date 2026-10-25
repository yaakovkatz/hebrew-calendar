import { buildContactPayload, CONTACT_ERRORS, FORM_ENDPOINT, sendContact, validateContact } from '../contact';

const device = { os: 'android', osVersion: '35', appVersion: '1.0.0' };
const URL = 'https://formspree.io/f/test';

describe('validateContact', () => {
  it('requires a message', () => {
    expect(validateContact({ message: '   ', replyEmail: '' })).toBe('צריך לכתוב הודעה');
  });
  it('accepts a message with no email', () => {
    expect(validateContact({ message: 'שלום', replyEmail: '' })).toBeNull();
  });
  it('rejects an invalid email', () => {
    expect(validateContact({ message: 'שלום', replyEmail: 'not-an-email' })).toBe('כתובת המייל לא נראית תקינה');
  });
  it('accepts a valid email with spaces around it', () => {
    expect(validateContact({ message: 'שלום', replyEmail: ' a@b.co ' })).toBeNull();
  });
});

describe('buildContactPayload', () => {
  it('trims and includes email and device when asked', () => {
    expect(buildContactPayload({ kind: 'bug', message: ' קרס ', replyEmail: ' a@b.co ', includeDevice: true, device })).toEqual({
      kind: 'bug',
      kindLabel: 'תקלה',
      message: 'קרס',
      email: 'a@b.co',
      device,
    });
  });
  it('leaves out empty email and device when switched off', () => {
    const p = buildContactPayload({ kind: 'idea', message: 'רעיון', replyEmail: '', includeDevice: false, device });
    expect(p).toEqual({ kind: 'idea', kindLabel: 'רעיון', message: 'רעיון' });
  });
});

describe('sendContact', () => {
  const payload = buildContactPayload({ kind: 'question', message: 'שאלה', replyEmail: '', includeDevice: false });

  it('is not configured while the endpoint is empty', async () => {
    expect(FORM_ENDPOINT).toBe('');
    const fetchMock = jest.fn();
    expect(await sendContact(payload, fetchMock)).toEqual({ ok: false, error: CONTACT_ERRORS.notConfigured });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('posts JSON and succeeds on 2xx', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    expect(await sendContact(payload, fetchMock, URL)).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(URL);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(payload);
  });
  it('shows a friendly message on a server error', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    expect(await sendContact(payload, fetchMock, URL)).toEqual({ ok: false, error: 'לא הצלחנו לשלוח. נסו שוב.' });
  });
  it('shows the offline message when fetch throws', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    expect(await sendContact(payload, fetchMock, URL)).toEqual({ ok: false, error: 'אין חיבור לאינטרנט. נסו שוב.' });
  });
});
