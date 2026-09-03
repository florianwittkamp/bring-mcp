import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { BringService } from '../bringClient.js';
import { registerTool } from '../registerTool.js';
import {
  listUuidParam,
  itemIdParam,
  itemNameParam,
  itemSpecificationParam,
  itemImageDataParam,
  saveItemBatchParams,
  itemNamesArrayParam,
} from '../schemaShared.js';
import { MUTATING_TOOL_ANNOTATIONS, READ_ONLY_TOOL_ANNOTATIONS } from '../toolAnnotations.js';
import {
  deleteMultipleItemsOutputSchema,
  getItemsDetailsOutputSchema,
  getItemsOutputSchema,
  imageMutationOutputSchema,
  itemMutationOutputSchema,
  saveItemBatchOutputSchema,
  saveItemOutputSchema,
} from '../toolSchemas.js';

export function registerItemTools(server: McpServer, bc: BringService) {
  const getItemsParams = z.object({
    ...listUuidParam,
  });
  registerTool({
    server,
    bc,
    name: 'getItems',
    title: 'Get Shopping List Items',
    description: 'Get all items from a specific shopping list.',
    inputSchema: getItemsParams,
    outputSchema: getItemsOutputSchema,
    actionFn: async (args, bc) => getItemsOutputSchema.parse(await bc.getItems(args.listUuid)),
    failureMessage: 'Failed to get items',
    annotations: READ_ONLY_TOOL_ANNOTATIONS,
  });

  const getItemsDetailsParams = z.object({
    ...listUuidParam,
  });
  registerTool({
    server,
    bc,
    name: 'getItemsDetails',
    title: 'Get Shopping Item Details',
    description: 'Get detailed item metadata for a shopping list.',
    inputSchema: getItemsDetailsParams,
    outputSchema: getItemsDetailsOutputSchema,
    actionFn: async (args, bc) => getItemsDetailsOutputSchema.parse(await bc.getItemsDetails(args.listUuid)),
    failureMessage: 'Failed to get item details',
    annotations: READ_ONLY_TOOL_ANNOTATIONS,
  });

  registerTool({
    server,
    bc,
    name: 'saveItem',
    title: 'Add or Update Shopping Item',
    description:
      'Save an item to a shopping list. Use the "specification" parameter to add details like quantity or type (e.g., itemName: "Milk", specification: "2 liters").',
    inputSchema: z.object({ ...listUuidParam, ...itemNameParam, ...itemSpecificationParam }),
    outputSchema: saveItemOutputSchema,
    actionFn: async (args, bc) => {
      await bc.saveItem(args.listUuid, args.itemName, args.specification);
      return saveItemOutputSchema.parse({
        success: true,
        listUuid: args.listUuid,
        itemName: args.itemName,
        specification: args.specification ?? null,
      });
    },
    failureMessage: 'Failed to save item',
    annotations: MUTATING_TOOL_ANNOTATIONS,
  });

  registerTool({
    server,
    bc,
    name: 'saveItemBatch',
    title: 'Add or Update Multiple Shopping Items',
    description:
      'Save multiple items to a shopping list. For each item, you can provide an "itemName" and an optional "specification" for details like quantity or type (input e.g., [{ "itemName": "Eggs", "specification": "dozen" },{ "itemName":"Apples", "specification": "10" }]).',
    inputSchema: z.object(saveItemBatchParams),
    outputSchema: saveItemBatchOutputSchema,
    actionFn: async (args, bc) => {
      await bc.saveItemBatch(args.listUuid, args.items);
      return saveItemBatchOutputSchema.parse({
        success: true,
        listUuid: args.listUuid,
        count: args.items.length,
        items: args.items.map((item) => ({
          itemName: item.itemName,
          specification: item.specification ?? null,
        })),
      });
    },
    failureMessage: 'Failed to save batch items',
    annotations: MUTATING_TOOL_ANNOTATIONS,
  });

  const removeItemParams = z.object({
    ...listUuidParam,
    ...itemIdParam,
  });
  registerTool({
    server,
    bc,
    name: 'removeItem',
    title: 'Remove Shopping Item',
    description: 'Remove an item from a specific shopping list.',
    inputSchema: removeItemParams,
    outputSchema: itemMutationOutputSchema,
    actionFn: async (args, bc) => {
      await bc.removeItem(args.listUuid, args.itemId);
      return itemMutationOutputSchema.parse({ success: true, listUuid: args.listUuid, itemId: args.itemId });
    },
    failureMessage: 'Failed to remove item',
    annotations: MUTATING_TOOL_ANNOTATIONS,
  });

  const moveToRecentListParams = z.object({
    ...listUuidParam,
    ...itemIdParam,
  });
  registerTool({
    server,
    bc,
    name: 'moveToRecentList',
    title: 'Move Item to Recently Used',
    description: 'Move an item from a shopping list to the recently used items list.',
    inputSchema: moveToRecentListParams,
    outputSchema: itemMutationOutputSchema,
    actionFn: async (args, bc) => {
      await bc.moveToRecentList(args.listUuid, args.itemId);
      return itemMutationOutputSchema.parse({ success: true, listUuid: args.listUuid, itemId: args.itemId });
    },
    failureMessage: 'Failed to move item to recent list',
    annotations: MUTATING_TOOL_ANNOTATIONS,
  });

  const saveItemImageParams = z.object({
    ...itemIdParam,
    ...itemImageDataParam,
  });
  registerTool({
    server,
    bc,
    name: 'saveItemImage',
    title: 'Save Shopping Item Image',
    description: 'Save an image for an item. Provide the image as base64-encoded data (maximum decoded size: 5 MiB).',
    inputSchema: saveItemImageParams,
    outputSchema: imageMutationOutputSchema,
    actionFn: async (args, bc) => {
      const response = await bc.saveItemImage(args.itemId, args.imageData);
      const imageUrl =
        response && typeof response === 'object' && 'imageUrl' in response && typeof response.imageUrl === 'string'
          ? response.imageUrl
          : undefined;
      return imageMutationOutputSchema.parse({ success: true, itemId: args.itemId, imageUrl });
    },
    failureMessage: 'Failed to save item image',
    annotations: MUTATING_TOOL_ANNOTATIONS,
  });

  const removeItemImageParams = z.object({
    ...itemIdParam,
  });
  registerTool({
    server,
    bc,
    name: 'removeItemImage',
    title: 'Remove Shopping Item Image',
    description: 'Remove an image from an item on a shopping list.',
    inputSchema: removeItemImageParams,
    outputSchema: imageMutationOutputSchema,
    actionFn: async (args, bc) => {
      await bc.removeItemImage(args.itemId);
      return imageMutationOutputSchema.parse({ success: true, itemId: args.itemId });
    },
    failureMessage: 'Failed to remove item image',
    annotations: MUTATING_TOOL_ANNOTATIONS,
  });

  const deleteMultipleItemsParams = z.object({
    ...listUuidParam,
    ...itemNamesArrayParam,
  });
  registerTool({
    server,
    bc,
    name: 'deleteMultipleItemsFromList',
    title: 'Delete Multiple Shopping Items',
    description: 'Delete multiple items from a specific shopping list by their names.',
    inputSchema: deleteMultipleItemsParams,
    outputSchema: deleteMultipleItemsOutputSchema,
    actionFn: async (args, bc) => {
      await bc.deleteMultipleItemsFromList(args.listUuid, args.itemNames);
      return deleteMultipleItemsOutputSchema.parse({
        success: true,
        listUuid: args.listUuid,
        count: args.itemNames.length,
        itemNames: args.itemNames,
      });
    },
    failureMessage: 'Failed to delete multiple items',
    annotations: MUTATING_TOOL_ANNOTATIONS,
  });
}
