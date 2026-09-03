import { McpServer } from '@modelcontextprotocol/server';
import type { BringService } from './bringClient.js';
import { readPackageVersion } from './packageInfo.js';
import { registerCatalogTools } from './tools/catalogTools.js';
import { registerItemTools } from './tools/itemTools.js';
import { registerListTools } from './tools/listTools.js';
import { registerUserTools } from './tools/userTools.js';

export const SERVER_INSTRUCTIONS = [
  'Use getDefaultList when the user does not name a shopping list.',
  'If no default list is configured, call loadLists and let the user choose before changing data.',
  'Use the listUuid returned by loadLists or getDefaultList for all list-specific tools.',
  "Item-changing tools update the user's live Bring! account. Respect the tool annotations and confirm destructive actions when the client requires it.",
].join(' ');

export function createBringServer(bc: BringService, version = readPackageVersion()): McpServer {
  const server = new McpServer(
    {
      name: 'bring-mcp',
      title: 'Bring! Shopping Lists',
      version,
      description: 'Read and update Bring! shopping lists through the unofficial Bring! API.',
      websiteUrl: 'https://github.com/florianwittkamp/bring-mcp',
    },
    {
      instructions: SERVER_INSTRUCTIONS,
      cacheHints: {
        'tools/list': { ttlMs: 300_000, cacheScope: 'public' },
        'server/discover': { ttlMs: 300_000, cacheScope: 'public' },
      },
    },
  );

  registerListTools(server, bc);
  registerItemTools(server, bc);
  registerUserTools(server, bc);
  registerCatalogTools(server, bc);

  return server;
}
