/// <reference types="jest" />

import { jest } from '@jest/globals';
import { loadServer, mockMcpServerConstructor, mockMcpServerInstance, mockServeStdio, mockTools } from './helpers';

const expectedToolNames = [
  'loadLists',
  'getItems',
  'getItemsDetails',
  'saveItem',
  'saveItemBatch',
  'removeItem',
  'moveToRecentList',
  'saveItemImage',
  'removeItemImage',
  'deleteMultipleItemsFromList',
  'getAllUsersFromList',
  'getUserSettings',
  'getPendingInvitations',
  'getDefaultList',
  'loadTranslations',
  'loadCatalog',
];

describe('MCP Bring! server integration', () => {
  const originalEnvironment = process.env;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTools.clear();
    process.env = { ...originalEnvironment };
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = originalEnvironment;
    consoleErrorSpy.mockRestore();
  });

  it('resolves current credential names and prefers them over legacy aliases', async () => {
    const { resolveCredentials } = await import('../src/index.js');

    expect(
      resolveCredentials({
        BRING_EMAIL: 'current@example.com',
        BRING_PASSWORD: 'current-password',
        MAIL: 'legacy@example.com',
        PW: 'legacy-password',
      }),
    ).toEqual({
      email: 'current@example.com',
      password: 'current-password',
      usesLegacyNames: false,
    });
  });

  it('supports MAIL and PW as deprecated aliases', async () => {
    const { resolveCredentials } = await import('../src/index.js');

    expect(resolveCredentials({ MAIL: 'legacy@example.com', PW: 'legacy-password' })).toEqual({
      email: 'legacy@example.com',
      password: 'legacy-password',
      usesLegacyNames: true,
    });
  });

  it('rejects missing credentials', async () => {
    const { resolveCredentials } = await import('../src/index.js');

    expect(() => resolveCredentials({ BRING_EMAIL: 'test@example.com' })).toThrow(
      'Missing BRING_EMAIL or BRING_PASSWORD environment variables',
    );
    expect(() => resolveCredentials({ BRING_PASSWORD: 'password' })).toThrow(
      'Missing BRING_EMAIL or BRING_PASSWORD environment variables',
    );
  });

  it('starts the v2 stdio dispatcher with legacy compatibility enabled', async () => {
    process.env.BRING_EMAIL = 'test@example.com';
    process.env.BRING_PASSWORD = 'password';
    delete process.env.MAIL;
    delete process.env.PW;
    const { main } = await import('../src/index.js');

    main();

    expect(mockServeStdio).toHaveBeenCalledWith(expect.any(Function), {
      legacy: 'serve',
      onerror: expect.any(Function),
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringMatching(/^MCP server for Bring! API v.+ is running/));
  });

  it('logs the credential deprecation warning during startup', async () => {
    delete process.env.BRING_EMAIL;
    delete process.env.BRING_PASSWORD;
    process.env.MAIL = 'legacy@example.com';
    process.env.PW = 'legacy-password';
    const { main } = await import('../src/index.js');

    main();

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Deprecation warning'));
  });

  it('registers exactly 16 fully described tools', async () => {
    await loadServer();

    expect(mockMcpServerConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'bring-mcp',
        title: 'Bring! Shopping Lists',
        version: 'test-version',
        websiteUrl: expect.stringContaining('github.com'),
      }),
      expect.objectContaining({ instructions: expect.stringContaining('getDefaultList') }),
    );
    expect(mockMcpServerInstance.registerTool).toHaveBeenCalledTimes(expectedToolNames.length);
    expect([...mockTools.keys()]).toEqual(expectedToolNames);

    for (const tool of mockTools.values()) {
      expect(tool.title).not.toBe('');
      expect(tool.description).not.toBe('');
      expect(tool.inputSchema).toEqual(expect.objectContaining({ '~standard': expect.any(Object) }));
      expect(tool.outputSchema).toEqual(expect.objectContaining({ '~standard': expect.any(Object) }));
      expect(tool.annotations).toEqual(
        expect.objectContaining({
          readOnlyHint: expect.any(Boolean),
          destructiveHint: expect.any(Boolean),
          idempotentHint: expect.any(Boolean),
          openWorldHint: true,
        }),
      );
    }
  });
});
