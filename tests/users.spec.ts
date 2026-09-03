import {
  getTool,
  loadServer,
  mockGetAllUsersFromList,
  mockGetPendingInvitations,
  mockGetUserSettings,
  mockLoadLists,
  mockTools,
} from './helpers';

describe('user tools', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.clearAllMocks();
    mockTools.clear();
    await loadServer();
  });

  afterEach(() => consoleErrorSpy.mockRestore());

  it('registers complete schemas and read-only annotations', () => {
    for (const name of ['getAllUsersFromList', 'getUserSettings', 'getPendingInvitations', 'getDefaultList']) {
      const tool = getTool(name);
      expect(tool?.title).not.toBe('');
      expect(tool?.inputSchema).toEqual(expect.objectContaining({ '~standard': expect.any(Object) }));
      expect(tool?.outputSchema).toEqual(expect.objectContaining({ '~standard': expect.any(Object) }));
      expect(tool?.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, idempotentHint: true });
    }
    expect(getTool('getAllUsersFromList')?.schema).toEqual({ listUuid: expect.anything() });
    expect(getTool('getUserSettings')?.schema).toEqual({});
  });

  it('returns users and invitations in their documented response objects', async () => {
    const users = {
      users: [
        {
          publicUuid: 'user-1',
          name: 'Alice',
          email: 'alice@example.test',
          photoPath: '',
          pushEnabled: true,
          plusTryOut: false,
          country: 'DE',
          language: 'de-DE',
        },
      ],
    };
    const invitations = { invitations: [{ listUuid: 'list-1' }] };
    mockGetAllUsersFromList.mockResolvedValue(users);
    mockGetPendingInvitations.mockResolvedValue(invitations);

    const usersResult = await getTool('getAllUsersFromList')!.callback({ listUuid: 'list-1' });
    const invitationResult = await getTool('getPendingInvitations')!.callback({});

    expect(mockGetAllUsersFromList).toHaveBeenCalledWith('list-1');
    expect(usersResult.structuredContent).toEqual(users);
    expect(invitationResult.structuredContent).toEqual(invitations);
  });

  it('normalizes both global and per-list setting keys', async () => {
    mockGetUserSettings.mockResolvedValue({
      userSettings: [{ key: 'defaultListUUID', value: 'list-1' }],
      userlistsettings: [
        {
          listUuid: 'list-1',
          usersettings: [{ key: 'notifications', value: 'true' }],
        },
      ],
    });

    const result = await getTool('getUserSettings')!.callback({});

    expect(result.structuredContent).toEqual({
      settings: [{ key: 'defaultListUUID', value: 'list-1' }],
      listSettings: [
        {
          listUuid: 'list-1',
          settings: [{ key: 'notifications', value: 'true' }],
        },
      ],
    });
  });

  it('returns the configured default list as a structured result', async () => {
    mockGetUserSettings.mockResolvedValue({
      usersettings: [{ key: 'defaultListUUID', value: 'configured-list' }],
    });

    const result = await getTool('getDefaultList')!.callback({});

    expect(result.structuredContent).toEqual({ listUuid: 'configured-list', source: 'configured' });
    expect(mockLoadLists).not.toHaveBeenCalled();
  });

  it('uses the sole list if no default is configured', async () => {
    mockGetUserSettings.mockResolvedValue({ userSettings: [] });
    mockLoadLists.mockResolvedValue({
      lists: [{ listUuid: 'only-list', name: 'Home', theme: 'ch.publisheria.bring.theme.1' }],
    });

    const result = await getTool('getDefaultList')!.callback({});

    expect(result.structuredContent).toEqual({ listUuid: 'only-list', source: 'only-list' });
  });

  it('returns actionable guidance if a list must be selected', async () => {
    mockGetUserSettings.mockResolvedValue({ userSettings: [] });
    mockLoadLists.mockResolvedValue({
      lists: [
        { listUuid: 'list-a', name: 'Home', theme: 'ch.publisheria.bring.theme.1' },
        { listUuid: 'list-b', name: 'Work', theme: 'ch.publisheria.bring.theme.2' },
      ],
    });

    const result = await getTool('getDefaultList')!.callback({});

    expect(result.structuredContent).toEqual({
      listUuid: null,
      source: 'not-configured',
      message: 'No default list is configured. Set one in the Bring app, or call loadLists to choose.',
    });
  });

  it('marks user API failures as MCP errors', async () => {
    mockGetUserSettings.mockRejectedValue(new Error('Settings unavailable'));

    const result = await getTool('getDefaultList')!.callback({});

    expect(result).toEqual({
      content: [{ type: 'text', text: 'Failed to get default list UUID: Settings unavailable' }],
      isError: true,
    });
  });
});
