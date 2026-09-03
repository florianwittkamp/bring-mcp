import { itemImageDataParam } from '../src/schemaShared';
import { getTool, loadServer, mockRemoveItemImage, mockSaveItemImage, mockTools } from './helpers';

describe('image tools', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.clearAllMocks();
    mockTools.clear();
    await loadServer();
  });

  afterEach(() => consoleErrorSpy.mockRestore());

  it('rejects local paths and image data larger than 5 MiB', () => {
    expect(itemImageDataParam.imageData.safeParse('/path/to/image.jpg').success).toBe(false);
    expect(itemImageDataParam.imageData.safeParse('aW1hZ2U=').success).toBe(true);
    expect(itemImageDataParam.imageData.safeParse('A'.repeat(6_990_512)).success).toBe(false);
  });

  it('registers both mutations with complete metadata', () => {
    expect(getTool('saveItemImage')).toMatchObject({
      title: 'Save Shopping Item Image',
      schema: { itemId: expect.anything(), imageData: expect.anything() },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    });
    expect(getTool('removeItemImage')).toMatchObject({
      title: 'Remove Shopping Item Image',
      schema: { itemId: expect.anything() },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    });
  });

  it('returns a normalized result when saving an image', async () => {
    mockSaveItemImage.mockResolvedValue({ imageUrl: 'https://example.test/image.jpg' });

    const result = await getTool('saveItemImage')!.callback({
      itemId: 'item-img',
      imageData: 'aW1hZ2U=',
    });

    expect(mockSaveItemImage).toHaveBeenCalledWith('item-img', 'aW1hZ2U=');
    expect(result.structuredContent).toEqual({
      success: true,
      itemId: 'item-img',
      imageUrl: 'https://example.test/image.jpg',
    });
  });

  it('returns a normalized result when removing an image', async () => {
    mockRemoveItemImage.mockResolvedValue('');

    const result = await getTool('removeItemImage')!.callback({ itemId: 'item-img' });

    expect(mockRemoveItemImage).toHaveBeenCalledWith('item-img');
    expect(result.structuredContent).toEqual({ success: true, itemId: 'item-img' });
  });

  it('marks image API failures as MCP errors', async () => {
    mockSaveItemImage.mockRejectedValue(new Error('Could not save image'));

    const result = await getTool('saveItemImage')!.callback({
      itemId: 'item-img',
      imageData: 'aW1hZ2U=',
    });

    expect(result).toEqual({
      content: [{ type: 'text', text: 'Failed to save item image: Could not save image' }],
      isError: true,
    });
  });
});
