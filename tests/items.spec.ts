import {
  mockGetItems,
  mockGetItemsDetails,
  mockSaveItem,
  mockSaveItemBatch,
  mockRemoveItem,
  mockMoveToRecentList,
  mockMcpServerInstance,
  mockTools,
  loadServer,
  getTool,
  mockDeleteMultipleItemsFromList,
} from './helpers'; // Import from helpers

let consoleErrorSpy: jest.SpyInstance;

describe('MCP Bring! Server - Item Tools', () => {
  beforeEach(async () => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
    mockTools.clear();
    await loadServer();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('bring.getItems tool', () => {
    it('should be registered with correct name, description, and schema', () => {
      expect(mockMcpServerInstance.registerTool).toHaveBeenCalledWith(
        'getItems',
        expect.objectContaining({
          description: 'Get all items from a specific shopping list.',
          inputSchema: expect.objectContaining({ listUuid: expect.anything() }),
          outputSchema: expect.objectContaining({ result: expect.anything() }),
          annotations: expect.objectContaining({ readOnlyHint: true, destructiveHint: false }),
        }),
        expect.any(Function),
      );
      const tool = getTool('getItems');
      expect(tool).toBeDefined();
      expect(tool?.description).toBe('Get all items from a specific shopping list.');
      expect(tool?.schema).toMatchObject({ listUuid: {} });
    });

    it('should call BringClient.getItems with listUuid and return items', async () => {
      const fakeListUuid = 'test-list-uuid';
      const fakeItemsInput = [{ id: 'item1', name: 'Milk', specification: '1L' }];
      // This is what mockGetItems (from BringClient) should now resolve to
      const fakeItemsExpectedByTool = fakeItemsInput.map((item) => ({ ...item, itemId: item.name }));

      mockGetItems.mockResolvedValue(fakeItemsExpectedByTool);

      const getItemsTool = getTool('getItems');
      if (!getItemsTool) throw new Error('Tool getItems not found');
      const result = await getItemsTool.callback({ listUuid: fakeListUuid });

      expect(mockGetItems).toHaveBeenCalledWith(fakeListUuid);
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(fakeItemsExpectedByTool, null, 2) }],
        structuredContent: { result: fakeItemsExpectedByTool },
      });
    });

    it('should include itemId in purchase and recently items', async () => {
      const fakeListUuid = 'test-list-uuid';
      // This now represents the data *after* BringClient.getItems has processed it
      const mockTransformedApiResponse = {
        uuid: fakeListUuid,
        status: 'SHARED',
        purchase: [
          { name: 'Milk', specification: '1L', itemId: 'Milk' },
          { name: 'Eggs', specification: '12 pack', itemId: 'Eggs' },
        ],
        recently: [{ name: 'Bread', specification: 'Whole grain', itemId: 'Bread' }],
      };
      // mockGetItems (representing the mocked BringClient.getItems) should resolve
      // with this transformed data.
      mockGetItems.mockResolvedValue(mockTransformedApiResponse);

      const tool = getTool('getItems');
      if (!tool) throw new Error('Tool getItems not found');
      const result = await tool.callback({ listUuid: fakeListUuid });

      expect(mockGetItems).toHaveBeenCalledWith(fakeListUuid);
      const parsedResult = JSON.parse((result.content[0] as { text: string }).text);

      interface TestItem {
        name: string;
        specification: string;
        itemId?: string;
      }

      // Check purchase items
      expect(parsedResult.purchase).toBeInstanceOf(Array);
      parsedResult.purchase.forEach((item: TestItem) => {
        expect(item.itemId).toBe(item.name);
        expect(item.name).not.toBeUndefined(); // ensure name is there for comparison
      });

      // Check recently items
      expect(parsedResult.recently).toBeInstanceOf(Array);
      parsedResult.recently.forEach((item: TestItem) => {
        expect(item.itemId).toBe(item.name);
        expect(item.name).not.toBeUndefined(); // ensure name is there for comparison
      });
    });

    it('should return an error message on failed getItems', async () => {
      const fakeListUuid = 'test-list-uuid';
      const errorMessage = 'List not found';
      mockGetItems.mockRejectedValue(new Error(errorMessage));

      const getItemsTool = getTool('getItems');
      if (!getItemsTool) throw new Error('Tool getItems not found');
      const result = await getItemsTool.callback({ listUuid: fakeListUuid });

      expect(mockGetItems).toHaveBeenCalledWith(fakeListUuid);
      expect(result).toEqual({
        content: [{ type: 'text', text: `Failed to get items: ${errorMessage}` }],
        isError: true,
      });
    });
  });

  describe('bring.getItemsDetails tool', () => {
    it('should be registered with correct name, description, and schema', () => {
      expect(mockMcpServerInstance.registerTool).toHaveBeenCalledWith(
        'getItemsDetails',
        expect.objectContaining({
          description: 'Get details for items in a list. (Take listUuid)',
          inputSchema: expect.objectContaining({ listUuid: expect.anything() }),
          outputSchema: expect.objectContaining({ result: expect.anything() }),
          annotations: expect.objectContaining({ readOnlyHint: true, destructiveHint: false }),
        }),
        expect.any(Function),
      );
      const tool = getTool('getItemsDetails');
      expect(tool).toBeDefined();
      expect(tool?.description).toBe('Get details for items in a list. (Take listUuid)');
      expect(tool?.schema).toMatchObject({ listUuid: {} }); // Schema has only listUuid
    });

    it('should call BringClient.getItemsDetails and return item details on success', async () => {
      const fakeListUuid = 'list-123';
      // itemId is not used by the tool's current implementation in src/index.ts
      const fakeItemDetails = { id: 'item-abc', name: 'Detailed Milk', specification: 'Organic' };
      mockGetItemsDetails.mockResolvedValue(fakeItemDetails);

      const tool = getTool('getItemsDetails');
      if (!tool) throw new Error('Tool getItemsDetails not found');
      const result = await tool.callback({ listUuid: fakeListUuid }); // Corrected: only pass listUuid

      expect(mockGetItemsDetails).toHaveBeenCalledWith(fakeListUuid); // Corrected: only expect listUuid
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(fakeItemDetails, null, 2) }],
        structuredContent: { result: fakeItemDetails },
      });
    });

    it('should return an error message on failed getItemsDetails', async () => {
      const fakeListUuid = 'list-123';
      // itemId is not used by the tool's current implementation in src/index.ts
      const errorMessage = 'Item details not found';
      mockGetItemsDetails.mockRejectedValue(new Error(errorMessage));
      const tool = getTool('getItemsDetails');
      if (!tool) throw new Error('Tool getItemsDetails not found');
      const result = await tool.callback({ listUuid: fakeListUuid }); // Corrected: only pass listUuid
      expect(mockGetItemsDetails).toHaveBeenCalledWith(fakeListUuid); // Corrected: only expect listUuid
      expect(result).toEqual({
        content: [{ type: 'text', text: `Failed to get item details: ${errorMessage}` }],
        isError: true,
      });
    });
  });

  describe('bring.saveItem tool', () => {
    it('should be registered with correct name, description, and schema', () => {
      expect(mockMcpServerInstance.registerTool).toHaveBeenCalledWith(
        'saveItem',
        expect.objectContaining({
          description:
            'Save an item to a shopping list. Use the "specification" parameter to add details like quantity or type (e.g., itemName: "Milk", specification: "2 liters").',
          inputSchema: expect.objectContaining({
            listUuid: expect.anything(),
            itemName: expect.anything(),
            specification: expect.anything(),
          }),
          outputSchema: expect.objectContaining({ result: expect.anything() }),
          annotations: expect.objectContaining({ readOnlyHint: false, destructiveHint: true }),
        }),
        expect.any(Function),
      );
      const tool = getTool('saveItem');
      expect(tool).toBeDefined();
      expect(tool?.description).toBe(
        'Save an item to a shopping list. Use the "specification" parameter to add details like quantity or type (e.g., itemName: "Milk", specification: "2 liters").',
      );
      expect(tool?.schema).toMatchObject({ listUuid: {}, itemName: {}, specification: {} });
    });

    it('should call BringClient.saveItem and return success message on success (with spec)', async () => {
      const fakeListUuid = 'list-123';
      const fakeItemName = 'Eggs';
      const fakeItemSpec = '6 pack';
      const savedItemConfirmation = { itemId: 'item-xyz', message: 'Item saved successfully' };
      mockSaveItem.mockResolvedValue(savedItemConfirmation);
      const tool = getTool('saveItem');
      if (!tool) throw new Error('Tool saveItem not found');
      const result = await tool.callback({
        listUuid: fakeListUuid,
        itemName: fakeItemName,
        specification: fakeItemSpec,
      });
      // This is the critical check. If args.specification is not passed correctly from Zod, this will fail.
      expect(mockSaveItem).toHaveBeenCalledWith(fakeListUuid, fakeItemName, fakeItemSpec);
      expect(result).toEqual({
        content: [{ type: 'text', text: `Item saved: ${JSON.stringify(savedItemConfirmation)}` }],
        structuredContent: { result: savedItemConfirmation },
      });
    });

    it('should return an error message on failed saveItem', async () => {
      const fakeListUuid = 'list-123';
      const fakeItemName = 'Eggs';
      const fakeItemSpec = '6 pack';
      const errorMessage = 'Could not save item';
      mockSaveItem.mockRejectedValue(new Error(errorMessage));
      const tool = getTool('saveItem');
      if (!tool) throw new Error('Tool saveItem not found');
      const result = await tool.callback({
        listUuid: fakeListUuid,
        itemName: fakeItemName,
        specification: fakeItemSpec,
      });
      expect(mockSaveItem).toHaveBeenCalledWith(fakeListUuid, fakeItemName, fakeItemSpec);
      expect(result).toEqual({
        content: [{ type: 'text', text: `Failed to save item: ${errorMessage}` }],
        isError: true,
      });
    });
  });

  describe('bring.removeItem tool', () => {
    it('should be registered with correct name, description, and schema', () => {
      expect(mockMcpServerInstance.registerTool).toHaveBeenCalledWith(
        'removeItem',
        expect.objectContaining({
          description: 'Remove an item from a specific shopping list.',
          inputSchema: expect.objectContaining({ listUuid: expect.anything(), itemId: expect.anything() }),
          outputSchema: expect.objectContaining({ result: expect.anything() }),
          annotations: expect.objectContaining({ readOnlyHint: false, destructiveHint: true }),
        }),
        expect.any(Function),
      );
      const tool = getTool('removeItem');
      expect(tool).toBeDefined();
      expect(tool?.description).toBe('Remove an item from a specific shopping list.'); // Corrected
      expect(tool?.schema).toMatchObject({ listUuid: {}, itemId: {} });
    });

    it('should call BringClient.removeItem and return success message', async () => {
      const fakeListUuid = 'list-123';
      const fakeItemId = 'item-toremove';
      const successResponse = { message: 'Item removed successfully' };
      mockRemoveItem.mockResolvedValue(successResponse);

      const tool = getTool('removeItem');
      if (!tool) throw new Error('Tool removeItem not found');
      const result = await tool.callback({ listUuid: fakeListUuid, itemId: fakeItemId });

      expect(mockRemoveItem).toHaveBeenCalledWith(fakeListUuid, fakeItemId);
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(successResponse, null, 2) }],
        structuredContent: { result: successResponse },
      });
    });

    it('should return an error message on failed removeItem', async () => {
      const fakeListUuid = 'list-123';
      const fakeItemId = 'item-toremove';
      const errorMessage = 'Could not remove item';
      mockRemoveItem.mockRejectedValue(new Error(errorMessage));

      const tool = getTool('removeItem');
      if (!tool) throw new Error('Tool removeItem not found');
      const result = await tool.callback({ listUuid: fakeListUuid, itemId: fakeItemId });

      expect(mockRemoveItem).toHaveBeenCalledWith(fakeListUuid, fakeItemId);
      expect(result).toEqual({
        content: [{ type: 'text', text: `Failed to remove item: ${errorMessage}` }],
        isError: true,
      });
    });
  });

  describe('bring.moveToRecentList tool', () => {
    it('should be registered with correct name, description, and schema', () => {
      expect(mockMcpServerInstance.registerTool).toHaveBeenCalledWith(
        'moveToRecentList',
        expect.objectContaining({
          description: 'Move an item from a shopping list to the recently used items list.',
          inputSchema: expect.objectContaining({ listUuid: expect.anything(), itemId: expect.anything() }),
          outputSchema: expect.objectContaining({ result: expect.anything() }),
          annotations: expect.objectContaining({ readOnlyHint: false, destructiveHint: true }),
        }),
        expect.any(Function),
      );
      const tool = getTool('moveToRecentList');
      expect(tool).toBeDefined();
      expect(tool?.description).toBe('Move an item from a shopping list to the recently used items list.'); // Corrected
      expect(tool?.schema).toMatchObject({ listUuid: {}, itemId: {} });
    });

    it('should call BringClient.moveToRecentList and return success message', async () => {
      const fakeListUuid = 'list-123';
      const fakeItemId = 'item-tomove';
      const successResponse = { message: 'Item moved successfully' };
      mockMoveToRecentList.mockResolvedValue(successResponse);

      const tool = getTool('moveToRecentList');
      if (!tool) throw new Error('Tool moveToRecentList not found');
      const result = await tool.callback({ listUuid: fakeListUuid, itemId: fakeItemId });

      expect(mockMoveToRecentList).toHaveBeenCalledWith(fakeListUuid, fakeItemId);
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(successResponse, null, 2) }],
        structuredContent: { result: successResponse },
      });
    });

    it('should return an error message on failed moveToRecentList', async () => {
      const fakeListUuid = 'list-123';
      const fakeItemId = 'item-tomove';
      const errorMessage = 'Could not move item';
      mockMoveToRecentList.mockRejectedValue(new Error(errorMessage));

      const tool = getTool('moveToRecentList');
      if (!tool) throw new Error('Tool moveToRecentList not found');
      const result = await tool.callback({ listUuid: fakeListUuid, itemId: fakeItemId });

      expect(mockMoveToRecentList).toHaveBeenCalledWith(fakeListUuid, fakeItemId);
      expect(result).toEqual({
        content: [{ type: 'text', text: `Failed to move item to recent list: ${errorMessage}` }],
        isError: true,
      });
    });
  });

  describe('bring.saveItemBatch tool', () => {
    it('should be registered with correct name, description, and schema', () => {
      expect(mockMcpServerInstance.registerTool).toHaveBeenCalledWith(
        'saveItemBatch',
        expect.objectContaining({
          description:
            'Save multiple items to a shopping list. For each item, you can provide an "itemName" and an optional "specification" for details like quantity or type (input e.g., [{ "itemName": "Eggs", "specification": "dozen" },{ "itemName":"Apples", "specification": "10" }]).',
          inputSchema: expect.objectContaining({ listUuid: expect.anything(), items: expect.anything() }),
          outputSchema: expect.objectContaining({ result: expect.anything() }),
          annotations: expect.objectContaining({ readOnlyHint: false, destructiveHint: true }),
        }),
        expect.any(Function),
      );
      const tool = getTool('saveItemBatch');
      expect(tool).toBeDefined();
      expect(tool?.description).toBe(
        'Save multiple items to a shopping list. For each item, you can provide an "itemName" and an optional "specification" for details like quantity or type (input e.g., [{ "itemName": "Eggs", "specification": "dozen" },{ "itemName":"Apples", "specification": "10" }]).',
      );
      // Check for listUuid and items properties in the schema
      expect(tool?.schema).toMatchObject({ listUuid: {}, items: {} });
    });

    it('should call BringClient.saveItemBatch with correct arguments and return success message', async () => {
      const fakeListUuid = 'list-batch-save';
      const fakeItems = [
        { itemName: 'Milk', specification: '1 liter' },
        { itemName: 'Bread' }, // No specification
      ];
      const successResponse = [{ itemId: 'milk-123' }, { itemId: 'bread-456' }];
      mockSaveItemBatch.mockResolvedValue(successResponse);

      const tool = getTool('saveItemBatch');
      if (!tool) throw new Error('Tool saveItemBatch not found');
      const result = await tool.callback({ listUuid: fakeListUuid, items: fakeItems });

      expect(mockSaveItemBatch).toHaveBeenCalledWith(fakeListUuid, fakeItems);
      expect(result).toEqual({
        content: [{ type: 'text', text: `Batch items saved: ${JSON.stringify(successResponse)}` }],
        structuredContent: { result: successResponse },
      });
    });

    it('should return an error message on failed saveItemBatch', async () => {
      const fakeListUuid = 'list-batch-save-fail';
      const fakeItems = [{ itemName: 'Sugar' }];
      const errorMessage = 'Batch save failed';
      mockSaveItemBatch.mockRejectedValue(new Error(errorMessage));

      const tool = getTool('saveItemBatch');
      if (!tool) throw new Error('Tool saveItemBatch not found');
      const result = await tool.callback({ listUuid: fakeListUuid, items: fakeItems });

      expect(mockSaveItemBatch).toHaveBeenCalledWith(fakeListUuid, fakeItems);
      expect(result).toEqual({
        content: [{ type: 'text', text: `Failed to save batch items: ${errorMessage}` }],
        isError: true,
      });
    });
  });

  describe('bring.deleteMultipleItemsFromList tool', () => {
    const listUuid = 'test-list-uuid';
    const itemNamesToDelete = ['ItemA', 'ItemB'];

    it('should be registered with correct name, description, and schema', () => {
      expect(mockMcpServerInstance.registerTool).toHaveBeenCalledWith(
        'deleteMultipleItemsFromList',
        expect.objectContaining({
          description: 'Delete multiple items from a specific shopping list by their names.',
          inputSchema: expect.objectContaining({ listUuid: expect.anything(), itemNames: expect.anything() }),
          outputSchema: expect.objectContaining({ result: expect.anything() }),
          annotations: expect.objectContaining({ readOnlyHint: false, destructiveHint: true }),
        }),
        expect.any(Function),
      );
      const tool = getTool('deleteMultipleItemsFromList');
      expect(tool).toBeDefined();
      expect(tool?.description).toBe('Delete multiple items from a specific shopping list by their names.');
      expect(tool?.schema).toMatchObject({
        listUuid: expect.anything(),
        itemNames: expect.anything(),
      });
      const itemNamesSchema = (tool?.schema as { itemNames: { safeParse: (value: unknown) => { success: boolean } } })
        .itemNames;
      expect(itemNamesSchema.safeParse(['ItemA']).success).toBe(true);
      expect(itemNamesSchema.safeParse([]).success).toBe(false);
    });

    it('should call BringClient.deleteMultipleItemsFromList and return success', async () => {
      const mockSuccessResponse = { count: itemNamesToDelete.length, status: 'deleted' };
      mockDeleteMultipleItemsFromList.mockResolvedValue(mockSuccessResponse);

      const tool = getTool('deleteMultipleItemsFromList');
      if (!tool) throw new Error('Tool deleteMultipleItemsFromList not found');

      const result = await tool.callback({ listUuid, itemNames: itemNamesToDelete });

      expect(mockDeleteMultipleItemsFromList).toHaveBeenCalledTimes(1);
      expect(mockDeleteMultipleItemsFromList).toHaveBeenCalledWith(listUuid, itemNamesToDelete);

      // Uses transformResult from itemTools.ts
      expect(result).toEqual({
        content: [{ type: 'text', text: `Multiple items deleted: ${JSON.stringify(mockSuccessResponse)}` }],
        structuredContent: { result: mockSuccessResponse },
      });
    });

    it('should return an error message if BringClient.deleteMultipleItemsFromList fails', async () => {
      const errorMessage = 'Failed to delete from client';
      mockDeleteMultipleItemsFromList.mockRejectedValueOnce(new Error(errorMessage));

      const tool = getTool('deleteMultipleItemsFromList');
      if (!tool) throw new Error('Tool deleteMultipleItemsFromList not found');

      const result = await tool.callback({ listUuid, itemNames: itemNamesToDelete });

      expect(mockDeleteMultipleItemsFromList).toHaveBeenCalledTimes(1);
      expect(mockDeleteMultipleItemsFromList).toHaveBeenCalledWith(listUuid, itemNamesToDelete);

      expect(result).toEqual({
        content: [{ type: 'text', text: `Failed to delete multiple items: ${errorMessage}` }],
        isError: true,
      });
    });
  });
});
