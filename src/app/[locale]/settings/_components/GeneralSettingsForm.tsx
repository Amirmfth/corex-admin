'use client';

import { useTranslations } from 'next-intl';
import { useCallback, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GeneralSettings } from '@/lib/app-settings';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { updateGeneralSettings } from '../actions';
import {
  generalSettingsSchema,
  type GeneralSettingsInput,
} from '../schemas';

const CHANNEL_OPTIONS = ['DIRECT', 'ONLINE', 'WHOLESALE', 'OTHER'] as const;
const CONDITION_OPTIONS = ['NEW', 'USED', 'FOR_PARTS'] as const;

const buttonClasses =
  'inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] shadow transition hover:bg-[var(--accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-70';

function FormRow({ label, description, children, error }: {
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

export default function GeneralSettingsForm({ defaultValues }: { defaultValues: GeneralSettings }) {
  const t = useTranslations('settings.general');
  const form = useForm<GeneralSettingsInput>({
    defaultValues,
    resolver: zodResolver(generalSettingsSchema),
  });

  const channelValue = form.watch().defaultChannel;
  const conditionValue = form.watch().defaultCondition;

  const onSubmit = useCallback(
    async (values: GeneralSettingsInput) => {
      try {
        await updateGeneralSettings(values);
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
        label={t('businessName.label')}
        description={t('businessName.help')}
        error={form.formState.errors['businessName']?.message}
      >
        <input
          type="text"
          {...form.register('businessName')}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
        />
      </FormRow>

      <FormRow
        label={t('defaultChannel.label')}
        description={t('defaultChannel.help')}
        error={form.formState.errors['defaultChannel']?.message}
      >
        <Select
          value={channelValue}
          onValueChange={(next) => form.setValue('defaultChannel', next as GeneralSettingsInput['defaultChannel'])}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('defaultChannel.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {CHANNEL_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`defaultChannel.options.${option.toLowerCase() as 'direct' | 'online' | 'wholesale' | 'other'}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow
        label={t('defaultCondition.label')}
        description={t('defaultCondition.help')}
        error={form.formState.errors['defaultCondition']?.message}
      >
        <Select
          value={conditionValue}
          onValueChange={(next) =>
            form.setValue('defaultCondition', next as GeneralSettingsInput['defaultCondition'])
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t('defaultCondition.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {CONDITION_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`defaultCondition.options.${option.toLowerCase() as 'new' | 'used' | 'for_parts'}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>

      <div className="flex justify-end">
        <button type="submit" className={buttonClasses} disabled={form.formState.isSubmitting}>
          {t('submit')}
        </button>
      </div>
    </form>
  );
}
