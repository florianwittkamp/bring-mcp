import { getTool, loadServer, mockLoadLists, mockTools } from './helpers';

describe('loadLists tool', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.clearAllMocks();
    mockTools.clear();
    await loadServer();
  });

  afterEach(() => consoleErrorSpy.mockRestore());

  it('registers a read-only tool with complete input and output schemas', () => {
    const tool = getTool('loadLists');

    expect(tool).toMatchObject({
      title: 'Load Shopping Lists',
      description: 'Load all shopping lists from Bring!',
      schema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    });
    expect(tool?.outputSchema).toEqual(expect.objectContaining({ '~standard': expect.any(Object) }));
  });

  it('returns the API response as structured content', async () => {
    const lists = {
      lists: [
        { listUuid: '11111111-1111-4111-8111-111111111111', name: 'Groceries', theme: 'ch.publisheria.bring.theme.1' },
      ],
    };
    mockLoadLists.mockResolvedValue(lists);

    const result = await getTool('loadLists')!.callback({});

    expect(mockLoadLists).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(lists, null, 2) }],
      structuredContent: lists,
    });
  });

  it('marks API and response-validation failures as MCP errors', async () => {
    mockLoadLists.mockRejectedValueOnce(new Error('Network error'));
    const apiFailure = await getTool('loadLists')!.callback({});

    mockLoadLists.mockResolvedValueOnce({ unexpected: true });
    const schemaFailure = await getTool('loadLists')!.callback({});

    expect(apiFailure).toEqual({
      content: [{ type: 'text', text: 'Failed to load lists: Network error' }],
      isError: true,
    });
    expect(schemaFailure.isError).toBe(true);
    expect(schemaFailure.content[0]?.text).toContain('Failed to load lists');
  });
});
