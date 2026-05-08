#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z, ZodRawShape, ZodObject } from 'zod';
import { BringClient } from './bringClient.js';
import 'dotenv/config';

import express, { Request, Response } from 'express';
import cors from 'cors';
import { Scalekit } from '@scalekit-sdk/node';

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
  app.use(cors({ origin: true, credentials: false }));
  app.use(express.json());

  // === Scalekit OAuth 2.1 Configuration (optional but recommended for remote use) ===
  const SK_ENV_URL = process.env.SK_ENV_URL || '';
  const SK_CLIENT_ID = process.env.SK_CLIENT_ID || '';
  const SK_CLIENT_SECRET = process.env.SK_CLIENT_SECRET || '';
  const PROTECTED_RESOURCE_METADATA = process.env.PROTECTED_RESOURCE_METADATA || '';
  const EXPECTED_AUDIENCE =
    process.env.EXPECTED_AUDIENCE || `http://localhost:${port}/`;

  const isAuthEnabled = !!(SK_CLIENT_ID && SK_ENV_URL && PROTECTED_RESOURCE_METADATA);

  let scalekit: Scalekit | null = null;
  if (isAuthEnabled) {
    scalekit = new Scalekit(SK_ENV_URL, SK_CLIENT_ID, SK_CLIENT_SECRET);
    console.error('🔐 Scalekit OAuth 2.1 authentication ENABLED for HTTP MCP endpoint');
  } else {
    console.error('⚠️  HTTP mode running WITHOUT OAuth protection. For production/remote/Grok use, configure Scalekit env vars.');
  }

  const RESOURCE_METADATA_PATH = '/.well-known/oauth-protected-resource';
  const WWW_AUTHENTICATE_HEADER = `Bearer realm="OAuth", resource_metadata="${RESOURCE_METADATA_PATH}"`;

  // Public: OAuth Protected Resource Metadata endpoint (required for MCP OAuth discovery)
  app.get(RESOURCE_METADATA_PATH, (_req: Request, res: Response) => {
    if (!PROTECTED_RESOURCE_METADATA) {
      return res.status(500).json({ error: 'PROTECTED_RESOURCE_METADATA env var is not set' });
    }
    try {
      const metadata = JSON.parse(PROTECTED_RESOURCE_METADATA);
      res.type('application/json').send(JSON.stringify(metadata, null, 2));
    } catch (e) {
      res.status(500).json({ error: 'Invalid JSON in PROTECTED_RESOURCE_METADATA' });
    }
  });

  // Health check (public)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', oauthEnabled: isAuthEnabled, port });
  });

  // Authentication middleware (protects /mcp when Scalekit is configured)
  if (isAuthEnabled && scalekit) {
    app.use(async (req: Request, res: Response, next) => {
      // Skip public endpoints
      if (
        req.path === RESOURCE_METADATA_PATH ||
        req.path === '/health' ||
        req.method === 'OPTIONS'
      ) {
        return next();
      }

      // Only protect the MCP endpoint
      if (req.path !== '/mcp') {
        return next();
      }

      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : undefined;

      if (!token) {
        return res
          .status(401)
          .set('WWW-Authenticate', WWW_AUTHENTICATE_HEADER)
          .json({ error: 'Missing Bearer token. Please authenticate using Scalekit OAuth 2.1.' });
      }

      try {
        await scalekit.validateToken(token, { audience: [EXPECTED_AUDIENCE] });
        // Token valid - proceed to MCP handler
        next();
      } catch (error) {
        console.error('Scalekit token validation failed:', error);
        return res
          .status(401)
          .set('WWW-Authenticate', WWW_AUTHENTICATE_HEADER)
          .json({ error: 'Invalid or expired access token' });
      }
    });
  }

  // MCP Streamable HTTP endpoint (POST /mcp) - protected by middleware if auth enabled
  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      const server = createMcpServer(bc);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless mode
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

  // Reject other HTTP methods on /mcp
  const methodNotAllowed = (req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed. MCP over HTTP requires POST.',
      },
      id: null,
    });
  };

  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);
  app.put('/mcp', methodNotAllowed);

  app.listen(port, () => {
    console.error(`MCP server for Bring! API is running on HTTP port ${port}`);
    console.error(`  Endpoint: POST http://localhost:${port}/mcp`);
    if (isAuthEnabled) {
      console.error(`  🔐 Protected with Scalekit OAuth 2.1`);
      console.error(`  Metadata: http://localhost:${port}${RESOURCE_METADATA_PATH}`);
      console.error(`  → Register your server URL in Scalekit dashboard (include trailing / if required)`);
      console.error(`  → Clients (Grok etc.) must send valid Bearer token in Authorization header`);
    } else {
      console.error(`  ⚠️  No authentication - suitable for local testing only`);
    }
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
