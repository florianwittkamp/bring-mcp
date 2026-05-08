#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z, ZodRawShape, ZodObject } from 'zod';
import { BringClient } from './bringClient.js';
import 'dotenv/config';

import express, { Request, Response } from 'express';

import { registerListTools } from './tools/listTools.js';
import { registerItemTools } from './tools/itemTools.js';
import { registerUserTools } from './tools/userTools.js';
import { registerCatalogTools } from './tools/catalogTools.js';

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

/**
 * Creates a new MCP server instance and registers all Bring! tools.
 * Used for both stdio and per-request in stateless HTTP mode.
 */
function createMcpServer(bc: BringClient): McpServer {
  const server = new McpServer({
    name: 'bring',
    version: '1.0.0',
  });

  // Register tools from modules
  registerListTools(server, bc);
  registerItemTools(server, bc);
  registerUserTools(server, bc);
  registerCatalogTools(server, bc);

  return server;
}

async function runStdioServer(bc: BringClient) {
  const server = createMcpServer(bc);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP server for Bring! API is running on STDIO');
}

async function runHttpServer(bc: BringClient, port: number) {
  const app = express();
  app.use(express.json());

  // MCP Streamable HTTP endpoint (POST for requests)
  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      const server = createMcpServer(bc);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless mode - no session persistence between requests
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on('close', () => {
        transport.close();
        if (typeof (server as any).close === 'function') {
          (server as any).close();
        }
      });
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  // Reject other methods on /mcp with 405
  const methodNotAllowed = (req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed. MCP requests must use POST.',
      },
      id: null,
    });
  };

  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);
  app.put('/mcp', methodNotAllowed);

  app.listen(port, () => {
    console.error(`MCP server for Bring! API is running on HTTP port ${port}`);
    console.error(`  Endpoint: http://localhost:${port}/mcp (use this base URL or https://your-domain.com for Grok remote MCP)`);
    console.error('  Compatible with Grok Remote MCP Tools (Streaming HTTP transport)');
  });
}

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

  const args = process.argv.slice(2);
  const useHttp =
    args.includes('--http') ||
    args.includes('--streamable-http') ||
    !!process.env.PORT ||
    !!process.env.MCP_PORT ||
    !!process.env.HTTP_PORT;

  if (useHttp) {
    const portStr =
      process.env.PORT || process.env.MCP_PORT || process.env.HTTP_PORT || '3000';
    const port = parseInt(portStr, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error(`Invalid port: ${portStr}. Using default 3000.`);
      await runHttpServer(bc, 3000);
    } else {
      await runHttpServer(bc, port);
    }
  } else {
    await runStdioServer(bc);
  }
}

main().catch((e) => {
  console.error('Fatal error starting MCP server:', e);
  process.exit(1);
});
