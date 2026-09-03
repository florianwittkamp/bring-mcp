#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { z, ZodRawShape, ZodObject } from 'zod';
import { BringClient } from './bringClient.js';
import 'dotenv/config';

import { registerListTools } from './tools/listTools.js';
import { registerItemTools } from './tools/itemTools.js';
import { registerUserTools } from './tools/userTools.js';
import { registerCatalogTools } from './tools/catalogTools.js';

const server = new McpServer({
  name: 'bring',
  version: '1.0.0',
});

// const bc = new BringClient(); // Moved into main

// Define a type for content parts
type McpContentPart = { type: 'text'; text: string; [key: string]: unknown };

// Helper function to create a simple text response
function textToolResult(text: string) {
  const contentPart: McpContentPart = { type: 'text', text };
  return { content: [contentPart] };
}

// Helper function to create a JSON response (as stringified text)
function jsonToolResult(data: unknown) {
  const contentPart: McpContentPart = { type: 'text', text: JSON.stringify(data, null, 2) ?? 'null' };
  return { content: [contentPart] };
}

function structuredToolResult(data: unknown) {
  return { result: data === undefined ? null : data };
}

const outputSchema = {
  result: z.unknown().describe('The structured result returned by the Bring! API operation.'),
};

// Generic tool registration helper - Overloads
export function registerTool<TParams extends ZodRawShape, TResult, TArgs = z.infer<ZodObject<TParams>>>(options: {
  server: McpServer;
  bc: BringClient;
  name: string;
  description: string;
  schemaShape: TParams; // Non-optional for this overload
  actionFn: (args: TArgs, bc: BringClient) => Promise<TResult>;
  transformResult?: (result: TResult) => { content: McpContentPart[] };
  failureMessage: string;
  annotations: ToolAnnotations;
}): void;
export function registerTool<TResult>(options: {
  server: McpServer;
  bc: BringClient;
  name: string;
  description: string;
  schemaShape?: undefined; // Schema is undefined for this overload
  actionFn: (args: undefined, bc: BringClient) => Promise<TResult>; // Args are undefined
  transformResult?: (result: TResult) => { content: McpContentPart[] };
  failureMessage: string;
  annotations: ToolAnnotations;
}): void;
// Implementation signature for registerTool
export function registerTool(options: {
  server: McpServer;
  bc: BringClient;
  name: string;
  description: string;
  schemaShape?: ZodRawShape;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionFn: (args: any, bc: BringClient) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformResult?: (result: any) => { content: McpContentPart[] };
  failureMessage: string;
  annotations: ToolAnnotations;
}) {
  const { server, bc, name, description, schemaShape, actionFn, transformResult, failureMessage, annotations } =
    options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callback = async (args: any) => {
    try {
      const res = await actionFn(args, bc);
      if (transformResult) {
        return {
          ...transformResult(res),
          structuredContent: structuredToolResult(res),
        };
      }
      return {
        ...jsonToolResult(res),
        structuredContent: structuredToolResult(res),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`${failureMessage}:`, error);
      return {
        ...textToolResult(`${failureMessage}: ${errorMessage}`),
        isError: true,
      };
    }
  };

  server.registerTool(
    name,
    {
      description,
      inputSchema: schemaShape ?? {},
      outputSchema,
      annotations,
    },
    callback,
  );
}

// Register login tool and other tools moved into main

// Start the server
async function main() {
  const email = process.env.BRING_EMAIL ?? process.env.MAIL;
  const password = process.env.BRING_PASSWORD ?? process.env.PW;

  if (!email || !password) {
    console.error(
      'Missing BRING_EMAIL or BRING_PASSWORD environment variables. Please provide your Bring! credentials through the environment or a .env file.',
    );
    process.exit(1);
    return;
  }

  if (!process.env.BRING_EMAIL || !process.env.BRING_PASSWORD) {
    console.error(
      'Deprecation warning: MAIL and PW are legacy aliases. Please migrate to BRING_EMAIL and BRING_PASSWORD.',
    );
  }

  const bc = new BringClient(email, password); // Instantiated after env check

  // Register tools from modules
  registerListTools(server, bc);
  registerItemTools(server, bc);
  registerUserTools(server, bc);
  registerCatalogTools(server, bc);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP server for Bring! API is running on STDIO');
}

main().catch((e) => {
  console.error('Fatal error starting MCP server:', e);
  process.exit(1);
});
