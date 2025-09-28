'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useCallback, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { BusinessRulesSettings } from '@/lib/app-settings';

import { updateBusinessRules } from '../actions';
import { businessRulesSchema, type BusinessRulesInput } from '../schemas';

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

export default function BusinessRulesForm({
  defaultValues,
}: {
  defaultValues: BusinessRulesSettings;
}) {
  const t = useTranslations('settings.business');
  const form = useForm<BusinessRulesInput>({
    defaultValues,
    resolver: zodResolver(businessRulesSchema),
  });

  const thresholds = form.watch().agingThresholds;
  const marginValue = form.watch().minimumMarginPercent;
  const staleValue = form.watch().staleListingThresholdDays;
  const INDICES = [0, 1, 2] as const;
  type Index = (typeof INDICES)[number];

  const onSubmit = useCallback(
    async (values: BusinessRulesInput) => {
      try {
        await updateBusinessRules(values);
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
        label={t('agingThresholds.label')}
        description={t('agingThresholds.help')}
        error={form.formState.errors['agingThresholds']?.message}
      >
        <div className="flex flex-wrap gap-3">
          {INDICES.map((index: Index) => (
            <div key={index} className="flex flex-col gap-1">
              <input
                type="number"
                min={1}
                max={720}
                value={thresholds[index]}
                onChange={(event) =>
                  form.setValue(`agingThresholds.${index}` as const, Number(event.target.value))
                }
                className="w-24 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
              />
              <span className="text-xs text-[var(--muted)]">
                {t('agingThresholds.item', { index: index + 1 })}
              </span>
              {form.formState.errors.agingThresholds?.[index]?.message ? (
                <span className="text-xs text-red-500">
                  {form.formState.errors.agingThresholds?.[index]?.message}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </FormRow>

      <FormRow
        label={t('minimumMargin.label')}
        description={t('minimumMargin.help')}
        error={form.formState.errors['minimumMarginPercent']?.message}
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={marginValue}
            onChange={(event) => form.setValue('minimumMarginPercent', Number(event.target.value))}
            className="w-24 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
          />
          <span className="text-sm text-[var(--muted)]">%</span>
        </div>
      </FormRow>

      <FormRow
        label={t('staleThreshold.label')}
        description={t('staleThreshold.help')}
        error={form.formState.errors['staleListingThresholdDays']?.message}
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={365}
            value={staleValue}
            onChange={(event) =>
              form.setValue('staleListingThresholdDays', Number(event.target.value))
            }
            className="w-28 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
          />
          <span className="text-sm text-[var(--muted)]">{t('staleThreshold.unit')}</span>
        </div>
      </FormRow>

      <div className="flex justify-end">
        <button type="submit" className={buttonClasses} disabled={form.formState.isSubmitting}>
          {t('submit')}
        </button>
      </div>
    </form>
  );
}
