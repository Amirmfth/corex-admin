import { Channel, ItemCondition } from '@prisma/client';
import { z } from 'zod';

import type { AppLocale } from '../i18n/routing';

import { prisma } from './prisma';

const shouldUseMemoryStore = process.env.APP_SETTINGS_MODE === 'memory' || !process.env.DATABASE_URL;
const memoryStore = new Map<string, unknown>();

const APP_LOCALES = ['fa', 'en'] as const satisfies readonly AppLocale[];

const rtlPreferenceSchema = z.enum(['auto', 'ltr', 'rtl']);

const generalSettingsSchema = z.object({
  businessName: z.string().min(1).max(120),
  defaultChannel: z.nativeEnum(Channel),
  defaultItemCondition: z.nativeEnum(ItemCondition),
});

const displaySettingsSchema = z.object({
  locale: z.enum(APP_LOCALES),
  rtlPreference: rtlPreferenceSchema,
});

const businessRulesSchema = z.object({
  agingThresholds: z
    .tuple([
      z.coerce.number().min(0),
      z.coerce.number().min(0),
      z.coerce.number().min(0),
    ])
    .transform((values) => values.map((value) => Math.round(value)) as [number, number, number]),
  minimumMarginAlertPercent: z.coerce.number().min(0).max(100),
  staleListingThresholds: z.object({
    warning: z.coerce.number().min(0),
    critical: z.coerce.number().min(0),
  }),
});

export const appSettingsSchema = z.object({
  general: generalSettingsSchema,
  display: displaySettingsSchema,
  businessRules: businessRulesSchema,
});

const appSettingsPartialSchema = appSettingsSchema.deepPartial();

export type AppSettings = z.infer<typeof appSettingsSchema>;
export type GeneralSettings = AppSettings['general'];
export type DisplaySettings = AppSettings['display'];
export type BusinessRulesSettings = AppSettings['businessRules'];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  general: {
    businessName: 'CoreX Inventory',
    defaultChannel: Channel.DIRECT,
    defaultItemCondition: ItemCondition.USED,
  },
  display: {
    locale: 'fa',
    rtlPreference: 'auto',
  },
  businessRules: {
    agingThresholds: [30, 90, 180],
    minimumMarginAlertPercent: 20,
    staleListingThresholds: {
      warning: 30,
      critical: 60,
    },
  },
};

type FieldErrors<T> = Partial<Record<string, { message?: string }>> & {
  _values?: T;
  _all?: never;
};

function normalizeAgingThresholds(values: [number, number, number]): [number, number, number] {
  const sorted = values
    .map((value) => Math.max(0, Math.round(value)))
    .sort((a, b) => a - b) as [number, number, number];

  const normalized: [number, number, number] = [...sorted] as [number, number, number];
  for (let index = 1; index < normalized.length; index += 1) {
    if (normalized[index]! <= normalized[index - 1]!) {
      normalized[index] = normalized[index - 1]! + 1;
    }
  }

  return normalized;
}

function normalizeStaleThresholds(thresholds: BusinessRulesSettings['staleListingThresholds']): BusinessRulesSettings['staleListingThresholds'] {
  const warning = Math.max(0, Math.round(thresholds.warning));
  let critical = Math.max(0, Math.round(thresholds.critical));
  if (critical <= warning) {
    critical = warning + 1;
  }

  return { warning, critical };
}

function sanitizeBusinessRules(rules: BusinessRulesSettings): BusinessRulesSettings {
  return {
    agingThresholds: normalizeAgingThresholds(rules.agingThresholds),
    minimumMarginAlertPercent: Math.min(100, Math.max(0, Math.round(rules.minimumMarginAlertPercent))),
    staleListingThresholds: normalizeStaleThresholds(rules.staleListingThresholds),
  };
}

function sanitizeDisplaySettings(settings: DisplaySettings): DisplaySettings {
  const fallbackLocale = DEFAULT_APP_SETTINGS.display.locale;
  const locale = APP_LOCALES.includes(settings.locale) ? settings.locale : fallbackLocale;
  const rtlPreference = rtlPreferenceSchema.safeParse(settings.rtlPreference).success
    ? settings.rtlPreference
    : DEFAULT_APP_SETTINGS.display.rtlPreference;

  return { locale, rtlPreference };
}

