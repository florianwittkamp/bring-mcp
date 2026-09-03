import { z } from 'zod';

export const shoppingListSchema = z.object({
  listUuid: z.string().describe('Unique identifier of the shopping list.'),
  name: z.string().describe('Display name of the shopping list.'),
  theme: z.string().optional().describe('Bring! theme assigned to the shopping list.'),
});

export const loadListsOutputSchema = z.object({
  lists: z.array(shoppingListSchema),
});

export const shoppingItemSchema = z.object({
  name: z.string(),
  specification: z.string().nullable(),
  itemId: z.string().describe('Identifier accepted by item mutation tools.'),
});

export const getItemsOutputSchema = z.object({
  uuid: z.string(),
  status: z.string(),
  purchase: z.array(shoppingItemSchema),
  recently: z.array(shoppingItemSchema),
});

export const itemDetailsSchema = z.object({
  uuid: z.string(),
  itemId: z.string(),
  listUuid: z.string(),
  userIconItemId: z.string(),
  userSectionId: z.string(),
  assignedTo: z.string(),
  imageUrl: z.string(),
});

export const getItemsDetailsOutputSchema = z.array(itemDetailsSchema);

export const saveItemOutputSchema = z.object({
  success: z.literal(true),
  listUuid: z.string(),
  itemName: z.string(),
  specification: z.string().nullable(),
});

export const saveItemBatchOutputSchema = z.object({
  success: z.literal(true),
  listUuid: z.string(),
  count: z.number().int().nonnegative(),
  items: z.array(
    z.object({
      itemName: z.string(),
      specification: z.string().nullable(),
    }),
  ),
});

export const itemMutationOutputSchema = z.object({
  success: z.literal(true),
  listUuid: z.string(),
  itemId: z.string(),
});

export const imageMutationOutputSchema = z.object({
  success: z.literal(true),
  itemId: z.string(),
  imageUrl: z.string().optional(),
});

export const deleteMultipleItemsOutputSchema = z.object({
  success: z.literal(true),
  listUuid: z.string(),
  count: z.number().int().nonnegative(),
  itemNames: z.array(z.string()),
});

export const listUserSchema = z.object({
  publicUuid: z.string(),
  name: z.string(),
  email: z.string(),
  photoPath: z.string(),
  pushEnabled: z.boolean(),
  plusTryOut: z.boolean(),
  country: z.string(),
  language: z.string(),
});

export const getAllUsersOutputSchema = z.object({
  users: z.array(listUserSchema),
});

export const settingSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export const getUserSettingsOutputSchema = z.object({
  settings: z.array(settingSchema),
  listSettings: z.array(
    z.object({
      listUuid: z.string(),
      settings: z.array(settingSchema),
    }),
  ),
});

export const getPendingInvitationsOutputSchema = z.object({
  invitations: z.array(z.unknown()),
});

export const getDefaultListOutputSchema = z.object({
  listUuid: z.string().nullable(),
  source: z.enum(['configured', 'only-list', 'not-configured']),
  message: z.string().optional(),
});

export const translationsOutputSchema = z.record(z.string(), z.string());

export const catalogItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
});

export const catalogSectionSchema = z.object({
  sectionId: z.string(),
  name: z.string(),
  items: z.array(catalogItemSchema),
});

export const catalogOutputSchema = z.object({
  language: z.string(),
  catalog: z.object({
    sections: z.array(catalogSectionSchema),
  }),
});
