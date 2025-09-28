import { Channel, ItemCondition, ItemStatus } from '@prisma/client';
import { z } from 'zod';


const tomanInt = z
  .number({ invalid_type_error: 'Toman amount must be provided as a number' })
  .int('Toman amount must be an integer')
  .min(0, 'Toman amount cannot be negative');

const optionalDateInput = z
  .union([z.date(), z.string().datetime({ message: 'Date must be a valid ISO 8601 string' })])
  .optional();

const requiredString = (field: string) =>
  z
    .string({ invalid_type_error: `${field} is required` })
    .trim()
    .min(1, `${field} is required`);

const optionalString = (field: string) =>
  z
    .string({ invalid_type_error: `${field} cannot be empty` })
    .trim()
    .min(1, `${field} cannot be empty`)
    .optional();

const imagesArray = z.array(z.string().url({ message: 'images must contain valid URLs' }));

export const createItemSchema = z
  .object({
    productId: requiredString('productId'),
    serial: requiredString('serial'),
    condition: z.nativeEnum(ItemCondition).default(ItemCondition.USED),
    status: z.nativeEnum(ItemStatus).default(ItemStatus.IN_STOCK),
    acquiredAt: optionalDateInput,
    purchaseToman: tomanInt,
    feesToman: tomanInt.default(0),
    refurbToman: tomanInt.default(0),
    location: optionalString('location'),
    listedChannel: z.nativeEnum(Channel).optional(),
    listedPriceToman: tomanInt.optional(),
    listedAt: optionalDateInput,
    soldAt: optionalDateInput,
    soldPriceToman: tomanInt.optional(),
    saleChannel: z.nativeEnum(Channel).optional(),
    buyerName: optionalString('buyerName'),
    notes: z.string().optional(),
    images: imagesArray.default([]),
  })
  .superRefine((data, ctx) => {
    if (data.status === ItemStatus.SOLD && data.soldPriceToman == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'soldPriceToman is required when status is SOLD',
        path: ['soldPriceToman'],
      });
    }
  });

export const updateItemSchema = z
  .object({
    productId: optionalString('productId'),
    serial: optionalString('serial'),
    condition: z.nativeEnum(ItemCondition).optional(),
    status: z.nativeEnum(ItemStatus).optional(),
    acquiredAt: optionalDateInput,
    purchaseToman: tomanInt.optional(),
    feesToman: tomanInt.optional(),
    refurbToman: tomanInt.optional(),
    location: optionalString('location'),
    listedChannel: z.nativeEnum(Channel).optional().nullable(),
    listedPriceToman: tomanInt.optional().nullable(),
    listedAt: optionalDateInput,
    soldAt: optionalDateInput,
    soldPriceToman: tomanInt.optional().nullable(),
    saleChannel: z.nativeEnum(Channel).optional(),
    buyerName: optionalString('buyerName'),
    notes: z.string().optional().nullable(),
    images: imagesArray.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === ItemStatus.SOLD && data.soldPriceToman == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'soldPriceToman is required when status is SOLD',
        path: ['soldPriceToman'],
      });
    }
  });

const saleLineSchema = z.object({
  productId: requiredString('productId'),
  itemId: optionalString('itemId'),
  unitToman: tomanInt,
});

export const createSaleSchema = z.object({
  customerName: requiredString('customerName'),
  channel: z.nativeEnum(Channel).optional(),
  reference: optionalString('reference'),
  orderedAt: optionalDateInput,
  totalToman: tomanInt,
  lines: z.array(saleLineSchema).min(1, 'At least one line item is required'),
});

const purchaseLineSchema = z.object({
  productId: requiredString('productId'),
  quantity: z
    .number({ invalid_type_error: 'quantity must be provided as a number' })
    .int('quantity must be an integer')
    .min(1, 'quantity must be at least 1'),
  unitToman: tomanInt,
  feesToman: tomanInt.default(0),
});

export const createPurchaseSchema = z.object({
  supplierName: requiredString('supplierName'),
  reference: optionalString('reference'),
  channel: z.nativeEnum(Channel).optional(),
  orderedAt: optionalDateInput,
  lines: z.array(purchaseLineSchema).min(1, 'At least one purchase line is required'),
});
