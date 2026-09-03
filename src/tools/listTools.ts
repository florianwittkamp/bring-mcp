import { McpServer } from '@modelcontextprotocol/server';
import type { BringService } from '../bringClient.js';
import { registerTool } from '../registerTool.js';
import { noArgsSchema } from '../schemaShared.js';
import { READ_ONLY_TOOL_ANNOTATIONS } from '../toolAnnotations.js';
import { loadListsOutputSchema } from '../toolSchemas.js';

export function registerListTools(server: McpServer, bc: BringService) {
  registerTool({
    server,
    bc,
    name: 'loadLists',
    title: 'Load Shopping Lists',
    description: 'Load all shopping lists from Bring!',
    inputSchema: noArgsSchema,
    outputSchema: loadListsOutputSchema,
    actionFn: async (_args, bc) => loadListsOutputSchema.parse(await bc.loadLists()),
    failureMessage: 'Failed to load lists',
    annotations: READ_ONLY_TOOL_ANNOTATIONS,
  });
}
