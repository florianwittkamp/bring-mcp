/// <reference types="jest" />

import { jest } from '@jest/globals';
import type { BringService } from '../src/bringClient.js';

type AsyncMock = jest.MockedFunction<(...args: never[]) => Promise<unknown>>;

export const mockLoadLists = jest.fn() as AsyncMock;
export const mockGetItems = jest.fn() as AsyncMock;
export const mockGetItemsDetails = jest.fn() as AsyncMock;
export const mockSaveItem = jest.fn() as AsyncMock;
export const mockSaveItemBatch = jest.fn() as AsyncMock;
export const mockRemoveItem = jest.fn() as AsyncMock;
export const mockMoveToRecentList = jest.fn() as AsyncMock;
export const mockSaveItemImage = jest.fn() as AsyncMock;
export const mockRemoveItemImage = jest.fn() as AsyncMock;
export const mockGetAllUsersFromList = jest.fn() as AsyncMock;
export const mockGetUserSettings = jest.fn() as AsyncMock;
export const mockLoadTranslations = jest.fn() as AsyncMock;
export const mockLoadCatalog = jest.fn() as AsyncMock;
export const mockGetPendingInvitations = jest.fn() as AsyncMock;
export const mockDeleteMultipleItemsFromList = jest.fn() as AsyncMock;

export interface McpToolResult {
  content: { type: string; text: string }[];
  structuredContent?: unknown;
  isError?: boolean;
}

interface ZodObjectLike {
  shape?: Record<string, unknown>;
}

export interface McpTool {
  title: string;
  description: string;
  schema: Record<string, unknown>;
  inputSchema: unknown;
  outputSchema: unknown;
  annotations: Record<string, unknown>;
  callback: (args: Record<string, unknown>) => Promise<McpToolResult>;
}

export const mockTools = new Map<string, McpTool>();

export const mockMcpServerInstance = {
  registerTool: jest.fn(
    (
      name: string,
      config: {
        title?: string;
        description?: string;
        inputSchema?: ZodObjectLike;
        outputSchema?: unknown;
        annotations?: Record<string, unknown>;
      },
      callback: (args: Record<string, unknown>) => Promise<McpToolResult>,
    ) => {
      mockTools.set(name, {
        title: config.title ?? '',
        description: config.description ?? '',
        schema: config.inputSchema?.shape ?? {},
        inputSchema: config.inputSchema,
        outputSchema: config.outputSchema,
        annotations: config.annotations ?? {},
        callback,
      });
    },
  ),
};

export const mockMcpServerConstructor = jest.fn(() => mockMcpServerInstance);
export const mockServeStdio = jest.fn();

jest.mock('@modelcontextprotocol/server', () => ({
  McpServer: mockMcpServerConstructor,
}));

jest.mock('@modelcontextprotocol/server/stdio', () => ({
  serveStdio: mockServeStdio,
}));

jest.mock('dotenv/config', () => ({}));

const mockBringService = {
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
};

export async function loadServer(): Promise<void> {
  jest.resetModules();
  const { createBringServer } = await import('../src/server.js');
  createBringServer(mockBringService as unknown as BringService, 'test-version');
}

export function getTool(name: string): McpTool | undefined {
  return mockTools.get(name);
}
