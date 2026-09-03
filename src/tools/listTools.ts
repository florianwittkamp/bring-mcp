import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// import { z } from 'zod'; // Removed as z is unused
import { BringClient } from '../bringClient.js';
import { registerTool } from '../index.js'; // Assuming registerTool will be exported from index.ts
import { READ_ONLY_TOOL_ANNOTATIONS } from '../toolAnnotations.js';

export function registerListTools(server: McpServer, bc: BringClient) {
  registerTool({
    server,
    bc,
    name: 'loadLists',
    description: 'Load all shopping lists from Bring!',
    schemaShape: undefined, // Explicitly undefined for no-args tool
    actionFn: async (_args: undefined, bc: BringClient) => bc.loadLists(),
    failureMessage: 'Failed to load lists',
    annotations: READ_ONLY_TOOL_ANNOTATIONS,
  });

  // Add other list-related tools here if any in the future
}
