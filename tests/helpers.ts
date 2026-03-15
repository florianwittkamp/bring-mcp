/// <reference types="jest" />

// tests/helpers.ts
import { jest } from '@jest/globals'; // Import jest globals
// import type { McpServer, StdioServerTransport } from '@modelcontextprotocol/sdk'; // Commenting out for now
// import type { BringClient } from '../src/bringClient'; // Removed unused import

// Mock functions for BringClient methods
export let mockLogin: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
export let mockLoadLists: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
export let mockGetItems: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
export let mockGetItemsDetails: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
export let mockSaveItem: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
export let mockSaveItemBatch: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
export let mockRemoveItem: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
export let mockMoveToRecentList: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
export let mockSaveItemImage: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
export let mockRemoveItemImage: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
export let mockGetAllUsersFromList: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
export let mockGetUserSettings: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
export let mockLoadTranslations: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
export let mockLoadCatalog: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
export let mockGetPendingInvitations: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
export let mockDeleteMultipleItemsFromList: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;

// --- Mock for StreamableHTTPServerTransport ---
export const mockStreamableHTTPTransportInstance = {
  handleRequest: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
};

jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: jest.fn(() => mockStreamableHTTPTransportInstance),
}));

// --- Mock for node:http ---
export const mockHttpServerInstance = {
  listen: jest.fn(),
};

jest.mock('node:http', () => ({
  createServer: jest.fn(() => mockHttpServerInstance),
}));

jest.mock('../src/bringClient.js', () => {
  mockLogin = jest.fn();
  mockLoadLists = jest.fn();
  mockGetItems = jest.fn();
  mockGetItemsDetails = jest.fn();
  mockSaveItem = jest.fn();
  mockSaveItemBatch = jest.fn();
  mockRemoveItem = jest.fn();
  mockMoveToRecentList = jest.fn();
  mockSaveItemImage = jest.fn();
  mockRemoveItemImage = jest.fn();
  mockGetAllUsersFromList = jest.fn();
  mockGetUserSettings = jest.fn();
  mockLoadTranslations = jest.fn();
  mockLoadCatalog = jest.fn();
  mockGetPendingInvitations = jest.fn();
  mockDeleteMultipleItemsFromList = jest.fn();

  return {
    BringClient: jest.fn().mockImplementation(() => ({
      loadLists: mockLoadLists,
      getItems: mockGetItems,
      getItemsDetails: mockGetItemsDetails,
      saveItem: mockSaveItem,
      saveItemBatch: mockSaveItemBatch,
      removeItem: mockRemoveItem,
      moveToRecentList: mockMoveToRecentList,
      saveItemImage: mockSaveItemImage,
      removeItemImage: mockRemoveItemImage,
      getAllUsersFromList: mockGetAllUsersFromList,
      getUserSettings: mockGetUserSettings,
      loadTranslations: mockLoadTranslations,
      loadCatalog: mockLoadCatalog,
      getPendingInvitations: mockGetPendingInvitations,
      deleteMultipleItemsFromList: mockDeleteMultipleItemsFromList,
    })),
    connect: jest.fn(),
    listen: jest.fn(), // Adding listen as it might be called by connect
  };
});

export interface McpTool {
  description: string;
  schema: Record<string, unknown>;
  callback: (...args: Record<string, unknown>[]) => Promise<{ content: { type: string; text: string }[] }>;
}

export const mockTools: Map<string, McpTool> = new Map();

export const mockMcpServerInstance = {
  tool: jest.fn(
    (
      name: string,
      description: string,
      schema: Record<string, unknown>,
      callback: (...args: Record<string, unknown>[]) => Promise<{ content: { type: string; text: string }[] }>,
    ) => {
      mockTools.set(name, { description, schema, callback });
    },
  ),
  connect: jest.fn<() => Promise<void>>(),
  listen: jest.fn(),
};

jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn(() => mockMcpServerInstance),
}));

jest.mock('dotenv/config', () => ({}));

export async function loadServer() {
  jest.resetModules();
  process.env.MAIL = 'test@example.com';
  process.env.PW = 'testpassword';
  await import('../src/index.js');
}

