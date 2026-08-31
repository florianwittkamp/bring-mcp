import {
  mockGetAllUsersFromList,
  mockGetUserSettings,
  mockGetPendingInvitations,
  mockLoadLists,
  mockMcpServerInstance,
  mockTools,
  loadServer,
  getTool,
} from './helpers';

let consoleErrorSpy: jest.SpyInstance;

// Placeholder for user tests
describe('User Tests', () => {
  it('should have a placeholder test', () => {
    expect(true).toBe(true);
  });
});

describe('MCP Bring! Server - User Tools', () => {
  beforeEach(async () => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
    mockTools.clear();
    await loadServer();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // Test for getAllUsersFromList
  describe('bring.getAllUsersFromList tool', () => {
    const toolSchema = { listUuid: expect.any(Object) }; // Zod string

    it('should be registered correctly', () => {
      expect(mockMcpServerInstance.tool).toHaveBeenCalledWith(
        'getAllUsersFromList',
        'Get all users associated with a specific shopping list.',
        toolSchema,
        expect.any(Function),
      );
      const tool = getTool('getAllUsersFromList');
      expect(tool).toBeDefined();
      expect(tool?.description).toBe('Get all users associated with a specific shopping list.');
      expect(tool?.schema).toMatchObject({ listUuid: {} });
    });

    it('should return users on success', async () => {
      const fakeListUuid = 'list-users';
      const fakeUsers = [
        { id: 'user1', name: 'Alice' },
        { id: 'user2', name: 'Bob' },
      ];
      mockGetAllUsersFromList.mockResolvedValue(fakeUsers);
      const tool = getTool('getAllUsersFromList');
      if (!tool) throw new Error('Tool getAllUsersFromList not found');
      const result = await tool.callback({ listUuid: fakeListUuid });
      expect(mockGetAllUsersFromList).toHaveBeenCalledWith(fakeListUuid);
      expect(result).toEqual({ content: [{ type: 'text', text: JSON.stringify(fakeUsers, null, 2) }] });
    });

    it('should return error on failure', async () => {
      const fakeListUuid = 'list-users-fail';
      const error = new Error('Failed to get users');
      mockGetAllUsersFromList.mockRejectedValue(error);
      const tool = getTool('getAllUsersFromList');
      if (!tool) throw new Error('Tool getAllUsersFromList not found');
      const result = await tool.callback({ listUuid: fakeListUuid });
      expect(result).toEqual({
        content: [{ type: 'text', text: `Failed to get all users from list: ${error.message}` }],
      });
    });
  });

  // Test for getUserSettings
  describe('bring.getUserSettings tool', () => {
    it('should be registered correctly', () => {
      expect(mockMcpServerInstance.tool).toHaveBeenCalledWith(
        'getUserSettings',
        'Get the settings for the current authenticated user.',
        {},
        expect.any(Function),
      );
      const tool = getTool('getUserSettings');
      expect(tool).toBeDefined();
      expect(tool?.description).toBe('Get the settings for the current authenticated user.');
      expect(tool?.schema).toEqual({});
    });

    it('should return settings on success', async () => {
      const fakeSettings = { theme: 'dark', notifications: true };
      mockGetUserSettings.mockResolvedValue(fakeSettings);
      const tool = getTool('getUserSettings');
      if (!tool) throw new Error('Tool getUserSettings not found');
      const result = await tool.callback({});
      expect(mockGetUserSettings).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ content: [{ type: 'text', text: JSON.stringify(fakeSettings, null, 2) }] });
    });

    it('should return error on failure', async () => {
      const error = new Error('Failed to get settings');
      mockGetUserSettings.mockRejectedValue(error);
      const tool = getTool('getUserSettings');
      if (!tool) throw new Error('Tool getUserSettings not found');
      const result = await tool.callback({});
      expect(result).toEqual({ content: [{ type: 'text', text: `Failed to get user settings: ${error.message}` }] });
    });
  });

  // Test for getPendingInvitations
  describe('bring.getPendingInvitations tool', () => {
    it('should be registered correctly', () => {
      expect(mockMcpServerInstance.tool).toHaveBeenCalledWith(
        'getPendingInvitations',
        'Get any pending invitations for the authenticated user to join shopping lists.',
        {},
        expect.any(Function),
      );
      const tool = getTool('getPendingInvitations');
      expect(tool).toBeDefined();
      expect(tool?.description).toBe('Get any pending invitations for the authenticated user to join shopping lists.');
      expect(tool?.schema).toEqual({});
    });

    it('should return invitations on success', async () => {
      const fakeInvitations = [{ listId: 'list-invite', fromUser: 'UserA' }];
      mockGetPendingInvitations.mockResolvedValue(fakeInvitations);
      const tool = getTool('getPendingInvitations');
      if (!tool) throw new Error('Tool getPendingInvitations not found');
      const result = await tool.callback({});
      expect(mockGetPendingInvitations).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ content: [{ type: 'text', text: JSON.stringify(fakeInvitations, null, 2) }] });
    });

    it('should return error on failure', async () => {
      const error = new Error('Failed to get invitations');
      mockGetPendingInvitations.mockRejectedValue(error);
      const tool = getTool('getPendingInvitations');
      if (!tool) throw new Error('Tool getPendingInvitations not found');
      const result = await tool.callback({});
      expect(result).toEqual({
        content: [{ type: 'text', text: `Failed to get pending invitations: ${error.message}` }],
      });
    });
  });

  // Test for getDefaultList
  describe('bring.getDefaultList tool', () => {
    it('should be registered correctly', () => {
      expect(mockMcpServerInstance.tool).toHaveBeenCalledWith(
        'getDefaultList',
        'Get the UUID of the default shopping list for the authenticated user. Use this if the user does not ask for a special list.',
        {}, // No schema for this tool
        expect.any(Function),
      );
      const tool = getTool('getDefaultList');
      expect(tool).toBeDefined();
      expect(tool?.description).toBe(
        'Get the UUID of the default shopping list for the authenticated user. Use this if the user does not ask for a special list.',
      );
      expect(tool?.schema).toEqual({});
    });

    it('should return default list UUID on success', async () => {
      const fakeSettings = {
        usersettings: [
          { key: 'someOtherSetting', value: 'someValue' },
          { key: 'defaultListUUID', value: 'default-list-uuid-123' },
          { key: 'anotherSetting', value: 'anotherValue' },
        ],
      };
      // We mock getUserSettings because getDefaultList calls it internally
      mockGetUserSettings.mockResolvedValue(fakeSettings);
      const tool = getTool('getDefaultList');
      if (!tool) throw new Error('Tool getDefaultList not found');

      const result = await tool.callback({});
      expect(mockGetUserSettings).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        content: [{ type: 'text', text: 'default-list-uuid-123' }],
      });
    });

    it('should return error if defaultListUUID is not found in settings', async () => {
      const fakeSettingsWithoutUuid = {
        usersettings: [
          { key: 'someOtherSetting', value: 'someValue' },
          { key: 'anotherSetting', value: 'anotherValue' },
        ],
      };
      mockGetUserSettings.mockResolvedValue(fakeSettingsWithoutUuid);
      mockLoadLists.mockResolvedValue({ lists: [] });
      const tool = getTool('getDefaultList');
      if (!tool) throw new Error('Tool getDefaultList not found');

      const result = await tool.callback({});
      expect(mockGetUserSettings).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'No default list is configured. Set one in the Bring app, or call loadLists to choose.',
          },
        ],
      });
    });

    it('should return error if getUserSettings fails', async () => {
      const error = new Error('Failed to get user settings from API');
      mockGetUserSettings.mockRejectedValue(error);
      const tool = getTool('getDefaultList');
      if (!tool) throw new Error('Tool getDefaultList not found');

      const result = await tool.callback({});
      expect(mockGetUserSettings).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        content: [{ type: 'text', text: `Failed to get default list UUID: ${error.message}` }],
      });
    });

    it('should return error if usersettings structure is invalid', async () => {
      const fakeSettingsInvalidStructure = { someOtherProperty: 'value' }; // Missing usersettings array
      mockGetUserSettings.mockResolvedValue(fakeSettingsInvalidStructure);
      mockLoadLists.mockResolvedValue({ lists: [] });
      const tool = getTool('getDefaultList');
      if (!tool) throw new Error('Tool getDefaultList not found');

      const result = await tool.callback({});
      expect(mockGetUserSettings).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'No default list is configured. Set one in the Bring app, or call loadLists to choose.',
          },
        ],
      });
    });

    it('should fall back to the sole list UUID when defaultListUUID is unset', async () => {
      const soleListUuid = 'casa-list-uuid-456';
      mockGetUserSettings.mockResolvedValue({
        usersettings: [
          { key: 'autoPush', value: 'true' },
          { key: 'onboardClient', value: 'web' },
        ],
      });
      mockLoadLists.mockResolvedValue({
        lists: [{ listUuid: soleListUuid, name: 'Casa' }],
      });
      const tool = getTool('getDefaultList');
      if (!tool) throw new Error('Tool getDefaultList not found');

      const result = await tool.callback({});
      expect(mockGetUserSettings).toHaveBeenCalledTimes(1);
      expect(mockLoadLists).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        content: [{ type: 'text', text: soleListUuid }],
      });
    });

    it('should return guidance when defaultListUUID is unset and multiple lists exist', async () => {
      mockGetUserSettings.mockResolvedValue({
        usersettings: [{ key: 'autoPush', value: 'true' }],
      });
      mockLoadLists.mockResolvedValue({
        lists: [
          { listUuid: 'uuid-a', name: 'Casa' },
          { listUuid: 'uuid-b', name: 'Work' },
        ],
      });
      const tool = getTool('getDefaultList');
      if (!tool) throw new Error('Tool getDefaultList not found');

      const result = await tool.callback({});
      expect(mockLoadLists).toHaveBeenCalledTimes(1);
      expect(result.content[0].text).toMatch(/loadLists/i);
      expect(result.content[0].text).not.toMatch(/Failed to get default list UUID/i);
    });

    it('should return guidance when defaultListUUID is unset and no lists exist', async () => {
      mockGetUserSettings.mockResolvedValue({
        usersettings: [{ key: 'autoPush', value: 'true' }],
      });
      mockLoadLists.mockResolvedValue({ lists: [] });
      const tool = getTool('getDefaultList');
      if (!tool) throw new Error('Tool getDefaultList not found');

      const result = await tool.callback({});
      expect(mockLoadLists).toHaveBeenCalledTimes(1);
      expect(result.content[0].text).toMatch(/loadLists/i);
      expect(result.content[0].text).not.toMatch(/Failed to get default list UUID/i);
    });
  });
});
