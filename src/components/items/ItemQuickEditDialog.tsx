'use client';

import { Channel, ItemStatus } from '@prisma/client';
import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import type { AppLocale } from '../../../i18n/routing';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type ItemQuickEditDialogProps = {
  trigger: ReactNode;
  locale: AppLocale;
  itemId: string;
  productName: string;
  serial: string;
  initialStatus: ItemStatus;
  initialListedPriceToman: number | null;
  initialListedChannel: Channel | null;
  initialSaleChannel: Channel | null;
  initialSoldPriceToman: number | null;
};

type FormState = {
  status: ItemStatus;
  listedPrice: string;
  listedChannel: string;
  saleChannel: string;
  soldPrice: string;
};

const channelOptions = Object.values(Channel);
const statusOptions = [
  ItemStatus.IN_STOCK,
  ItemStatus.LISTED,
  ItemStatus.RESERVED,
  ItemStatus.SOLD,
] as const;

export default function ItemQuickEditDialog({
  trigger,
  locale,
  itemId,
  productName,
  serial,
  initialStatus,
  initialListedPriceToman,
  initialListedChannel,
  initialSaleChannel,
  initialSoldPriceToman,
}: ItemQuickEditDialogProps) {
  const router = useRouter();
  const t = useTranslations('dashboard.alerts.quickEdit');
  const tStatuses = useTranslations('statuses');
  const isRTL = locale === 'fa';
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialState = useMemo<FormState>(
    () => ({
      status: initialStatus,
      listedPrice: initialListedPriceToman != null ? String(initialListedPriceToman) : '',
      listedChannel: initialListedChannel ?? '',
      saleChannel: initialSaleChannel ?? '',
      soldPrice: initialSoldPriceToman != null ? String(initialSoldPriceToman) : '',
    }),
    [
      initialStatus,
      initialListedPriceToman,
      initialListedChannel,
      initialSaleChannel,
      initialSoldPriceToman,
    ],
  );

  const [form, setForm] = useState<FormState>(initialState);

  useEffect(() => {
    if (!open) {
      setForm(initialState);
      setIsSubmitting(false);
    }
  }, [open, initialState]);

  function updateForm<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: Record<string, unknown> = { status: form.status };

    const listedPriceTrimmed = form.listedPrice.trim();
    if (listedPriceTrimmed.length > 0) {
      const parsed = Number.parseInt(listedPriceTrimmed, 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        toast.error(t('error'));
        return;
      }
      payload.listedPriceToman = parsed;
    } else {
      payload.listedPriceToman = null;
    }

    payload.listedChannel = form.listedChannel ? form.listedChannel : null;

    const saleChannelValue = form.saleChannel ? form.saleChannel : null;

    if (form.status === ItemStatus.SOLD) {
      const soldPriceTrimmed = form.soldPrice.trim();
      if (!soldPriceTrimmed) {
        toast.error(t('soldPriceRequired'));
        return;
      }

      const parsedSoldPrice = Number.parseInt(soldPriceTrimmed, 10);
      if (Number.isNaN(parsedSoldPrice) || parsedSoldPrice <= 0) {
        toast.error(t('soldPriceRequired'));
        return;
      }

      payload.soldPriceToman = parsedSoldPrice;
      payload.saleChannel = saleChannelValue;
    } else {
      payload.soldPriceToman = null;
      payload.saleChannel = saleChannelValue;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        const message = data?.message ?? t('error');
        toast.error(message);
        return;
      }

      toast.success(t('success'));
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const cancelLabel = t('cancel');

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed inset-x-4 top-1/2 z-50 mx-auto w-full max-w-lg -translate-y-1/2 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <Dialog.Title className="text-lg font-semibold text-[var(--foreground)]">
                {t('title')}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-[var(--muted)]">
                {t('subtitle', { name: productName })}
              </Dialog.Description>
              <p className="text-xs text-[var(--muted-strong)]">{serial}</p>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                disabled={isSubmitting}
              >
                ×
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  className="text-sm font-medium text-[var(--muted-strong)]"
                  htmlFor="quick-status"
                >
                  {t('status')}
                </label>
                <Select
                  value={form.status}
                  onValueChange={(value) => updateForm('status', value as ItemStatus)}
                >
                  <SelectTrigger id="quick-status">
                    <SelectValue placeholder={t('status')} />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {tStatuses(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label
                  className="text-sm font-medium text-[var(--muted-strong)]"
                  htmlFor="quick-listed-channel"
                >
                  {t('listedChannel')}
                </label>
                <Select
                  value={form.listedChannel}
                  onValueChange={(value) => updateForm('listedChannel', value)}
                >
                  <SelectTrigger id="quick-listed-channel">
                    <SelectValue placeholder={t('listedChannel')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">—</SelectItem>
                    {channelOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  className="text-sm font-medium text-[var(--muted-strong)]"
                  htmlFor="quick-listed-price"
                >
                  {t('listedPrice')}
                </label>
                <input
                  id="quick-listed-price"
                  name="listedPrice"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.listedPrice}
                  onChange={(event) => updateForm('listedPrice', event.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] px-3 py-2 shadow-sm focus:border-[var(--accent)] focus:outline-none"
                />
                <span className="text-xs text-[var(--muted)]">
                  {form.listedPrice !== '' ? Number(form.listedPrice).toLocaleString() : ''}
                </span>
              </div>
              <div className="space-y-1">
                <label
                  className="text-sm font-medium text-[var(--muted-strong)]"
                  htmlFor="quick-sale-channel"
                >
                  {t('saleChannel')}
                </label>
                <Select
                  value={form.saleChannel}
                  onValueChange={(value) => updateForm('saleChannel', value)}
                >
                  <SelectTrigger id="quick-sale-channel">
                    <SelectValue placeholder={t('saleChannel')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">—</SelectItem>
                    {channelOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.status === ItemStatus.SOLD ? (
              <div className="space-y-1">
                <label
                  className="text-sm font-medium text-[var(--muted-strong)]"
                  htmlFor="quick-sold-price"
                >
                  {t('soldPrice')}
                </label>
                <input
                  id="quick-sold-price"
                  name="soldPrice"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.soldPrice}
                  onChange={(event) => updateForm('soldPrice', event.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] px-3 py-2 shadow-sm focus:border-[var(--accent)] focus:outline-none"
                  required
                />
                <span className="text-xs text-[var(--muted)]">
                  {form.soldPrice !== '' ? Number(form.soldPrice).toLocaleString() : ''}
                </span>
              </div>
            ) : null}

            <div className={`flex justify-end gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                  disabled={isSubmitting}
                >
                  {cancelLabel}
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-65"
                disabled={isSubmitting}
              >
                {isSubmitting ? '…' : t('save')}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
