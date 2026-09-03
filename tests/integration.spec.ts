/// <reference types="jest" />

import { jest } from '@jest/globals';
import { mockMcpServerInstance, mockStdioServerTransportInstance } from './helpers'; // Assuming StdioServerTransport is also mocked in helpers

// Store original process.env
const originalEnv = process.env;
const originalProcessExit = process.exit;
const originalConsoleError = console.error;

describe('MCP Bring! Server - Integration Tests (Main Entry Point)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockExit: any; // Using any as a last resort for SpyInstance type issue
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockConsoleError: any; // Using any as a last resort for SpyInstance type issue

  beforeEach(() => {
    jest.resetModules(); // Important to re-import src/index.js with fresh state
    jest.clearAllMocks();

    // Restore process.env to a clone of its original state before each test
    process.env = { ...originalEnv };
    process.exit = originalProcessExit; // Restore original process.exit
    console.error = originalConsoleError; // Restore original console.error

    // Mock process.exit to prevent tests from terminating and to spy on it
    mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {
      // Do nothing, effectively preventing exit
    }) as (code?: string | number | null | undefined) => never);

    // Spy on console.error
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Ensure mocks from helpers are clean (McpServer.connect and StdioServerTransport constructor)
    // The mocks themselves are set up in helpers.ts
  });

  afterEach(() => {
    // Restore original process.env, process.exit and console.error
    process.env = originalEnv;
    process.exit = originalProcessExit;
    console.error = originalConsoleError;
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should initialize StdioServerTransport and connect McpServer when env vars are set', async () => {
    process.env.BRING_EMAIL = 'test@example.com';
    process.env.BRING_PASSWORD = 'password';

    // Dynamically import to trigger script execution
    await import('../src/index.js');

    // Check if StdioServerTransport constructor was called (via the mock in helpers.ts)
    // No direct way to check constructor call count of the class itself, but McpServer.connect uses its instance.
    // We rely on the mockMcpServerInstance.connect to have been called with the instance from mockStdioServerTransportInstance.
    expect(mockMcpServerInstance.connect).toHaveBeenCalledTimes(1);
    expect(mockMcpServerInstance.connect).toHaveBeenCalledWith(mockStdioServerTransportInstance); // Ensure it's called with the correct transport instance
    expect(mockConsoleError).toHaveBeenCalledWith('MCP server for Bring! API is running on STDIO');
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('should log an error and exit if BRING_EMAIL and its legacy alias are missing', async () => {
    delete process.env.BRING_EMAIL;
    delete process.env.MAIL;
    process.env.BRING_PASSWORD = 'password';

    await import('../src/index.js');

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining('Missing BRING_EMAIL or BRING_PASSWORD environment variables'),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockMcpServerInstance.connect).not.toHaveBeenCalled();
  });

  it('should log an error and exit if BRING_PASSWORD and its legacy alias are missing', async () => {
    process.env.BRING_EMAIL = 'test@example.com';
    delete process.env.BRING_PASSWORD;
    delete process.env.PW;

    await import('../src/index.js');

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining('Missing BRING_EMAIL or BRING_PASSWORD environment variables'),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockMcpServerInstance.connect).not.toHaveBeenCalled();
  });

  it('should log an error and exit if all supported credential environment variables are missing', async () => {
    delete process.env.BRING_EMAIL;
    delete process.env.BRING_PASSWORD;
    delete process.env.MAIL;
    delete process.env.PW;

    await import('../src/index.js');

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining('Missing BRING_EMAIL or BRING_PASSWORD environment variables'),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockMcpServerInstance.connect).not.toHaveBeenCalled();
  });

  // Test the catch block of main
  it('should log fatal error and exit if server.connect throws', async () => {
    process.env.BRING_EMAIL = 'test@example.com';
    process.env.BRING_PASSWORD = 'password';

    const connectError = new Error('Connection failed');
    mockMcpServerInstance.connect.mockRejectedValueOnce(connectError);

    await import('../src/index.js');

    expect(mockMcpServerInstance.connect).toHaveBeenCalledTimes(1);
    expect(mockConsoleError).toHaveBeenCalledWith('Fatal error starting MCP server:', connectError);
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should support MAIL and PW as deprecated aliases', async () => {
    delete process.env.BRING_EMAIL;
    delete process.env.BRING_PASSWORD;
    process.env.MAIL = 'legacy@example.com';
    process.env.PW = 'legacy-password';

    await import('../src/index.js');

    expect(mockMcpServerInstance.connect).toHaveBeenCalledTimes(1);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Deprecation warning'));
  });

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
    'getAllUsersFromList',
    'getUserSettings',
    'loadTranslations',
    'loadCatalog',
    'getPendingInvitations',
    'deleteMultipleItemsFromList',
    'getDefaultList',
  ];

  it('should register all expected tools on McpServer', async () => {
    process.env.BRING_EMAIL = 'test@example.com';
    process.env.BRING_PASSWORD = 'password';

    await import('../src/index.js');

    expect(mockMcpServerInstance.registerTool).toHaveBeenCalledTimes(expectedToolNames.length);

    for (const toolName of expectedToolNames) {
      expect(mockMcpServerInstance.registerTool).toHaveBeenCalledWith(
        toolName,
        expect.objectContaining({
          description: expect.any(String),
          inputSchema: expect.any(Object),
          outputSchema: expect.objectContaining({ result: expect.anything() }),
          annotations: expect.objectContaining({
            readOnlyHint: expect.any(Boolean),
            destructiveHint: expect.any(Boolean),
            idempotentHint: expect.any(Boolean),
            openWorldHint: true,
          }),
        }),
        expect.any(Function),
      );
    }
  });
});
