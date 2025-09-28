import { Channel, ItemCondition } from '@prisma/client';
import { z } from 'zod';

export const generalSettingsSchema = z.object({
  businessName: z.string().min(2, 'Business name is required').max(120),
  defaultChannel: z.nativeEnum(Channel),
  defaultCondition: z.nativeEnum(ItemCondition),
});

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;

export const displaySettingsSchema = z.object({
  locale: z.enum(['fa', 'en']),
  rtl: z.boolean(),
});

export type DisplaySettingsInput = z.infer<typeof displaySettingsSchema>;

export const businessRulesSchema = z
  .object({
    agingThresholds: z
      .array(z.coerce.number().int().min(1).max(720))
      .length(3, 'Provide three thresholds')
      .refine((values) => values[0] < values[1] && values[1] < values[2], {
        message: 'Thresholds must increase',
      }),
    minimumMarginPercent: z.coerce.number().min(0).max(100),
    staleListingThresholdDays: z.coerce.number().int().min(1).max(365),
  })
  .transform((value) => ({
    ...value,
    agingThresholds: [value.agingThresholds[0], value.agingThresholds[1], value.agingThresholds[2]] as [
      number,
      number,
      number,
    ],
  }));

export type BusinessRulesInput = z.infer<typeof businessRulesSchema>;
