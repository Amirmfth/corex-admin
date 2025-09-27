'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import type { AppLocale } from '../../../i18n/routing';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const DEFAULT_LINE = {
  quantity: '1',
  unitToman: '',
  feesToman: '',
};

type ProductOption = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
};

type LineState = {
  id: string;
  productId: string;
  quantity: string;
  unitToman: string;
  feesToman: string;
};

type PurchaseBuilderProps = {
  locale: AppLocale;
  products: ProductOption[];
};

function formatOptionLabel(product: ProductOption) {
  const parts = [product.name];
  if (product.brand) {
    parts.push(product.brand);
  }
  if (product.model) {
    parts.push(product.model);
  }
  return parts.join(' - ');
}

function createLine(products: ProductOption[]): LineState {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);
  return {
    id,
    productId: products[0]?.id ?? '',
    quantity: DEFAULT_LINE.quantity,
    unitToman: DEFAULT_LINE.unitToman,
    feesToman: DEFAULT_LINE.feesToman,
  };
}

export default function PurchaseBuilder({ locale, products }: PurchaseBuilderProps) {
  const router = useRouter();
  const t = useTranslations('purchases');
  const [pending, startTransition] = useTransition();

  const [supplierName, setSupplierName] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<LineState[]>(() => [createLine(products)]);

  const canSubmit = products.length > 0;

  const totalToman = useMemo(() => {
    return lines.reduce((sum, line) => {
      const quantity = Number.parseInt(line.quantity, 10);
      const unit = Number.parseInt(line.unitToman, 10);
      const fees = Number.parseInt(line.feesToman, 10);

      if (Number.isFinite(quantity) && quantity > 0 && Number.isFinite(unit) && unit >= 0) {
        const safeFees = Number.isFinite(fees) ? fees : 0;
        return sum + quantity * unit + safeFees;
      }

      return sum;
    }, 0);
  }, [lines]);

  function updateLine(index: number, patch: Partial<LineState>) {
    setLines((current) =>
      current.map((line, idx) => (idx === index ? { ...line, ...patch } : line)),
    );
  }

  function handleAddLine() {
    setLines((current) => [...current, createLine(products)]);
  }

  function handleRemoveLine(index: number) {
    setLines((current) =>
      current.length === 1 ? current : current.filter((_, idx) => idx !== index),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedSupplier = supplierName.trim();
    if (!trimmedSupplier) {
      toast.error(t('supplierRequired'));
      return;
    }

    if (!canSubmit) {
      toast.error(t('emptyProducts'));
      return;
    }

    const parsedLines = [] as {
      productId: string;
      quantity: number;
      unitToman: number;
      feesToman: number;
    }[];

    for (const line of lines) {
      const quantity = Number.parseInt(line.quantity, 10);
      const unit = Number.parseInt(line.unitToman, 10);
      const fees = Number.parseInt(line.feesToman, 10);

      if (!line.productId) {
        toast.error(t('productRequired'));
        return;
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        toast.error(t('quantityInvalid'));
        return;
      }

      if (!Number.isFinite(unit) || unit < 0) {
        toast.error(t('unitInvalid'));
        return;
      }

      if (!Number.isFinite(fees) || fees < 0) {
        toast.error(t('feesInvalid'));
        return;
      }

      parsedLines.push({
        productId: line.productId,
        quantity,
        unitToman: unit,
        feesToman: fees,
      });
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplierName: trimmedSupplier,
            reference: reference.trim() || undefined,
            lines: parsedLines,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const message = typeof data?.message === 'string' ? data.message : t('error');
          throw new Error(message);
        }

        const purchase = await response.json();
        toast.success(t('success'));
        router.push(`/${locale}/purchases/${purchase.id}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : t('error');
        toast.error(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('title')}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium text-[var(--muted-strong)]"
              htmlFor="supplierName"
            >
              {t('supplierLabel')}
            </label>
            <input
              id="supplierName"
              name="supplierName"
              value={supplierName}
              onChange={(event) => setSupplierName(event.target.value)}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
              disabled={pending}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--muted-strong)]" htmlFor="reference">
              {t('referenceLabel')}
            </label>
            <input
              id="reference"
              name="reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
              disabled={pending}
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">{t('linesTitle')}</h3>
          <button
            type="button"
            onClick={handleAddLine}
            className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--muted-strong)] transition hover:border-neutral-400 hover:text-[var(--foreground)] disabled:opacity-60"
            disabled={!canSubmit || pending}
          >
            {t('addLine')}
          </button>
        </div>

        {products.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-6 text-sm text-[var(--muted)]">
            {t('emptyProducts')}
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {lines.map((line, index) => (
              <div
                key={line.id}
                className="grid gap-4 rounded-2xl border border-[var(--border)] px-4 py-4 sm:grid-cols-[minmax(0,1fr)_120px_150px_150px_auto]"
              >
                <div className="flex flex-col gap-2">
                  <label
                    className="text-xs font-medium uppercase text-[var(--muted)]"
                    htmlFor={`product-${line.id}`}
                  >
                    {t('productLabel')}
                  </label>
                  <Select
                    value={line.productId}
                    onValueChange={(value) => updateLine(index, { productId: value })}
                    disabled={pending}
                  >
                    <SelectTrigger id={`product-${line.id}`}>
                      <SelectValue placeholder={t('productLabel')} />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {formatOptionLabel(product)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    className="text-xs font-medium uppercase text-[var(--muted)]"
                    htmlFor={`quantity-${line.id}`}
                  >
                    {t('quantityLabel')}
                  </label>
                  <input
                    id={`quantity-${line.id}`}
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(event) => updateLine(index, { quantity: event.target.value })}
                    className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
                    disabled={pending}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    className="text-xs font-medium uppercase text-[var(--muted)]"
                    htmlFor={`unit-${line.id}`}
                  >
                    {t('unitLabel')}
                  </label>
                  <input
                    id={`unit-${line.id}`}
                    type="number"
                    min={0}
                    value={line.unitToman}
                    onChange={(event) => updateLine(index, { unitToman: event.target.value })}
                    className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
                    disabled={pending}
                    required
                  />
                  <span className="text-xs text-[var(--muted)]">
                    {line.unitToman !== '' ? Number(line.unitToman).toLocaleString() : ''}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    className="text-xs font-medium uppercase text-[var(--muted)]"
                    htmlFor={`fees-${line.id}`}
                  >
                    {t('feesLabel')}
                  </label>
                  <input
                    id={`fees-${line.id}`}
                    type="number"
                    min={0}
                    value={line.feesToman}
                    onChange={(event) => updateLine(index, { feesToman: event.target.value })}
                    className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
                    disabled={pending}
                  />
                  <span className="text-xs text-[var(--muted)]">
                    {line.feesToman !== '' ? Number(line.feesToman).toLocaleString() : ''}
                  </span>
                </div>
                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(index)}
                    className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)] disabled:opacity-60"
                    disabled={lines.length === 1 || pending}
                  >
                    {t('removeLine')}
                  </button>
                </div>
              </div>
            ))}
            <p className="text-xs text-[var(--muted)]">{t('feesHint')}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center sm:justify-end">
        <dl className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <dt className="font-medium text-[var(--muted)]">{t('totalLabel')}</dt>
            <dd className="font-semibold text-[var(--foreground)]">
              {totalToman.toLocaleString()}
            </dd>
          </div>
        </dl>
        <button
          type="submit"
          className="rounded-full border border-transparent bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending || !canSubmit}
        >
          {pending ? t('submitting') : t('submit')}
        </button>
      </div>
    </form>
  );
}
