'use client';

import { Channel, ItemStatus } from '@prisma/client';
import { ImageOff, Loader2, Search, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import QuickAddItem from '../QuickAddItem';
import StatusBadge from '../StatusBadge';
import Toman from '../Toman';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type SellableItem = {
  id: string;
  serial: string;
  status: ItemStatus;
  listedPriceToman: number | null;
  listedChannel: Channel | null;
  product: {
    id: string;
    name: string;
    brand: string | null;
    model: string | null;
    image: string | null;
  };
};

type SaleBuilderProps = {
  locale: string;
  initialItems: SellableItem[];
};

type LineItem = {
  item: SellableItem;
  unitToman: string;
};

const channelOptions = Object.values(Channel);

function formatBrandModel(brand: string | null, model: string | null) {
  return [brand, model].filter(Boolean).join(' - ');
}

export default function SaleBuilder({ locale, initialItems }: SaleBuilderProps) {
  const router = useRouter();
  const t = useTranslations('saleNew');
  const [pending, startTransition] = useTransition();

  const [customerName, setCustomerName] = useState('');
  const [channel, setChannel] = useState<Channel>(Channel.DIRECT);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SellableItem[]>(initialItems);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  const selectedIds = useMemo(() => new Set(lineItems.map((line) => line.item.id)), [lineItems]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const trimmed = searchTerm.trim();
      if (!trimmed) {
        setResults(initialItems);
        return;
      }

      setIsLoadingResults(true);
      try {
        const response = await fetch(`/api/items/sellable?search=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load items');
        }

        const data = (await response.json()) as SellableItem[];
        setResults(data);
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === 'AbortError';
        if (!aborted) {
          toast.error(t('error'));
        }
      } finally {
        setIsLoadingResults(false);
      }
    }

    const timer = setTimeout(load, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [searchTerm, initialItems, t]);

  function addLine(item: SellableItem) {
    if (selectedIds.has(item.id)) {
      toast.error(t('alreadyAdded'));
      return;
    }

    setLineItems((prev) => [
      ...prev,
      {
        item,
        unitToman: item.listedPriceToman != null ? String(item.listedPriceToman) : '',
      },
    ]);
  }

  function updateLine(index: number, value: string) {
    setLineItems((prev) =>
      prev.map((line, idx) => (idx === index ? { ...line, unitToman: value } : line)),
    );
  }

  function removeLine(index: number) {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  const totalToman = lineItems.reduce((sum, line) => {
    const parsed = Number.parseInt(line.unitToman, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return sum + parsed;
    }

    return sum;
  }, 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!customerName.trim()) {
      toast.error(t('customerName'));
      return;
    }

    if (lineItems.length === 0) {
      toast.error(t('itemsEmpty'));
      return;
    }

    let lines: { itemId: string; unitToman: number }[];
    try {
      lines = lineItems.map((line) => {
        const price = Number.parseInt(line.unitToman, 10);
        if (!Number.isFinite(price) || price <= 0) {
          throw new Error(t('unitPrice'));
        }

        return {
          itemId: line.item.id,
          unitToman: price,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error');
      toast.error(message);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: customerName.trim(),
            channel,
            lines,
            totalToman,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const message = typeof data?.message === 'string' ? data.message : t('error');
          throw new Error(message);
        }

        toast.success(t('success'));
        router.push(`/${locale}/items`);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : t('error');
        toast.error(message);
      }
    });
  }

  const availableResults = results.filter((item) => !selectedIds.has(item.id));
  const isSearchActive = Boolean(searchTerm.trim());
  const emptyResultsMessage =
    initialItems.length === 0 && !isSearchActive ? t('emptyInventory') : t('noResults');

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-[var(--foreground)]">{t('title')}</h1>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium text-[var(--muted-strong)]"
                htmlFor="customerName"
              >
                {t('customerName')}
              </label>
              <input
                id="customerName"
                name="customerName"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--muted-strong)]" htmlFor="channel">
                {t('channel')}
              </label>
              <Select value={channel} onValueChange={(value) => setChannel(value as Channel)}>
                <SelectTrigger id="channel">
                  <SelectValue placeholder={t('channel')} />
                </SelectTrigger>
                <SelectContent>
                  {channelOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium text-[var(--muted-strong)]"
                htmlFor="itemSearch"
              >
                {t('addLine')}
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
                  aria-hidden
                />
                <input
                  id="itemSearch"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-11 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              {isLoadingResults ? (
                <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  <span>Loading...</span>
                </div>
              ) : availableResults.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-6 py-8 text-center">
                  <p className="text-sm text-[var(--muted)]">{emptyResultsMessage}</p>
                  <QuickAddItem />
                </div>
              ) : (
                <ul className="grid gap-3">
                  {availableResults.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]">
                          {item.product.image ? (
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageOff className="size-5 text-[var(--muted)]" aria-hidden />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-[var(--foreground)]">
                            {item.product.name}
                          </span>
                          <span className="text-xs text-[var(--muted)]">
                            {formatBrandModel(item.product.brand, item.product.model)}
                          </span>
                          <span className="text-xs text-[var(--muted)]">{item.serial}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={item.status} />
                        <button
                          type="button"
                          onClick={() => addLine(item)}
                          className="rounded-full border border-transparent bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)]"
                        >
                          {t('addLine')}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Lines</h2>
          {lineItems.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">{t('itemsEmpty')}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {lineItems.map((line, index) => (
                <li
                  key={line.item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-[var(--foreground)]">
                        {line.item.product.name}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {formatBrandModel(line.item.product.brand, line.item.product.model)}
                      </p>
                      <p className="text-xs text-[var(--muted)]">{line.item.serial}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                    >
                      {t('remove')}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <label
                      className="text-xs font-medium uppercase text-[var(--muted)]"
                      htmlFor={`unit-${line.item.id}`}
                    >
                      {t('unitPrice')}
                    </label>
                    <div className="flex flex-col space-y-1">
                      <input
                        id={`unit-${line.item.id}`}
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={line.unitToman}
                        onChange={(event) => updateLine(index, event.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none sm:max-w-xs"
                        required
                      />
                      <span className="text-xs text-[var(--muted)]">
                        {line.unitToman !== '' ? Number(line.unitToman).toLocaleString() : ''}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full border border-transparent bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-65"
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ShoppingCart className="size-4" aria-hidden />
            )}
            <span>{t('submit')}</span>
          </button>
        </div>
      </form>

      <aside className="space-y-6">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('total')}</h2>
          <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
            <Toman value={totalToman} locale={locale === 'fa' ? 'fa-IR' : 'en-US'} />
          </p>
        </div>
      </aside>
    </div>
  );
}
