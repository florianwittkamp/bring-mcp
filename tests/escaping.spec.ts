/**
 * The legacy list-mutation endpoint takes a form body. `bring-shopping` builds
 * that body by string concatenation with no escaping, so a name containing
 * `&`, `+` or `%` corrupts the request - and because the library also never
 * checks the response status, the corruption is silent.
 *
 * These drive the real BringClient with `fetch` stubbed, and assert on the
 * bytes that actually go out.
 */
import { BringClient } from '../src/bringClient';

const mockLogin = jest.fn();

jest.mock('bring-shopping', () => {
  const token = JSON.stringify({ exp: Date.now() / 1000 + 20000 });
  const base64Url = Buffer.from(token).toString('base64');
  return jest.fn().mockImplementation(() => ({
    login: mockLogin,
    bearerToken: `a.${base64Url}.a`,
    headers: { Authorization: 'Bearer test', 'X-BRING-USER-UUID': 'user-uuid' },
  }));
});

const LIST = '11111111-2222-4333-8444-555555555555';
let sent: { url: string; body: string }[] = [];

describe('legacy list mutation encoding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BRING_EMAIL = 'test@example.com';
    process.env.BRING_PASSWORD = 'pw';
    sent = [];
    global.fetch = jest.fn().mockImplementation((url: string, init: { body?: string }) => {
      sent.push({ url: String(url), body: String(init?.body ?? '') });
      return Promise.resolve({ ok: true, status: 204, text: () => Promise.resolve('') });
    }) as unknown as typeof fetch;
  });

  const bodyOf = (i: number) => new URLSearchParams(sent[i].body);

  test('does not truncate a name containing an ampersand', async () => {
    await new BringClient().saveItem(LIST, 'Fish & Chips', '');
    // Concatenation sent `purchase=Fish & Chips`, so the server stored "Fish".
    expect(bodyOf(0).get('purchase')).toBe('Fish & Chips');
  });

  test('does not turn a plus into a space', async () => {
    await new BringClient().saveItem(LIST, 'Salt + Pepper', '');
    expect(bodyOf(0).get('purchase')).toBe('Salt + Pepper');
  });

  test('survives a percent sign', async () => {
    await new BringClient().saveItem(LIST, '50% Cream', '');
    expect(bodyOf(0).get('purchase')).toBe('50% Cream');
  });

  test('escapes the specification too', async () => {
    await new BringClient().saveItem(LIST, 'Milk', '1 & 1/2 L');
    expect(bodyOf(0).get('specification')).toBe('1 & 1/2 L');
  });

  test('escapes names on the remove and recently paths', async () => {
    const bc = new BringClient();
    await bc.removeItem(LIST, 'Fish & Chips');
    await bc.moveToRecentList(LIST, 'Salt + Pepper');
    expect(bodyOf(0).get('remove')).toBe('Fish & Chips');
    expect(bodyOf(1).get('recently')).toBe('Salt + Pepper');
  });

  test('escapes names when removing multiple items', async () => {
    await new BringClient().deleteMultipleItemsFromList(LIST, ['Fish & Chips', 'Salt + Pepper']);
    expect(bodyOf(0).get('remove')).toBe('Fish & Chips');
    expect(bodyOf(1).get('remove')).toBe('Salt + Pepper');
  });

  test('throws instead of silently reporting success on a non-2xx', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    }) as unknown as typeof fetch;
    await expect(new BringClient().saveItem(LIST, 'Milk', '')).rejects.toThrow(/failed \(500\)/);
  });
});
