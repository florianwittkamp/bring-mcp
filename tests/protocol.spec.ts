import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { serveStdio, type StdioServerHandle } from '@modelcontextprotocol/server/stdio';
import type { BringService } from '../src/bringClient.js';
import { createBringServer } from '../src/server.js';

const listUuid = '11111111-1111-4111-8111-111111111111';

function createFakeBringService(): BringService {
  return {
    loadLists: jest.fn().mockResolvedValue({
      lists: [{ listUuid, name: 'Groceries', theme: 'ch.publisheria.bring.theme.1' }],
    }),
    getItems: jest.fn().mockResolvedValue({
      uuid: listUuid,
      status: 'SHARED',
      purchase: [{ name: 'Milk', specification: '1 L', itemId: 'Milk' }],
      recently: [],
    }),
    getItemsDetails: jest.fn().mockResolvedValue([
      {
        uuid: 'detail-1',
        itemId: 'Milk',
        listUuid,
        userIconItemId: '',
        userSectionId: '',
        assignedTo: '',
        imageUrl: '',
      },
    ]),
    saveItem: jest.fn().mockResolvedValue(''),
    saveItemBatch: jest.fn().mockResolvedValue([]),
    removeItem: jest.fn().mockResolvedValue(''),
    moveToRecentList: jest.fn().mockResolvedValue(''),
    saveItemImage: jest.fn().mockResolvedValue({ imageUrl: 'https://example.test/item.jpg' }),
    removeItemImage: jest.fn().mockResolvedValue(''),
    getAllUsersFromList: jest.fn().mockResolvedValue({ users: [] }),
    getUserSettings: jest.fn().mockResolvedValue({
      userSettings: [{ key: 'defaultListUUID', value: listUuid }],
      userlistsettings: [],
    }),
    loadTranslations: jest.fn().mockResolvedValue({ Milk: 'Milk' }),
    loadCatalog: jest.fn().mockResolvedValue({
      language: 'en-US',
      catalog: { sections: [] },
    }),
    getPendingInvitations: jest.fn().mockResolvedValue({ invitations: [] }),
    deleteMultipleItemsFromList: jest.fn().mockResolvedValue([]),
  } as BringService;
}

async function connectClient(mode: 'legacy' | 'modern', service = createFakeBringService()) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const serverHandle: StdioServerHandle = serveStdio(() => createBringServer(service, '2.0.0-test'), {
    legacy: 'serve',
    transport: serverTransport,
  });
  const client = new Client(
    { name: `bring-mcp-${mode}-test`, version: '1.0.0' },
    mode === 'modern'
      ? {
          versionNegotiation: { mode: { pin: '2026-07-28' } },
        }
      : undefined,
  );
  await client.connect(clientTransport);
  return { client, serverHandle };
}

async function closeConnection(client: Client, serverHandle: StdioServerHandle): Promise<void> {
  await client.close();
  await serverHandle.close();
}

describe.each(['legacy', 'modern'] as const)('%s MCP protocol', (mode) => {
  it('negotiates, discovers all tools, and calls an object-output tool', async () => {
    const { client, serverHandle } = await connectClient(mode);
    try {
      const tools = await client.listTools();
      const result = await client.callTool({ name: 'loadLists', arguments: {} });

      expect(client.getServerVersion()).toMatchObject({
        name: 'bring-mcp',
        title: 'Bring! Shopping Lists',
        version: '2.0.0-test',
      });
      expect(client.getInstructions()).toContain('getDefaultList');
      expect(tools.tools).toHaveLength(16);
      expect(tools.tools.every((tool) => tool.title && tool.inputSchema && tool.outputSchema)).toBe(true);
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toEqual({
        lists: [{ listUuid, name: 'Groceries', theme: 'ch.publisheria.bring.theme.1' }],
      });
    } finally {
      await closeConnection(client, serverHandle);
    }
  });

  it('projects root-array output according to the negotiated protocol era', async () => {
    const { client, serverHandle } = await connectClient(mode);
    try {
      const tools = await client.listTools();
      const detailsTool = tools.tools.find((tool) => tool.name === 'getItemsDetails');
      const result = await client.callTool({ name: 'getItemsDetails', arguments: { listUuid } });
      const expectedDetails = [
        {
          uuid: 'detail-1',
          itemId: 'Milk',
          listUuid,
          userIconItemId: '',
          userSectionId: '',
          assignedTo: '',
          imageUrl: '',
        },
      ];

      const expectedProtocolVersion = mode === 'modern' ? '2026-07-28' : '2025-11-25';
      const outputSchemas = {
        modern: { type: 'array' },
        legacy: {
          type: 'object',
          properties: { result: expect.objectContaining({ type: 'array' }) },
        },
      };
      const expectedStructuredContent = mode === 'modern' ? expectedDetails : { result: expectedDetails };

      expect(client.getNegotiatedProtocolVersion()).toBe(expectedProtocolVersion);
      expect(detailsTool?.outputSchema).toMatchObject(outputSchemas[mode]);
      expect(result.structuredContent).toEqual(expectedStructuredContent);
    } finally {
      await closeConnection(client, serverHandle);
    }
  });

  it('preserves tool failures as isError results over the wire', async () => {
    const service = createFakeBringService();
    jest.mocked(service.getItems).mockRejectedValue(new Error('Bring API unavailable'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { client, serverHandle } = await connectClient(mode, service);
    try {
      const result = await client.callTool({ name: 'getItems', arguments: { listUuid } });

      expect(result.isError).toBe(true);
      expect(result.content).toContainEqual({ type: 'text', text: 'Failed to get items: Bring API unavailable' });
    } finally {
      consoleErrorSpy.mockRestore();
      await closeConnection(client, serverHandle);
    }
  });
});
