import { getTranslations } from 'next-intl/server';

import PageHeader from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getBusinessRulesSettings, getDisplaySettings, getGeneralSettings } from '@/lib/app-settings';

import BusinessRulesForm from './_components/BusinessRulesForm';
import DisplaySettingsForm from './_components/DisplaySettingsForm';
import GeneralSettingsForm from './_components/GeneralSettingsForm';

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'settings' });
  const [generalSettings, displaySettings, businessRules] = await Promise.all([
    getGeneralSettings(),
    getDisplaySettings(),
    getBusinessRulesSettings(),
  ]);

  const numberLocale = displaySettings.locale === 'fa' ? 'fa-IR' : 'en-US';
  const sampleCurrency = new Intl.NumberFormat(numberLocale, {
    style: 'currency',
    currency: 'IRR',
    maximumFractionDigits: 0,
  }).format(1250000);

  return (
    <section className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="border-b border-[var(--border)] pb-2">
          <TabsTrigger value="general">{t('tabs.general')}</TabsTrigger>
          <TabsTrigger value="display">{t('tabs.display')}</TabsTrigger>
          <TabsTrigger value="rules">{t('tabs.rules')}</TabsTrigger>
          <TabsTrigger value="data">{t('tabs.data')}</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('general.title')}</h2>
            <p className="text-sm text-[var(--muted)]">{t('general.subtitle')}</p>
          </div>
          <GeneralSettingsForm defaultValues={generalSettings} />
        </TabsContent>
        <TabsContent value="display" className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('display.title')}</h2>
            <p className="text-sm text-[var(--muted)]">{t('display.subtitle')}</p>
          </div>
          <DisplaySettingsForm defaultValues={displaySettings} />
          <div className="rounded-2xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted-strong)]">
            <p>
              {t('display.currencyPreview', {
                currency: sampleCurrency,
              })}
            </p>
          </div>
        </TabsContent>
        <TabsContent value="rules" className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('business.title')}</h2>
            <p className="text-sm text-[var(--muted)]">{t('business.subtitle')}</p>
          </div>
          <BusinessRulesForm defaultValues={businessRules} />
        </TabsContent>
        <TabsContent value="data" className="space-y-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('data.title')}</h2>
            <p className="text-sm text-[var(--muted)]">{t('data.subtitle')}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <h3 className="text-sm font-semibold text-[var(--muted-strong)]">{t('data.export.title')}</h3>
              <p className="text-xs text-[var(--muted)]">{t('data.export.description')}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href="/api/reports/export"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {t('data.export.json')}
                </a>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <h3 className="text-sm font-semibold text-[var(--muted-strong)]">{t('data.import.title')}</h3>
              <p className="text-xs text-[var(--muted)]">{t('data.import.description')}</p>
              <a
                href="/products/import"
                className="mt-4 inline-flex items-center justify-center rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {t('data.import.link')}
              </a>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
