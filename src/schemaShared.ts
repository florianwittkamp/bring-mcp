import { z } from 'zod';

export const noArgsSchema = z.strictObject({});

export const listUuidParam = {
  listUuid: z.string().uuid({ message: 'Invalid list UUID' }),
};

export const itemIdParam = {
  itemId: z.string().min(1, { message: 'Item ID cannot be empty' }),
};

export const itemNameParam = {
  itemName: z.string().min(1, { message: 'Item name cannot be empty' }),
};

export const itemSpecificationParam = {
  specification: z.string().nullable().optional(),
};

const MAX_IMAGE_DATA_LENGTH = 6_990_508;
const BASE64_IMAGE_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export const itemImageDataParam = {
  imageData: z
    .string()
    .min(1, { message: 'Image data cannot be empty' })
    .max(MAX_IMAGE_DATA_LENGTH, { message: 'Image data exceeds the 5 MiB limit' })
    .regex(BASE64_IMAGE_PATTERN, { message: 'Image data must be valid base64' })
    .refine((value) => value.length % 4 === 0, { message: 'Image data must be valid base64' }),
};

export const batchItemSchema = z.object({
  itemName: z.string().min(1, { message: 'Item name cannot be empty in batch' }),
  specification: z.string().nullable().optional(),
});

export const saveItemBatchParams = {
  ...listUuidParam,
  items: z.array(batchItemSchema).min(1, { message: 'Items array cannot be empty' }),
};

export const itemNamesArrayParam = {
  itemNames: z
    .array(z.string().min(1, { message: 'Item name in array cannot be empty' }))
    .min(1, { message: 'Item names array cannot be empty' }),
};