function sanitizeGeneralSettings(settings: GeneralSettings): GeneralSettings {
  const trimmedName = settings.businessName.trim();
  return {
    businessName: trimmedName.length > 0 ? trimmedName : DEFAULT_APP_SETTINGS.general.businessName,
    defaultChannel: settings.defaultChannel,
    defaultItemCondition: settings.defaultItemCondition,
  };
}

export function sanitizeAppSettings(settings: AppSettings): AppSettings {
  return {
    general: sanitizeGeneralSettings(settings.general),
    display: sanitizeDisplaySettings(settings.display),
    businessRules: sanitizeBusinessRules(settings.businessRules),
  };
}

function mergeAppSettings(base: AppSettings, incoming: z.infer<typeof appSettingsPartialSchema>): AppSettings {
  const general = incoming.general ? { ...base.general, ...incoming.general } : base.general;
  const display = incoming.display ? { ...base.display, ...incoming.display } : base.display;

  let businessRules = base.businessRules;
  if (incoming.businessRules) {
    const current = { ...businessRules };
    if (incoming.businessRules.agingThresholds) {
      const merged = [
        incoming.businessRules.agingThresholds[0] ?? businessRules.agingThresholds[0],
        incoming.businessRules.agingThresholds[1] ?? businessRules.agingThresholds[1],
        incoming.businessRules.agingThresholds[2] ?? businessRules.agingThresholds[2],
      ] as [number, number, number];
      current.agingThresholds = normalizeAgingThresholds(merged);
    }
    if (incoming.businessRules.minimumMarginAlertPercent != null) {
      current.minimumMarginAlertPercent = incoming.businessRules.minimumMarginAlertPercent;
    }
    if (incoming.businessRules.staleListingThresholds) {
      current.staleListingThresholds = {
        warning: incoming.businessRules.staleListingThresholds.warning ?? businessRules.staleListingThresholds.warning,
        critical: incoming.businessRules.staleListingThresholds.critical ?? businessRules.staleListingThresholds.critical,
      };
    }
    businessRules = sanitizeBusinessRules(current);
  }

  return sanitizeAppSettings({
    general: sanitizeGeneralSettings(general),
    display: sanitizeDisplaySettings(display),
    businessRules,
  });
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  if (shouldUseMemoryStore) {
    return (memoryStore.get(key) as T) ?? defaultValue;
  }

  try {
    const record = await prisma.appSetting.findUnique({ where: { key } });
    if (!record) {
      return defaultValue;
    }
    return (record.value as T) ?? defaultValue;
  } catch (error) {
    console.warn('Failed to load setting', key, error);
    return defaultValue;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  if (shouldUseMemoryStore) {
    memoryStore.set(key, value as unknown as object);
    return;
  }

  await prisma.appSetting.upsert({
    where: { key },
    update: { value: value as unknown as object },
    create: { key, value: value as unknown as object },
  });
}

export async function getAppSettings(): Promise<AppSettings> {
  const stored = await getSetting<unknown>('app.settings', null);
  if (!stored) {
    return DEFAULT_APP_SETTINGS;
  }

  const parsed = appSettingsPartialSchema.safeParse(stored);
  if (!parsed.success) {
    return DEFAULT_APP_SETTINGS;
  }

  return mergeAppSettings(DEFAULT_APP_SETTINGS, parsed.data);
}

export async function setAppSettings(settings: AppSettings): Promise<AppSettings> {
  const sanitized = sanitizeAppSettings(settings);
  await setSetting('app.settings', sanitized);
  return sanitized;
}

export async function getGeneralSettings(): Promise<GeneralSettings> {
  const settings = await getAppSettings();
  return settings.general;
}

export async function getDisplaySettings(): Promise<DisplaySettings> {
  const settings = await getAppSettings();
  return settings.display;
}

export async function getBusinessRulesSettings(): Promise<BusinessRulesSettings> {
  const settings = await getAppSettings();
  return settings.businessRules;
}

export type ResolverResult<T> = Promise<{ values: T; errors: FieldErrors<T> }>;

export type FormResolver<T> = (values: T) => ResolverResult<T>;

export function createZodResolver<T>(schema: z.ZodType<T>): FormResolver<T> {
  return async (values: T) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }

    const errors: FieldErrors<T> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (!errors[path]) {
        errors[path] = { message: issue.message };
      }
    }

    return { values, errors };
  };
}
