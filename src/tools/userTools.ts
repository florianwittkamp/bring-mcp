import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { BringService } from '../bringClient.js';
import { registerTool } from '../registerTool.js';
import { listUuidParam, noArgsSchema } from '../schemaShared.js';
import { READ_ONLY_TOOL_ANNOTATIONS } from '../toolAnnotations.js';
import {
  getAllUsersOutputSchema,
  getDefaultListOutputSchema,
  getPendingInvitationsOutputSchema,
  getUserSettingsOutputSchema,
  loadListsOutputSchema,
  settingSchema,
} from '../toolSchemas.js';

type Setting = z.infer<typeof settingSchema>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeSettings(value: unknown): Setting[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const parsed = settingSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

export function normalizeUserSettings(value: unknown): z.infer<typeof getUserSettingsOutputSchema> {
  const source = isRecord(value) ? value : {};
  const rawListSettings = source.userlistsettings ?? source.userListSettings;
  const listSettings = Array.isArray(rawListSettings)
    ? rawListSettings.flatMap((entry) => {
        if (!isRecord(entry) || typeof entry.listUuid !== 'string') return [];
        return [
          {
            listUuid: entry.listUuid,
            settings: normalizeSettings(entry.usersettings ?? entry.userSettings ?? entry.settings),
          },
        ];
      })
    : [];

  return getUserSettingsOutputSchema.parse({
    settings: normalizeSettings(source.usersettings ?? source.userSettings ?? source.settings),
    listSettings,
  });
}

export function registerUserTools(server: McpServer, bc: BringService) {
  const getAllUsersFromListParams = z.object({
    ...listUuidParam,
  });
  registerTool({
    server,
    bc,
    name: 'getAllUsersFromList',
    title: 'Get Shopping List Users',
    description: 'Get all users associated with a specific shopping list.',
    inputSchema: getAllUsersFromListParams,
    outputSchema: getAllUsersOutputSchema,
    actionFn: async (args, bc) => getAllUsersOutputSchema.parse(await bc.getAllUsersFromList(args.listUuid)),
    failureMessage: 'Failed to get all users from list',
    annotations: READ_ONLY_TOOL_ANNOTATIONS,
  });

  registerTool({
    server,
    bc,
    name: 'getUserSettings',
    title: 'Get Bring! User Settings',
    description: 'Get the settings for the current authenticated user.',
    inputSchema: noArgsSchema,
    outputSchema: getUserSettingsOutputSchema,
    actionFn: async (_args, bc) => normalizeUserSettings(await bc.getUserSettings()),
    failureMessage: 'Failed to get user settings',
    annotations: READ_ONLY_TOOL_ANNOTATIONS,
  });

  registerTool({
    server,
    bc,
    name: 'getPendingInvitations',
    title: 'Get Pending Shopping List Invitations',
    description: 'Get any pending invitations for the authenticated user to join shopping lists.',
    inputSchema: noArgsSchema,
    outputSchema: getPendingInvitationsOutputSchema,
    actionFn: async (_args, bc) => getPendingInvitationsOutputSchema.parse(await bc.getPendingInvitations()),
    failureMessage: 'Failed to get pending invitations',
    annotations: READ_ONLY_TOOL_ANNOTATIONS,
  });

  registerTool({
    server,
    bc,
    name: 'getDefaultList',
    title: 'Get Default Shopping List',
    description:
      'Get the UUID of the default shopping list for the authenticated user. Use this if the user does not ask for a special list.',
    inputSchema: noArgsSchema,
    outputSchema: getDefaultListOutputSchema,
    actionFn: async (_args, bc) => {
      const settings = normalizeUserSettings(await bc.getUserSettings());
      const defaultListSetting = [
        ...settings.settings,
        ...settings.listSettings.flatMap((entry) => entry.settings),
      ].find((setting) => setting.key === 'defaultListUUID');
      if (defaultListSetting) {
        return getDefaultListOutputSchema.parse({
          listUuid: defaultListSetting.value,
          source: 'configured',
        });
      }

      const listsResponse = loadListsOutputSchema.parse(await bc.loadLists());
      const lists = listsResponse.lists;
      if (Array.isArray(lists) && lists.length === 1 && lists[0]?.listUuid) {
        return getDefaultListOutputSchema.parse({
          listUuid: lists[0].listUuid,
          source: 'only-list',
        });
      }

      return getDefaultListOutputSchema.parse({
        listUuid: null,
        source: 'not-configured',
        message: 'No default list is configured. Set one in the Bring app, or call loadLists to choose.',
      });
    },
    failureMessage: 'Failed to get default list UUID',
    annotations: READ_ONLY_TOOL_ANNOTATIONS,
  });
}
