'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DisplaySettings } from '@/lib/app-settings';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { updateDisplaySettings } from '../actions';
import { displaySettingsSchema, type DisplaySettingsInput } from '../schemas';

const buttonClasses =
  'inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] shadow transition hover:bg-[var(--accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-70';

function FormRow({
  label,
  description,
  children,
  error,
}: {
  label: string;
  description?: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <div>
        <p className="text-sm font-medium text-[var(--muted-strong)]">{label}</p>
        {description ? <p className="text-xs text-[var(--muted)]">{description}</p> : null}
      </div>
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

const localeOptions = [
  { value: 'fa', labelKey: 'locale.fa' },
  { value: 'en', labelKey: 'locale.en' },
] as const;

export default function DisplaySettingsForm({ defaultValues }: { defaultValues: DisplaySettings }) {
  const t = useTranslations('settings.display');
  const form = useForm<DisplaySettingsInput>({
    defaultValues,
    resolver: zodResolver(displaySettingsSchema),
  });

  const localeValue = form.watch().locale;
  const rtlValue = form.watch().rtl;
  const previousLocale = useRef(localeValue);

  useEffect(() => {
    if (previousLocale.current !== localeValue && localeValue === 'fa') {
      form.setValue('rtl', true);
    }
    previousLocale.current = localeValue;
  }, [form, localeValue]);

  const numberPreview = new Intl.NumberFormat(localeValue === 'fa' ? 'fa-IR' : 'en-US', {
    maximumFractionDigits: 1,
  }).format(1234567.8);

  const onSubmit = useCallback(
    async (values: DisplaySettingsInput) => {
      try {
        await updateDisplaySettings(values);
        toast.success(t('success'));
      } catch (error) {
        console.error(error);
        toast.error(t('error'));
      }
    },
    [t],
  );

  const handleSubmit = form.handleSubmit(onSubmit, () => {
    toast.error(t('error'));
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormRow
        label={t('locale.label')}
        description={t('locale.help')}
        error={form.formState.errors['locale']?.message}
      >
        <Select
          value={localeValue}
          onValueChange={(next) => form.setValue('locale', next as DisplaySettingsInput['locale'])}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('locale.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {localeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow
        label={t('rtl.label')}
        description={t('rtl.help')}
        error={form.formState.errors['rtl']?.message}
      >
        <label className="inline-flex items-center gap-2 text-sm text-[var(--muted-strong)]">
          <input
            type="checkbox"
            checked={rtlValue}
            onChange={(event) => form.setValue('rtl', event.target.checked)}
            className="size-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span>{rtlValue ? t('rtl.on') : t('rtl.off')}</span>
        </label>
      </FormRow>

      <div className="grid gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted-strong)]">
        <div className="flex items-center justify-between">
          <span>{t('currency.label')}</span>
          <span>{t('currency.value')}</span>
        </div>
        <p className="text-xs text-[var(--muted)]">{t('currency.help')}</p>
        <div className="flex items-center justify-between">
          <span>{t('numberPreview.label')}</span>
          <span className="font-medium text-[var(--foreground)]">{numberPreview}</span>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" className={buttonClasses} disabled={form.formState.isSubmitting}>
          {t('submit')}
        </button>
      </div>
    </form>
  );
}
