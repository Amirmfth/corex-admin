import { Channel, ItemCondition } from '@prisma/client';

import type { AppLocale } from '../../i18n/routing';
import { prisma } from '../../lib/prisma';

export type SettingsKey = 'general' | 'display' | 'businessRules';

export type GeneralSettings = {
  businessName: string;
  defaultChannel: Channel;
  defaultCondition: ItemCondition;
};

export type DisplaySettings = {
  locale: AppLocale;
  rtl: boolean;
};

export type BusinessRulesSettings = {
  agingThresholds: [number, number, number];
  minimumMarginPercent: number;
  staleListingThresholdDays: number;
};

export type AgingBucketDefinition = {
  key: string;
  label: string;
  minDays: number;
  maxDays: number | null;
  threshold: number | null;
};

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  businessName: 'CoreX',
  defaultChannel: Channel.DIRECT,
  defaultCondition: ItemCondition.USED,
};

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  locale: 'fa',
  rtl: true,
};

export const DEFAULT_BUSINESS_RULES: BusinessRulesSettings = {
  agingThresholds: [30, 90, 180],
  minimumMarginPercent: 15,
  staleListingThresholdDays: 30,
};

export async function getSetting<T>(key: SettingsKey, defaultValue: T): Promise<T> {
  const record = await prisma.appSetting.findUnique({ where: { key } });
  if (!record) {
    return defaultValue;
  }
  try {
    const value = record.value as unknown as T;
    if (value == null) {
      return defaultValue;
    }
    return value;
  } catch (error) {
    console.warn(`[settings] Failed to parse setting for ${key}:`, error);
    return defaultValue;
  }
}

export async function setSetting<T>(key: SettingsKey, value: T): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value: value as any },
    create: { key, value: value as any },
  });
}

function clampNumber(value: unknown, fallback: number, { min, max }: { min: number; max?: number }): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  const normalized = Math.floor(value);
  const lower = Math.max(normalized, min);
  if (typeof max === 'number') {
    return Math.min(lower, max);
  }
  return lower;
}

function normalizeAgingThresholds(thresholds: unknown): [number, number, number] {
  const source = Array.isArray(thresholds) ? thresholds : DEFAULT_BUSINESS_RULES.agingThresholds;
  const sanitized = source
    .slice(0, 3)
    .map((value, index) => clampNumber(value, DEFAULT_BUSINESS_RULES.agingThresholds[index] ?? 30, { min: 1 })) as number[];

  while (sanitized.length < 3) {
    const fallback = DEFAULT_BUSINESS_RULES.agingThresholds[sanitized.length]!;
    sanitized.push(fallback);
  }

  sanitized.sort((a, b) => a - b);

  for (let i = 1; i < sanitized.length; i += 1) {
    if (sanitized[i] <= sanitized[i - 1]) {
      sanitized[i] = sanitized[i - 1] + 1;
    }
  }

  return [sanitized[0]!, sanitized[1]!, sanitized[2]!];
}

export function buildAgingBucketDefinitions(agingThresholds: [number, number, number]): AgingBucketDefinition[] {
  const [first, second, third] = agingThresholds;
  return [
    {
      key: `0-${first}`,
      label: `0-${first}`,
      minDays: 0,
      maxDays: first,
      threshold: first,
    },
    {
      key: `${first + 1}-${second}`,
      label: `${first + 1}-${second}`,
      minDays: first + 1,
      maxDays: second,
      threshold: second,
    },
    {
      key: `${second + 1}-${third}`,
      label: `${second + 1}-${third}`,
      minDays: second + 1,
      maxDays: third,
      threshold: third,
    },
    {
      key: `${third + 1}+`,
      label: `${third + 1}+`,
      minDays: third + 1,
      maxDays: null,
      threshold: null,
    },
  ];
}

export async function getGeneralSettings(): Promise<GeneralSettings> {
  const raw = await getSetting('general', DEFAULT_GENERAL_SETTINGS);
  const channel = Object.values(Channel).includes(raw.defaultChannel) ? raw.defaultChannel : DEFAULT_GENERAL_SETTINGS.defaultChannel;
  const condition = Object.values(ItemCondition).includes(raw.defaultCondition)
    ? raw.defaultCondition
    : DEFAULT_GENERAL_SETTINGS.defaultCondition;
  const name = typeof raw.businessName === 'string' && raw.businessName.trim() ? raw.businessName.trim() : DEFAULT_GENERAL_SETTINGS.businessName;

  return {
    businessName: name,
    defaultChannel: channel,
    defaultCondition: condition,
  };
}

export async function getDisplaySettings(): Promise<DisplaySettings> {
  const raw = await getSetting('display', DEFAULT_DISPLAY_SETTINGS);
  const locale: AppLocale = raw.locale === 'en' ? 'en' : 'fa';
  const rtl = typeof raw.rtl === 'boolean' ? raw.rtl : locale === 'fa';
  return { locale, rtl };
}

export async function getBusinessRulesSettings(): Promise<BusinessRulesSettings> {
  const raw = await getSetting('businessRules', DEFAULT_BUSINESS_RULES);
  const thresholds = normalizeAgingThresholds(raw.agingThresholds);
  const margin = clampNumber(raw.minimumMarginPercent, DEFAULT_BUSINESS_RULES.minimumMarginPercent, { min: 0, max: 100 });
  const stale = clampNumber(raw.staleListingThresholdDays, DEFAULT_BUSINESS_RULES.staleListingThresholdDays, { min: 1 });

  return {
    agingThresholds: thresholds,
    minimumMarginPercent: margin,
    staleListingThresholdDays: stale,
  };
}
