import { BringClient } from '../src/bringClient';

const mockLogin = jest.fn();
const mockGetItems = jest.fn();
const mockSaveItem = jest.fn();
const mockRemoveItem = jest.fn();
const mockLoadTranslations = jest.fn();
const mockLoadCatalog = jest.fn();

jest.mock('bring-shopping', () => {
  return jest.fn().mockImplementation(() => ({
    login: mockLogin,
    getItems: mockGetItems,
    saveItem: mockSaveItem,
    removeItem: mockRemoveItem,
    loadTranslations: mockLoadTranslations,
    loadCatalog: mockLoadCatalog,
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
});
