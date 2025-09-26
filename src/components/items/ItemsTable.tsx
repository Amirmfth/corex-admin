'use client';

import { ItemStatus } from '@prisma/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { ImageOff } from 'lucide-react';

import type { AppLocale } from '../../../i18n/routing';
import { totalCost } from '../../../lib/calc';
import type { ItemsListItem } from '../../../lib/items';
import StatusBadge from '../StatusBadge';
import Toman from '../Toman';

type ItemsTableProps = {
  items: ItemsListItem[];
  locale: AppLocale;
};

function formatRelativeDays(locale: AppLocale, date: Date) {
  const formatter = new Intl.RelativeTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    numeric: 'auto',
  });
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return formatter.format(-diffDays, 'day');
}

export default function ItemsTable({ items, locale }: ItemsTableProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const tTable = useTranslations('table');
  const tButtons = useTranslations('buttons');
  const tBulk = useTranslations('bulk');

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = selected.length > 0 && selected.length === items.length;

  function toggleSelection(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  }

  function toggleAll() {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(items.map((item) => item.id));
    }
  }

  async function patchItem(id: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const message = typeof data?.message === 'string' ? data.message : 'Request failed';
      throw new Error(message);
    }
  }

  function handleBulkStatus(status: ItemStatus) {
    if (selected.length === 0) {
      return;
    }

    startTransition(async () => {
      try {
        await Promise.all(selected.map((id) => patchItem(id, { status })));
        toast.success(status === ItemStatus.LISTED ? tBulk('listed') : tBulk('inStock'));
        setSelected([]);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Request failed';
        toast.error(message);
      }
    });
  }

  function handleListToggle(item: ItemsListItem) {
    const nextStatus = item.status === ItemStatus.LISTED ? ItemStatus.IN_STOCK : ItemStatus.LISTED;
    startTransition(async () => {
      try {
        await patchItem(item.id, {
          status: nextStatus,
          listedChannel: nextStatus === ItemStatus.LISTED ? (item.listedChannel ?? null) : null,
          listedPriceToman: nextStatus === ItemStatus.LISTED ? item.listedPriceToman : null,
        });
        toast.success(nextStatus === ItemStatus.LISTED ? tButtons('list') : tButtons('unlist'));
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Request failed';
        toast.error(message);
      }
    });
  }

  function handleMarkSold(item: ItemsListItem) {
    const salePrice = window.prompt('Sold price (Toman)', item.listedPriceToman?.toString() ?? '');
    if (!salePrice) {
      return;
    }
    const parsed = Number.parseInt(salePrice, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      toast.error('Invalid sale price');
      return;
    }

    startTransition(async () => {
      try {
        await patchItem(item.id, {
          status: ItemStatus.SOLD,
          soldPriceToman: parsed,
        });
        toast.success(tButtons('markSold'));
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Request failed';
        toast.error(message);
      }
    });
  }

  const bulkControls = selected.length > 0 && (
    <div className="flex flex-wrap items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-xs font-medium text-[var(--muted)]">
      <span>
        {tBulk('selected')} ({selected.length})
      </span>
      <button
        type="button"
        onClick={() => handleBulkStatus(ItemStatus.LISTED)}
        className="rounded-full border border-transparent bg-[var(--accent)] px-3 py-1 text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)]"
        disabled={pending}
      >
        {tBulk('listed')}
      </button>
      <button
        type="button"
        onClick={() => handleBulkStatus(ItemStatus.IN_STOCK)}
        className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
        disabled={pending}
      >
        {tBulk('inStock')}
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      {bulkControls}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <table className="min-w-full divide-y divide-[var(--border)] text-sm">
          <thead className="bg-[var(--surface-muted)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  className="size-4 rounded border-[var(--border)]"
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3">Photo</th>
              <th className="px-4 py-3">{tTable('product')}</th>
              <th className="px-4 py-3">{tTable('serial')}</th>
              <th className="px-4 py-3">{tTable('condition')}</th>
              <th className="px-4 py-3">{tTable('cost')}</th>
              <th className="px-4 py-3">{tTable('price')}</th>
              <th className="px-4 py-3">{tTable('status')}</th>
              <th className="px-4 py-3">{tTable('age')}</th>
              <th className="px-4 py-3">{tTable('location')}</th>
              <th className="px-4 py-3">{tTable('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {items.map((item) => {
              const isChecked = selectedSet.has(item.id);
              const primaryImage = item.imageUrls[0];
              const costValue = totalCost({
                purchaseToman: item.purchaseToman,
                feesToman: item.feesToman,
                refurbToman: item.refurbToman,
              });
              const productMeta = [item.product.brand, item.product.model]
                .filter(Boolean)
                .join(' · ');

              return (
                <tr key={item.id} className="hover:bg-[var(--surface-muted)]">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-[var(--border)]"
                      checked={isChecked}
                      onChange={() => toggleSelection(item.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]">
                      {primaryImage ? (
                        <img
                          src={primaryImage}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageOff className="size-5 text-[var(--muted)]" aria-hidden />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                    <div className="flex flex-col">
                      <span>{item.product.name}</span>
                      {productMeta ? (
                        <span className="text-xs text-[var(--muted)]">{productMeta}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-strong)]">{item.serial}</td>
                  <td className="px-4 py-3 text-[var(--muted-strong)]">{item.condition}</td>
                  <td className="px-4 py-3 text-[var(--muted-strong)]">
                    <Toman value={costValue} locale={locale === 'fa' ? 'fa-IR' : 'en-US'} />
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-strong)]">
                    {item.listedPriceToman ? (
                      <Toman
                        value={item.listedPriceToman}
                        locale={locale === 'fa' ? 'fa-IR' : 'en-US'}
                      />
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-strong)]">
                    {formatRelativeDays(locale, new Date(item.acquiredAt))}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-strong)]">{item.location ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/${locale}/items/${item.id}`}
                        className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                      >
                        {tButtons('edit')}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleListToggle(item)}
                        className="rounded-full border border-transparent bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)]"
                        disabled={pending}
                      >
                        {item.status === ItemStatus.LISTED ? tButtons('unlist') : tButtons('list')}
                      </button>
                      {item.status !== ItemStatus.SOLD ? (
                        <button
                          type="button"
                          onClick={() => handleMarkSold(item)}
                          className="rounded-full border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-400 hover:text-rose-700"
                          disabled={pending}
                        >
                          {tButtons('markSold')}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
