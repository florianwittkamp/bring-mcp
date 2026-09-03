import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BringClient } from '../bringClient.js';
import { registerTool } from '../index.js';
import { READ_ONLY_TOOL_ANNOTATIONS } from '../toolAnnotations.js';

export function registerCatalogTools(server: McpServer, bc: BringClient) {
  const loadTranslationsParams = z.object({
    locale: z
      .string()
      .optional()
      .describe("The locale for translations (e.g., 'de-DE', 'fr-FR'). Defaults to 'en-US' if not provided."),
  });
  registerTool({
    server,
    bc,
    name: 'loadTranslations',
    description:
      "Load translations for item names and other UI elements. Optionally specify a locale (e.g., 'de-DE', 'en-US'). Defaults to 'en-US'.",
    schemaShape: loadTranslationsParams.shape,
    actionFn: async (args: z.infer<typeof loadTranslationsParams>, bc: BringClient) => bc.loadTranslations(args.locale),
    failureMessage: 'Failed to load translations',
    annotations: READ_ONLY_TOOL_ANNOTATIONS,
  });

  const loadCatalogParams = z.object({
    locale: z.string().describe("The locale for the catalog (e.g., 'de-DE', 'en-US')."),
  });
  registerTool({
    server,
    bc,
    name: 'loadCatalog',
    description: 'Load the Bring! catalog for a specific locale. This contains standard items.',
    schemaShape: loadCatalogParams.shape,
    actionFn: async (args: z.infer<typeof loadCatalogParams>, bc: BringClient) => bc.loadCatalog(args.locale),
    failureMessage: 'Failed to load catalog',
    annotations: READ_ONLY_TOOL_ANNOTATIONS,
  });
}
