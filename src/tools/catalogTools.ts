import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { BringService } from '../bringClient.js';
import { registerTool } from '../registerTool.js';
import { READ_ONLY_TOOL_ANNOTATIONS } from '../toolAnnotations.js';
import { catalogOutputSchema, translationsOutputSchema } from '../toolSchemas.js';

export function registerCatalogTools(server: McpServer, bc: BringService) {
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
    title: 'Load Bring! Translations',
    description:
      "Load translations for item names and other UI elements. Optionally specify a locale (e.g., 'de-DE', 'en-US'). Defaults to 'en-US'.",
    inputSchema: loadTranslationsParams,
    outputSchema: translationsOutputSchema,
    actionFn: async (args, bc) => translationsOutputSchema.parse(await bc.loadTranslations(args.locale)),
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
    title: 'Load Bring! Catalog',
    description: 'Load the Bring! catalog for a specific locale. This contains standard items.',
    inputSchema: loadCatalogParams,
    outputSchema: catalogOutputSchema,
    actionFn: async (args, bc) => catalogOutputSchema.parse(await bc.loadCatalog(args.locale)),
    failureMessage: 'Failed to load catalog',
    annotations: READ_ONLY_TOOL_ANNOTATIONS,
  });
}