export function getTool(name: string): McpTool | undefined {
  return mockTools.get(name);
}

// Ensure all mock variables are exported correctly
// ... existing code ...
// Keep track of mock functions for BringClient methods
// export let mockLogin: jest.Mock;
// export let mockLoadLists: jest.Mock;
// export let mockGetItems: jest.Mock;
// export let mockGetItemsDetails: jest.Mock;
// export let mockSaveItem: jest.Mock;
// export let mockRemoveItem: jest.Mock;
// export let mockMoveToRecentList: jest.Mock;
// export let mockSaveItemImage: jest.Mock;
// export let mockRemoveItemImage: jest.Mock;
// export let mockGetAllUsersFromList: jest.Mock;
// export let mockGetUserSettings: jest.Mock;
// export let mockLoadTranslations: jest.Mock;
// export let mockLoadCatalog: jest.Mock;
// export let mockGetPendingInvitations: jest.Mock;

// jest.mock('../src/bringClient.js', () => {
//   mockLogin = jest.fn();
//   mockLoadLists = jest.fn();
//   mockGetItems = jest.fn();
//   mockGetItemsDetails = jest.fn();
//   mockSaveItem = jest.fn();
//   mockRemoveItem = jest.fn();
//   mockMoveToRecentList = jest.fn();
//   mockSaveItemImage = jest.fn();
//   mockRemoveItemImage = jest.fn();
//   mockGetAllUsersFromList = jest.fn();
//   mockGetUserSettings = jest.fn();
//   mockLoadTranslations = jest.fn();
//   mockLoadCatalog = jest.fn();
//   mockGetPendingInvitations = jest.fn();

//   return {
//     BringClient: jest.fn().mockImplementation(() => ({
//       login: mockLogin,
//       loadLists: mockLoadLists,
//       getItems: mockGetItems,
//       getItemsDetails: mockGetItemsDetails,
//       saveItem: mockSaveItem,
//       removeItem: mockRemoveItem,
//       moveToRecentList: mockMoveToRecentList,
//       saveItemImage: mockSaveItemImage,
//       removeItemImage: mockRemoveItemImage,
//       getAllUsersFromList: mockGetAllUsersFromList,
//       getUserSettings: mockGetUserSettings,
//       loadTranslations: mockLoadTranslations,
//       loadCatalog: mockLoadCatalog,
//       getPendingInvitations: mockGetPendingInvitations,
//     })),
//   };
// });

// // --- Mocking McpServer ---
// export const mockTools: Map<
//   string,
//   {
//     description: string;
//     schema: Record<string, unknown>;
//     callback: (...args: Record<string, unknown>[]) => Promise<Record<string, unknown>>;
//   }
// > = new Map();

// export const mockMcpServerInstance = {
//   tool: jest.fn((name, description, schema, callback) => {
//     mockTools.set(name, { description, schema, callback });
//   }),
//   connect: jest.fn(),
//   // Add any other methods of McpServer that are used if necessary
// };

// jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
//   McpServer: jest.fn(() => mockMcpServerInstance),
// }));

// // --- Mocking StdioServerTransport ---
// jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
//   StdioServerTransport: jest.fn(() => ({})),
// }));

// // --- Mocking dotenv ---
// jest.mock('dotenv/config', () => ({})); // This will mock the side-effect import

// // --- Test Setup ---
// export async function loadServer() {
//   jest.resetModules(); // Reset modules to ensure index.ts is re-evaluated

//   // Set up process.env before index.ts is loaded
//   process.env.MAIL = 'test@example.com';
//   process.env.PW = 'testpassword';

//   // Dynamically import index.ts AFTER mocks are set up
//   // The path to index.js needs to be relative to this helpers.ts file,
//   // or an absolute path, or use module path aliases if configured
//   await import('../src/index.js'); // Adjusted path, assuming index.js is in src/
// }

// // Utility to get a registered tool (optional, but can be handy)
// export function getTool(name: string) {
//   const tool = mockTools.get(name);
//   if (!tool) {
//     throw new Error(`Tool "${name}" not found. Make sure it was registered.`);
//   }
//   return tool;
// }
