import { getLocale, getTranslations } from 'next-intl/server';

import PageHeader from '@/components/PageHeader';

import type { AppLocale } from '../../../../i18n/routing';
import { getAppSettings } from '../../../../lib/settings';

import SettingsTabs from './_components/SettingsTabs';

export const dynamic = 'force-dynamic';

type SettingsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function SettingsPage({ params }: SettingsPageProps) {
  const locale = (await getLocale()) as AppLocale;
  const resolvedParams = await params;
  const t = await getTranslations({ locale, namespace: 'settings' });
  const settings = await getAppSettings();

  return (
    <section className="space-y-6">
      <PageHeader title={t('title')} description={t('subtitle')} />
      <SettingsTabs locale={(resolvedParams.locale as AppLocale) ?? locale} initialSettings={settings} />
    </section>
  );
}
