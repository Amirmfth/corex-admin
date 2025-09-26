'use client';

import { Channel, ItemStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type ItemDetailFormProps = {
  itemId: string;
  location: string;
  notes: string;
  listedPriceToman?: number;
  listedChannel: Channel | null;
  status: ItemStatus;
  saleChannel: Channel | null;
  soldPriceToman?: number;
};

type FormState = {
  location: string;
  notes: string;
  listedPrice: string;
  listedChannel: string;
  status: ItemStatus;
  saleChannel: string;
  soldPrice: string;
};

const channelOptions = Object.values(Channel);
const statusOptions = Object.values(ItemStatus);

export default function ItemDetailForm({
  itemId,
  location,
  notes,
  listedPriceToman,
  listedChannel,
  status,
  saleChannel,
  soldPriceToman,
}: ItemDetailFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useTranslations('itemDetail');

  const [form, setForm] = useState<FormState>({
    location,
    notes,
    listedPrice: listedPriceToman != null ? String(listedPriceToman) : '',
    listedChannel: listedChannel ?? '',
    status,
    saleChannel: saleChannel ?? '',
    soldPrice: soldPriceToman != null ? String(soldPriceToman) : '',
  });

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function buildPayload() {
    const payload: Record<string, unknown> = {};
    payload.location = form.location.trim() ? form.location.trim() : null;
    payload.notes = form.notes.trim() ? form.notes.trim() : null;
    payload.status = form.status;

    if (form.listedPrice) {
      const parsed = Number.parseInt(form.listedPrice, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        payload.listedPriceToman = parsed;
      }
    } else {
      payload.listedPriceToman = null;
    }

    payload.listedChannel = form.listedChannel ? form.listedChannel : null;
    payload.saleChannel = form.saleChannel ? form.saleChannel : null;

    if (form.status === ItemStatus.SOLD) {
      const soldPrice = Number.parseInt(form.soldPrice || '0', 10);
      if (!Number.isFinite(soldPrice) || soldPrice <= 0) {
        throw new Error('Sold price is required for sold items');
      }
      payload.soldPriceToman = soldPrice;
    } else {
      payload.soldPriceToman = null;
    }

    return payload;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const payload = buildPayload();
        const response = await fetch(`/api/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const message =
            typeof data?.message === 'string' ? data.message : 'Unable to save changes';
          throw new Error(message);
        }

        toast.success(t('save'));
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to save changes';
        toast.error(message);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('details')}</h2>
      <div className="mt-4 space-y-4 text-sm">
        <div>
          <label
            className="mb-1 block text-sm font-medium text-[var(--muted-strong)]"
            htmlFor="location"
          >
            {t('location')}
          </label>
          <input
            id="location"
            name="location"
            value={form.location}
            onChange={handleChange}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 shadow-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
        <div>
          <label
            className="mb-1 block text-sm font-medium text-[var(--muted-strong)]"
            htmlFor="notes"
          >
            {t('notes')}
          </label>
          <textarea
            id="notes"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={4}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 shadow-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="mb-1 block text-sm font-medium text-[var(--muted-strong)]"
              htmlFor="listedPrice"
            >
              {t('listedPrice')}
            </label>
            <input
              id="listedPrice"
              name="listedPrice"
              type="number"
              inputMode="numeric"
              min={0}
              value={form.listedPrice}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 shadow-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div>
            <label
              className="mb-1 block text-sm font-medium text-[var(--muted-strong)]"
              htmlFor="listedChannel"
            >
              {t('listedChannel')}
            </label>
            <Select
              value={form.listedChannel}
              onValueChange={(value) => updateForm('listedChannel', value)}
            >
              <SelectTrigger id="listedChannel">
                <SelectValue placeholder={t('listedChannel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {channelOptions.map((channel) => (
                  <SelectItem key={channel} value={channel}>
                    {channel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="mb-1 block text-sm font-medium text-[var(--muted-strong)]"
              htmlFor="status"
            >
              {t('status')}
            </label>
            <Select
              value={form.status}
              onValueChange={(value) => updateForm('status', value as ItemStatus)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder={t('status')} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label
              className="mb-1 block text-sm font-medium text-[var(--muted-strong)]"
              htmlFor="saleChannel"
            >
              {t('saleChannel')}
            </label>
            <Select
              value={form.saleChannel}
              onValueChange={(value) => updateForm('saleChannel', value)}
            >
              <SelectTrigger id="saleChannel">
                <SelectValue placeholder={t('saleChannel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {channelOptions.map((channel) => (
                  <SelectItem key={channel} value={channel}>
                    {channel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {form.status === ItemStatus.SOLD ? (
          <div>
            <label
              className="mb-1 block text-sm font-medium text-[var(--muted-strong)]"
              htmlFor="soldPrice"
            >
              {t('soldPrice')}
            </label>
            <input
              id="soldPrice"
              name="soldPrice"
              type="number"
              inputMode="numeric"
              min={0}
              value={form.soldPrice}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 shadow-sm focus:border-[var(--accent)] focus:outline-none"
              required
            />
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          className="rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-65"
          disabled={pending}
        >
          {pending ? 'Saving...' : t('save')}
        </button>
      </div>
    </form>
  );
}
