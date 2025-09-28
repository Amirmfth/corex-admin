'use server';

import { revalidatePath } from 'next/cache';

import { setSetting } from '@/lib/app-settings';

import { routing } from '../../../../i18n/routing';

import type {
  BusinessRulesInput,
  DisplaySettingsInput,
  GeneralSettingsInput,
} from './schemas';
import {
  businessRulesSchema,
  displaySettingsSchema,
  generalSettingsSchema,
} from './schemas';

function revalidateDashboards() {
  routing.locales.forEach((locale) => {
    revalidatePath(`/${locale}/dashboard`);
    revalidatePath(`/${locale}/reports`);
    revalidatePath(`/${locale}/settings`);
  });
}

export async function updateGeneralSettings(values: GeneralSettingsInput) {
  const parsed = generalSettingsSchema.parse(values);
  await setSetting('general', parsed);
  revalidateDashboards();
}

export async function updateDisplaySettings(values: DisplaySettingsInput) {
  const parsed = displaySettingsSchema.parse(values);
  await setSetting('display', parsed);
  routing.locales.forEach((locale) => {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/dashboard`);
    revalidatePath(`/${locale}/settings`);
  });
}

export async function updateBusinessRules(values: BusinessRulesInput) {
  const parsed = businessRulesSchema.parse(values);
  await setSetting('businessRules', parsed);
  revalidateDashboards();
}
