/// <reference types="jest" />

import { jest } from '@jest/globals';
import { mockMcpServerInstance, mockStreamableHTTPTransportInstance } from './helpers';

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

  it('should initialize StreamableHTTPServerTransport and connect McpServer when env vars are set', async () => {
    process.env.MAIL = 'test@example.com';
    process.env.PW = 'password';

    // Dynamically import to trigger script execution
    await import('../src/index.js');

    expect(mockMcpServerInstance.connect).toHaveBeenCalledTimes(1);
    expect(mockMcpServerInstance.connect).toHaveBeenCalledWith(mockStreamableHTTPTransportInstance);
    expect(mockConsoleError).toHaveBeenCalledWith('MCP server for Bring! API is running on HTTP port 3000');
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('should log an error and exit if MAIL environment variable is missing', async () => {
    delete process.env.MAIL; // MAIL is missing
    process.env.PW = 'password';

    await import('../src/index.js');

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Missing MAIL or PW environment variables'));
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockMcpServerInstance.connect).not.toHaveBeenCalled();
  });

  it('should log an error and exit if PW environment variable is missing', async () => {
    process.env.MAIL = 'test@example.com';
    delete process.env.PW; // PW is missing

    await import('../src/index.js');

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Missing MAIL or PW environment variables'));
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockMcpServerInstance.connect).not.toHaveBeenCalled();
  });

  it('should log an error and exit if both MAIL and PW environment variables are missing', async () => {
    delete process.env.MAIL;
    delete process.env.PW;

    await import('../src/index.js');

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Missing MAIL or PW environment variables'));
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockMcpServerInstance.connect).not.toHaveBeenCalled();
  });

  // Test the catch block of main
  it('should log fatal error and exit if server.connect throws', async () => {
    process.env.MAIL = 'test@example.com';
    process.env.PW = 'password';

    const connectError = new Error('Connection failed');
    mockMcpServerInstance.connect.mockRejectedValueOnce(connectError);

    await import('../src/index.js');

    expect(mockMcpServerInstance.connect).toHaveBeenCalledTimes(1);
    expect(mockConsoleError).toHaveBeenCalledWith('Fatal error starting MCP server:', connectError);
    expect(mockExit).toHaveBeenCalledWith(1);
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
    process.env.MAIL = 'test@example.com';
    process.env.PW = 'password';

    await import('../src/index.js');

    expect(mockMcpServerInstance.tool).toHaveBeenCalledTimes(expectedToolNames.length);

    for (const toolName of expectedToolNames) {
      expect(mockMcpServerInstance.tool).toHaveBeenCalledWith(
        toolName,
        expect.any(String), // description
        expect.any(Object), // schema
        expect.any(Function), // callback
      );
    }
  });
});
