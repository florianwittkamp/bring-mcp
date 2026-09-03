import { BringClient } from '../src/bringClient';
import { mockMcpServerInstance, mockTools, loadServer, getTool } from './helpers';

let consoleErrorSpy: jest.SpyInstance;

// Mock the Bring library
const mockBringLogin = jest.fn();
const mockBringLoadLists = jest.fn();
const mockBringOptions: { mail: string; password: string }[] = [];

jest.mock('bring-shopping', () => {
  return jest.fn().mockImplementation((options: { mail: string; password: string }) => {
    mockBringOptions.push(options);
    const token = JSON.stringify({
      exp: Date.now() / 1000 + 20000,
    });
    const base64Url = Buffer.from(token).toString('base64');
    return {
      login: mockBringLogin,
      loadLists: mockBringLoadLists,
      bearerToken: `a.${base64Url}.a`,
    };
  });
});

describe('BringClient Automatic Login', () => {
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
    mockBringOptions.length = 0;
    // Reset environment variables for each test to ensure isolation
    delete process.env.BRING_EMAIL;
    delete process.env.BRING_PASSWORD;
    delete process.env.MAIL;
    delete process.env.PW;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should automatically login on the first API call and succeed if credentials are valid', async () => {
    process.env.BRING_EMAIL = 'test@example.com';
    process.env.BRING_PASSWORD = 'password';

    mockBringLogin.mockResolvedValue(undefined); // Simulate successful login
    mockBringLoadLists.mockResolvedValue([]); // Simulate successful API call after login

    const client = new BringClient();
    await client.loadLists(); // First API call triggers login

    expect(mockBringLogin).toHaveBeenCalledTimes(1);
    expect(mockBringLoadLists).toHaveBeenCalledTimes(1);
    expect(mockBringOptions).toContainEqual({ mail: 'test@example.com', password: 'password' });
  });

  it('should attempt login only once for multiple API calls if successful', async () => {
    process.env.BRING_EMAIL = 'test@example.com';
    process.env.BRING_PASSWORD = 'password';

    mockBringLogin.mockResolvedValue(undefined);
    mockBringLoadLists.mockResolvedValue([]);

    const client = new BringClient();
    await client.loadLists(); // First call
    await client.loadLists(); // Second call

    expect(mockBringLogin).toHaveBeenCalledTimes(1); // Login should only happen once
    expect(mockBringLoadLists).toHaveBeenCalledTimes(2);
  });

  it('should fail the API call if automatic login fails due to invalid credentials', async () => {
    process.env.BRING_EMAIL = 'wrong@example.com';
    process.env.BRING_PASSWORD = 'wrongpassword';
    const loginError = new Error('Invalid Bring credentials');
    mockBringLogin.mockRejectedValue(loginError); // Simulate failed login

    const client = new BringClient();

    await expect(client.loadLists()).rejects.toThrow(loginError);
    expect(mockBringLogin).toHaveBeenCalledTimes(1);
    expect(mockBringLoadLists).not.toHaveBeenCalled(); // API call should not proceed
  });

  it('should re-attempt login on a subsequent API call if the first login attempt failed', async () => {
    process.env.BRING_EMAIL = 'firstfail@example.com';
    process.env.BRING_PASSWORD = 'password';
    const loginError = new Error('Login failed initially');

    // First attempt: Login fails
    mockBringLogin.mockRejectedValueOnce(loginError);
    const client = new BringClient();
    await expect(client.loadLists()).rejects.toThrow(loginError);
    expect(mockBringLogin).toHaveBeenCalledTimes(1);
    expect(mockBringLoadLists).not.toHaveBeenCalled();

    // Second attempt: Login succeeds
    mockBringLogin.mockResolvedValueOnce(undefined); // Simulate successful login on retry
    mockBringLoadLists.mockResolvedValueOnce([]); // Simulate successful API call
    await client.loadLists(); // This should re-attempt login

    expect(mockBringLogin).toHaveBeenCalledTimes(2); // Login attempted twice
    expect(mockBringLoadLists).toHaveBeenCalledTimes(1); // API call succeeds after second login
  });

  it('should fall back to legacy MAIL and PW credentials', () => {
    process.env.MAIL = 'legacy@example.com';
    process.env.PW = 'legacy-password';

    new BringClient();

    expect(mockBringOptions).toContainEqual({
      mail: 'legacy@example.com',
      password: 'legacy-password',
    });
  });

  it('should prefer BRING_EMAIL and BRING_PASSWORD over legacy aliases', () => {
    process.env.BRING_EMAIL = 'new@example.com';
    process.env.BRING_PASSWORD = 'new-password';
    process.env.MAIL = 'legacy@example.com';
    process.env.PW = 'legacy-password';

    new BringClient();

    expect(mockBringOptions).toContainEqual({ mail: 'new@example.com', password: 'new-password' });
  });
});

// The MCP server part of the tests can be removed or adapted
// if no direct 'login' tool is exposed anymore.
// For now, let's remove the MCP related tests for login tool as it doesn't exist.
describe('MCP Bring! Server - Tool Registration (Post-Login Refactor)', () => {
  beforeEach(async () => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
    mockTools.clear();
    // Ensure necessary mocks for server loading are in place if needed
    // For example, if loadServer itself tries to make API calls
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should no longer register a dedicated 'login' tool", async () => {
    // Simulate server loading to check registered tools
    // This might require mocking BringClient or its methods if loadServer uses them
    process.env.BRING_EMAIL = 'test@example.com'; // Needed for BringClient instantiation
    process.env.BRING_PASSWORD = 'password';
    mockBringLogin.mockResolvedValue(undefined); // Prevent login issues during server load

    await loadServer(); // This populates mockTools

    const loginTool = getTool('login');
    expect(loginTool).toBeUndefined(); // The login tool should not be registered
    expect(mockMcpServerInstance.registerTool).not.toHaveBeenCalledWith(
      'login',
      expect.any(Object),
      expect.any(Function),
    );
  });
});
