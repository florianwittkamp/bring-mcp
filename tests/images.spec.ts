import {
  mockSaveItemImage,
  mockRemoveItemImage,
  mockMcpServerInstance,
  mockTools,
  loadServer,
  getTool,
} from './helpers';
import { itemImageDataParam } from '../src/schemaShared';

let consoleErrorSpy: jest.SpyInstance;

describe('MCP Bring! Server - Image Tools', () => {
  beforeEach(async () => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
    mockTools.clear();
    await loadServer();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('bring.saveItemImage tool', () => {
    it('rejects local paths and image data larger than 5 MiB', () => {
      expect(itemImageDataParam.imageData.safeParse('/path/to/image.jpg').success).toBe(false);
      expect(itemImageDataParam.imageData.safeParse('aW1hZ2U=').success).toBe(true);
      expect(itemImageDataParam.imageData.safeParse('A'.repeat(6_990_512)).success).toBe(false);
    });

    it('should be registered with correct name, description, and schema', () => {
      expect(mockMcpServerInstance.tool).toHaveBeenCalledWith(
        'saveItemImage',
        'Save an image for an item. Provide the image as base64-encoded data (maximum decoded size: 5 MiB).',
        expect.objectContaining({
          itemId: expect.anything(),
          imageData: expect.anything(),
        }),
        expect.any(Function),
      );
      const tool = getTool('saveItemImage');
      expect(tool).toBeDefined();
      expect(tool?.description).toBe(
        'Save an image for an item. Provide the image as base64-encoded data (maximum decoded size: 5 MiB).',
      );
      expect(tool?.schema).toMatchObject({ itemId: {}, imageData: {} });
    });

    it('should call BringClient.saveItemImage and return success', async () => {
      const fakeItemId = 'item-img';
      const fakeImageData = 'aW1hZ2U=';
      const successResponse = { message: 'Image saved successfully' };
      mockSaveItemImage.mockResolvedValue(successResponse);
      const tool = getTool('saveItemImage');
      if (!tool) throw new Error('Tool saveItemImage not found');
      const result = await tool.callback({ itemId: fakeItemId, imageData: fakeImageData });
      expect(mockSaveItemImage).toHaveBeenCalledWith(fakeItemId, fakeImageData);
      expect(result).toEqual({ content: [{ type: 'text', text: JSON.stringify(successResponse, null, 2) }] });
    });

    it('should return an error message on failed saveItemImage', async () => {
      const fakeItemId = 'item-img';
      const fakeImageData = 'aW1hZ2U=';
      const errorMessage = 'Could not save image';
      mockSaveItemImage.mockRejectedValue(new Error(errorMessage));
      const tool = getTool('saveItemImage');
      if (!tool) throw new Error('Tool saveItemImage not found');
      const result = await tool.callback({ itemId: fakeItemId, imageData: fakeImageData });
      expect(mockSaveItemImage).toHaveBeenCalledWith(fakeItemId, fakeImageData);
      expect(result).toEqual({ content: [{ type: 'text', text: `Failed to save item image: ${errorMessage}` }] });
    });
  });

  describe('bring.removeItemImage tool', () => {
    it('should be registered with correct name, description, and schema', () => {
      expect(mockMcpServerInstance.tool).toHaveBeenCalledWith(
        'removeItemImage',
        'Remove an image from an item on a shopping list.',
        expect.objectContaining({ itemId: expect.anything() }),
        expect.any(Function),
      );
      const tool = getTool('removeItemImage');
      expect(tool).toBeDefined();
      expect(tool?.description).toBe('Remove an image from an item on a shopping list.');
      expect(tool?.schema).toMatchObject({ itemId: {} });
    });

    it('should call BringClient.removeItemImage and return success', async () => {
      const fakeItemId = 'item-img-remove';
      const successResponse = { message: 'Image removed successfully' };
      mockRemoveItemImage.mockResolvedValue(successResponse);
      const tool = getTool('removeItemImage');
      if (!tool) throw new Error('Tool removeItemImage not found');
      const result = await tool.callback({ itemId: fakeItemId });
      expect(mockRemoveItemImage).toHaveBeenCalledWith(fakeItemId);
      expect(result).toEqual({ content: [{ type: 'text', text: JSON.stringify(successResponse, null, 2) }] });
    });

    it('should return an error message on failed removeItemImage', async () => {
      const fakeItemId = 'item-img-remove';
      const errorMessage = 'Could not remove image';
      mockRemoveItemImage.mockRejectedValue(new Error(errorMessage));
      const tool = getTool('removeItemImage');
      if (!tool) throw new Error('Tool removeItemImage not found');
      const result = await tool.callback({ itemId: fakeItemId });
      expect(mockRemoveItemImage).toHaveBeenCalledWith(fakeItemId);
      expect(result).toEqual({ content: [{ type: 'text', text: `Failed to remove item image: ${errorMessage}` }] });
    });
  });
});
