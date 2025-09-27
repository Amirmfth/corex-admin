'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';

import type { AppLocale } from '../../../../../i18n/routing';
import { formatToman } from '../../../../../lib/money';
import {
  type AppSettings,
  appSettingsSchema,
  createZodResolver,
  sanitizeAppSettings,
} from '../../../../../lib/settings';

const CHANNEL_OPTIONS = ['DIRECT', 'ONLINE', 'WHOLESALE', 'OTHER'] as const;
const CONDITION_OPTIONS = ['NEW', 'USED', 'FOR_PARTS'] as const;
const LOCALE_OPTIONS: AppLocale[] = ['fa', 'en'];

interface SettingsTabsProps {
  locale: AppLocale;
  initialSettings: AppSettings;
}

type TabsValue = 'general' | 'display' | 'rules' | 'data';

type SettingsFormValues = AppSettings;

async function saveSettings(values: SettingsFormValues) {
  const response = await fetch('/api/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed');
  }

  return (await response.json()) as AppSettings;
}

export default function SettingsTabs({ locale, initialSettings }: SettingsTabsProps) {
  const t = useTranslations('settings');
  const tConditions = useTranslations('conditions');
  const [activeTab, setActiveTab] = useState<TabsValue>('general');

  const form = useForm<SettingsFormValues>({
    defaultValues: initialSettings,
    resolver: createZodResolver(appSettingsSchema),
  });

  const localeValue = (form.watch('display.locale') as AppLocale) ?? locale;
  const rtlPreference = form.watch('display.rtlPreference');
  const intlLocale = localeValue === 'fa' ? 'fa-IR' : 'en-US';
  const isRtl = rtlPreference === 'rtl' || (rtlPreference === 'auto' && localeValue === 'fa');

  useEffect(() => {
    if (localeValue === 'fa') {
      form.setValue('display.rtlPreference', 'auto');
    }
  }, [form, localeValue]);

  const numberPreview = useMemo(() => {
    const numberFormatter = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 2 });
    const sampleNumber = 1234567.89;
    return {
      decimal: numberFormatter.format(sampleNumber),
      currency: formatToman(9876543, intlLocale),
    };
  }, [intlLocale]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const saved = await saveSettings(values);
      form.reset(sanitizeAppSettings(saved));
      toast.success(t('feedback.saveSuccess'));
    } catch (error) {
      console.error(error);
      toast.error(t('feedback.saveError'));
    }
  }, () => {
    toast.error(t('feedback.invalid'));
  });

  const handleReset = () => {
    form.reset(initialSettings);
  };

  const handleRtlToggle = (checked: boolean) => {
    if (localeValue === 'fa') {
      form.setValue('display.rtlPreference', 'auto');
      return;
    }
    form.setValue('display.rtlPreference', checked ? 'rtl' : 'ltr');
  };

  return (
    <Form form={form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabsValue)}>
          <TabsList className="mb-4">
            <TabsTrigger value="general">{t('tabs.general')}</TabsTrigger>
            <TabsTrigger value="display">{t('tabs.display')}</TabsTrigger>
            <TabsTrigger value="rules">{t('tabs.rules')}</TabsTrigger>
            <TabsTrigger value="data">{t('tabs.data')}</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                name="general.businessName"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>{t('general.businessName.label')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('general.businessName.placeholder')} />
                    </FormControl>
                    <FormDescription>{t('general.businessName.description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="general.defaultChannel"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>{t('general.defaultChannel.label')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('general.defaultChannel.placeholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CHANNEL_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {t(`options.channels.${option}` as const)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{t('general.defaultChannel.description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              name="general.defaultItemCondition"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>{t('general.defaultCondition.label')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('general.defaultCondition.placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONDITION_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {tConditions(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t('general.defaultCondition.description')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="display" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                name="display.locale"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>{t('display.locale.label')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('display.locale.placeholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LOCALE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {t(`options.locales.${option}` as const)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{t('display.locale.description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="display.rtlPreference"
                render={() => (
                  <FormItem className="space-y-2">
                    <FormLabel>{t('display.rtl.label')}</FormLabel>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={isRtl}
                        onCheckedChange={handleRtlToggle}
                        disabled={localeValue === 'fa'}
                        aria-label={t('display.rtl.label')}
                      />
                      <span className="text-sm text-[var(--muted-strong)]">
                        {isRtl ? t('display.rtl.on') : t('display.rtl.off')}
                      </span>
                    </div>
                    <FormDescription>{t('display.rtl.description')}</FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <FormLabel>{t('display.currency.label')}</FormLabel>
                <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted-strong)]">
                  <div className="font-semibold">{t('display.currency.value')}</div>
                  <div className="text-xs text-[var(--muted)]">{t('display.currency.description')}</div>
                </div>
              </div>
              <div className="space-y-2">
                <FormLabel>{t('display.numberPreview.label')}</FormLabel>
                <div
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted-strong)]"
                  dir={isRtl ? 'rtl' : 'ltr'}
                >
                  <div>{numberPreview.decimal}</div>
                  <div className="text-xs text-[var(--muted)]">{numberPreview.currency}</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            <div className="space-y-4">
              <FormLabel>{t('rules.agingThresholds.label')}</FormLabel>
              <FormDescription>{t('rules.agingThresholds.description')}</FormDescription>
              <div className="grid gap-4 md:grid-cols-3">
                {[0, 1, 2].map((index) => (
                  <FormField
                    key={index}
                    name={`businessRules.agingThresholds.${index}`}
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>{t(`rules.agingThresholds.labels.${index}` as const)}</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <FormField
              name="businessRules.minimumMarginAlertPercent"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>{t('rules.minimumMargin.label')}</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={100} {...field} />
                  </FormControl>
                  <FormDescription>{t('rules.minimumMargin.description')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel>{t('rules.staleThresholds.label')}</FormLabel>
              <FormDescription>{t('rules.staleThresholds.description')}</FormDescription>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  name="businessRules.staleListingThresholds.warning"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>{t('rules.staleThresholds.warning')}</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="businessRules.staleListingThresholds.critical"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>{t('rules.staleThresholds.critical')}</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-[var(--muted-strong)]">{t('data.description')}</p>
              <p className="text-xs text-[var(--muted)]">{t('data.helper')}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/api/reports/export" target="_blank" rel="noreferrer">
                <Button type="button" variant="outline">
                  {t('data.exports.reports')}
                </Button>
              </Link>
              <Link href="/api/reports/export?scope=inventory" target="_blank" rel="noreferrer">
                <Button type="button" variant="outline">
                  {t('data.exports.inventory')}
                </Button>
              </Link>
              <Link href="/products/import">
                <Button type="button" variant="ghost">
                  {t('data.import.label')}
                </Button>
              </Link>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
          <Button type="button" variant="ghost" onClick={handleReset}>
            {t('actions.reset')}
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t('actions.saving') : t('actions.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
