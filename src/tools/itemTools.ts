import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BringClient } from '../bringClient.js';
import { registerTool } from '../index.js';
import {
  listUuidParam,
  itemIdParam,
  itemNameParam,
  itemSpecificationParam,
  itemImageDataParam,
  saveItemBatchParams,
  itemNamesArrayParam,
} from '../schemaShared.js';

export function registerItemTools(server: McpServer, bc: BringClient) {
  const getItemsParams = z.object({
    ...listUuidParam,
  });
  registerTool({
    server,
    bc,
    name: 'getItems',
    description: 'Get all items from a specific shopping list.',
    schemaShape: getItemsParams.shape,
    actionFn: async (args: z.infer<typeof getItemsParams>, bc: BringClient) => bc.getItems(args.listUuid),
    failureMessage: 'Failed to get items',
  });

  const getItemsDetailsParams = z.object({
    ...listUuidParam,
  });
  registerTool({
    server,
    bc,
    name: 'getItemsDetails',
    description: 'Get details for items in a list. (Take listUuid)',
    schemaShape: getItemsDetailsParams.shape,
    actionFn: async (args: z.infer<typeof getItemsDetailsParams>, bc: BringClient) => bc.getItemsDetails(args.listUuid),
    failureMessage: 'Failed to get item details',
  });

  registerTool({
    server,
    bc,
    name: 'saveItem',
    description:
      'Save an item to a shopping list. Use the "specification" parameter to add details like quantity or type (e.g., itemName: "Milk", specification: "2 liters").',
    schemaShape: { ...listUuidParam, ...itemNameParam, ...itemSpecificationParam },
    actionFn: async (args: { listUuid: string; itemName: string; specification?: string | null }, bc) => {
      return bc.saveItem(args.listUuid, args.itemName, args.specification);
    },
    transformResult: (result: unknown) => ({
      content: [{ type: 'text', text: `Item saved: ${JSON.stringify(result)}` }],
    }),
    failureMessage: 'Failed to save item',
  });

  registerTool({
    server,
    bc,
    name: 'saveItemBatch',
    description:
      'Save multiple items to a shopping list. For each item, you can provide an "itemName" and an optional "specification" for details like quantity or type (input e.g., [{ "itemName": "Eggs", "specification": "dozen" },{ "itemName":"Apples", "specification": "10" }]).',
    schemaShape: saveItemBatchParams,
    actionFn: async (args: { listUuid: string; items: { itemName: string; specification?: string | null }[] }, bc) => {
      return bc.saveItemBatch(args.listUuid, args.items);
    },
    transformResult: (result: unknown) => ({
      content: [{ type: 'text', text: `Batch items saved: ${JSON.stringify(result)}` }],
    }),
    failureMessage: 'Failed to save batch items',
  });

  const removeItemParams = z.object({
    ...listUuidParam,
    ...itemIdParam,
  });
  registerTool({
    server,
    bc,
    name: 'removeItem',
    description: 'Remove an item from a specific shopping list.',
    schemaShape: removeItemParams.shape,
    actionFn: async (args: z.infer<typeof removeItemParams>, bc: BringClient) =>
      bc.removeItem(args.listUuid, args.itemId),
    failureMessage: 'Failed to remove item',
  });

  const moveToRecentListParams = z.object({
    ...listUuidParam,
    ...itemIdParam,
  });
  registerTool({
    server,
    bc,
    name: 'moveToRecentList',
    description: 'Move an item from a shopping list to the recently used items list.',
    schemaShape: moveToRecentListParams.shape,
    actionFn: async (args: z.infer<typeof moveToRecentListParams>, bc: BringClient) =>
      bc.moveToRecentList(args.listUuid, args.itemId),
    failureMessage: 'Failed to move item to recent list',
  });

  const saveItemImageParams = z.object({
    ...itemIdParam,
    ...itemImageDataParam,
  });
  registerTool({
    server,
    bc,
    name: 'saveItemImage',
    description: 'Save an image for an item. Provide the image as base64-encoded data (maximum decoded size: 5 MiB).',
    schemaShape: saveItemImageParams.shape,
    actionFn: async (args: z.infer<typeof saveItemImageParams>, bc: BringClient) =>
      bc.saveItemImage(args.itemId, args.imageData),
    failureMessage: 'Failed to save item image',
  });

  const removeItemImageParams = z.object({
    ...itemIdParam,
  });
  registerTool({
    server,
    bc,
    name: 'removeItemImage',
    description: 'Remove an image from an item on a shopping list.',
    schemaShape: removeItemImageParams.shape,
    actionFn: async (args: z.infer<typeof removeItemImageParams>, bc: BringClient) => bc.removeItemImage(args.itemId),
    failureMessage: 'Failed to remove item image',
  });

  const deleteMultipleItemsParams = z.object({
    ...listUuidParam,
    ...itemNamesArrayParam,
  });
  registerTool({
    server,
    bc,
    name: 'deleteMultipleItemsFromList',
    description: 'Delete multiple items from a specific shopping list by their names.',
    schemaShape: deleteMultipleItemsParams.shape,
    actionFn: async (args: z.infer<typeof deleteMultipleItemsParams>, bc: BringClient) =>
      bc.deleteMultipleItemsFromList(args.listUuid, args.itemNames),
    transformResult: (result: unknown) => ({
      content: [{ type: 'text', text: `Multiple items deleted: ${JSON.stringify(result)}` }],
    }),
    failureMessage: 'Failed to delete multiple items',
  });
}
