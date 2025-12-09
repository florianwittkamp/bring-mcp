#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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
  const contentPart: McpContentPart = { type: 'text', text: JSON.stringify(data, null, 2) };
  return { content: [contentPart] };
}

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
}) {
  const { server, bc, name, description, schemaShape, actionFn, transformResult, failureMessage } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callback = async (args: any) => {
    try {
      const res = await actionFn(args, bc);
      if (transformResult) {
        return transformResult(res);
      }
      return jsonToolResult(res);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`${failureMessage}:`, error);
      return textToolResult(`${failureMessage}: ${errorMessage}`);
    }
  };

  if (schemaShape) {
    server.tool(name, description, schemaShape, callback);
  } else {
    server.tool(name, description, {}, callback);
  }
}

// Register login tool and other tools moved into main

// Start the server
async function main() {
  if (!process.env.MAIL || !process.env.PW) {
    console.error(
      'Missing MAIL or PW environment variables. Please create a .env file with your Bring credentials (e.g., MAIL=your_email@example.com\nPW=your_password).',
    );
    process.exit(1);
    return;
  }

  const bc = new BringClient(); // Instantiated after env check

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
