import { BringClient } from '../src/bringClient';

const mockLogin = jest.fn();
const mockGetItems = jest.fn();
const mockSaveItem = jest.fn();
const mockRemoveItem = jest.fn();
const mockLoadTranslations = jest.fn();
const mockLoadCatalog = jest.fn();
const mockSaveItemImage = jest.fn();
const mockRemoveItemImage = jest.fn();

jest.mock('bring-shopping', () => {
  const token = JSON.stringify({
    exp: Date.now() / 1000 + 20000,
  });
  const base64Url = Buffer.from(token).toString('base64');
  return jest.fn().mockImplementation(() => ({
    login: mockLogin,
    getItems: mockGetItems,
    saveItem: mockSaveItem,
    removeItem: mockRemoveItem,
    loadTranslations: mockLoadTranslations,
    loadCatalog: mockLoadCatalog,
    saveItemImage: mockSaveItemImage,
    removeItemImage: mockRemoveItemImage,
    bearerToken: `a.${base64Url}.a`,
  }));
});

describe('BringClient functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MAIL = 'test@example.com';
    process.env.PW = 'pw';
  });

  test('getItems adds itemId to purchase and recently items', async () => {
    const response = {
      purchase: [{ name: 'Milk', specification: '1L' }],
      recently: [{ name: 'Bread', specification: 'Whole' }],
    };
    mockGetItems.mockResolvedValue(response);
    const bc = new BringClient();

    const result = await bc.getItems('list1');

    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(mockGetItems).toHaveBeenCalledWith('list1');
    expect(result.purchase[0]).toEqual({ name: 'Milk', specification: '1L', itemId: 'Milk' });
    expect(result.recently[0]).toEqual({ name: 'Bread', specification: 'Whole', itemId: 'Bread' });
  });

  test('saveItem forwards empty specification string when undefined', async () => {
    mockSaveItem.mockResolvedValue({ ok: true });
    const bc = new BringClient();

    await bc.saveItem('listA', 'Eggs', undefined);

    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(mockSaveItem).toHaveBeenCalledWith('listA', 'Eggs', '');
  });

  test('saveItemBatch saves each item individually', async () => {
    mockSaveItem.mockResolvedValueOnce('r1').mockResolvedValueOnce('r2');
    const bc = new BringClient();

    const result = await bc.saveItemBatch('listB', [{ itemName: 'A', specification: '1' }, { itemName: 'B' }]);

    expect(mockSaveItem).toHaveBeenNthCalledWith(1, 'listB', 'A', '1');
    expect(mockSaveItem).toHaveBeenNthCalledWith(2, 'listB', 'B', '');
    expect(result).toEqual(['r1', 'r2']);
  });

  test('deleteMultipleItemsFromList removes each item', async () => {
    mockRemoveItem.mockResolvedValueOnce('ok1').mockResolvedValueOnce('ok2');
    const bc = new BringClient();

    const result = await bc.deleteMultipleItemsFromList('listC', ['x', 'y']);

    expect(mockRemoveItem).toHaveBeenNthCalledWith(1, 'listC', 'x');
    expect(mockRemoveItem).toHaveBeenNthCalledWith(2, 'listC', 'y');
    expect(result).toEqual(['ok1', 'ok2']);
  });

  test('loadTranslations defaults to en-US when no locale is provided', async () => {
    mockLoadTranslations.mockResolvedValue('ok');
    const bc = new BringClient();

    await bc.loadTranslations();

    expect(mockLoadTranslations).toHaveBeenCalledWith('en-US');
  });

  test('loadCatalog passes locale through', async () => {
    mockLoadCatalog.mockResolvedValue('catalog');
    const bc = new BringClient();

    await bc.loadCatalog('de-DE');

    expect(mockLoadCatalog).toHaveBeenCalledWith('de-DE');
  });

  test('saveItemImage sends base64 image data with the dependency signature', async () => {
    mockSaveItemImage.mockResolvedValue({ imageUrl: 'https://example.test/image.jpg' });
    const bc = new BringClient();

    await bc.saveItemImage('item-uuid', 'aW1hZ2U=');

    expect(mockSaveItemImage).toHaveBeenCalledWith('item-uuid', { imageData: 'aW1hZ2U=' });
  });

  test('removeItemImage sends only the item UUID', async () => {
    mockRemoveItemImage.mockResolvedValue('');
    const bc = new BringClient();

    await bc.removeItemImage('item-uuid');

    expect(mockRemoveItemImage).toHaveBeenCalledWith('item-uuid');
  });
});
