'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState, useTransition, useEffect } from 'react';
import { toast } from 'sonner';
import { ImageOff, Loader2, Search } from 'lucide-react';

import type { AppLocale } from '../../../i18n/routing';
// NOTE: removed the old Select import

const DEFAULT_LINE = {
  quantity: '1',
  unitToman: '0',
  feesToman: '0',
};

type ProductOption = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  image?: string | null; // optional image (for nicer menu like QuickAddItem)
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
  products: ProductOption[]; // still accepted, but no longer used for the dropdown
};

/** ------- helpers borrowed from your QuickAddItem patterns ------- **/
function formatProductLabel(option: ProductOption) {
  return [option.name, option.brand, option.model].filter(Boolean).join(' • ');
}
function formatProductMeta(option: ProductOption) {
  return [option.brand, option.model].filter(Boolean).join(' • ');
}
/** ----------------------------------------------------------------- **/

function createLine(): LineState {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);
  return {
    id,
    productId: '', // start empty so user searches & selects
    quantity: DEFAULT_LINE.quantity,
    unitToman: DEFAULT_LINE.unitToman,
    feesToman: DEFAULT_LINE.feesToman,
  };
}

/** A self-contained autocomplete for picking a product (mirrors QuickAddItem UX).  */
/** It manages its own input/menu state and reports only the selected productId up. */
function ProductAutocomplete(props: {
  id: string;
  value: string; // productId
  onChange: (productId: string) => void;
  disabled?: boolean;
  placeholder: string;
}) {
  const { id, value, onChange, disabled, placeholder } = props;

  const [productInput, setProductInput] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const menuCloseTimeoutRef = useRef<number | null>(null);

  function clearMenuCloseTimeout() {
    if (menuCloseTimeoutRef.current !== null) {
      window.clearTimeout(menuCloseTimeoutRef.current);
      menuCloseTimeoutRef.current = null;
    }
  }
  useEffect(() => () => clearMenuCloseTimeout(), []);

  function handleProductInputChange(val: string) {
    setProductInput(val);
    setProductQuery(val);
    // reset the selected value until user picks an option
    if (value) onChange('');
    clearMenuCloseTimeout();
    setIsProductMenuOpen(true);
  }

  function handleProductSelect(option: ProductOption) {
    onChange(option.id);
    setProductInput(formatProductLabel(option));
    setProductQuery('');
    setProductOptions([]);
    clearMenuCloseTimeout();
    setIsProductMenuOpen(false);
  }

  // fetch results with a small debounce — same idea as QuickAddItem (180ms)
  useEffect(() => {
    if (!isProductMenuOpen) {
      setIsLoadingProducts(false);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setIsLoadingProducts(true);
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        const term = productQuery.trim();
        if (term) params.set('query', term);
        const response = await fetch(`/api/products/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Failed to load products');
        const data = (await response.json()) as { products?: ProductOption[] };
        if (!cancelled) setProductOptions(data.products ?? []);
      } catch (error) {
        if (!controller.signal.aborted && !cancelled) {
          console.error(error);
          if (!cancelled) setProductOptions([]);
        }
      } finally {
        if (!cancelled) setIsLoadingProducts(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [isProductMenuOpen, productQuery]);

  // if parent gives a value externally (e.g., form reset), clear the input when emptied
  useEffect(() => {
    if (!value) {
      // do not wipe typed text unless the user cleared selection;
      // here we leave productInput as-is, which is nice UX for re-picking
    }
  }, [value]);

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
        aria-hidden
      />
      <input
        id={id}
        value={productInput}
        onChange={(e) => handleProductInputChange(e.target.value)}
        onFocus={() => {
          clearMenuCloseTimeout();
          setIsProductMenuOpen(true);
          if (!productQuery) setProductQuery('');
        }}
        onBlur={() => {
          clearMenuCloseTimeout();
          menuCloseTimeoutRef.current = window.setTimeout(() => setIsProductMenuOpen(false), 120);
        }}
        placeholder={placeholder}
        className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-11 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
        autoComplete="off"
        disabled={disabled}
      />
      {isProductMenuOpen ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_60px_var(--shadow-color)]">
          {isLoadingProducts ? (
            <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-[var(--muted)]">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              <span>Loading...</span>
            </div>
          ) : productOptions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[var(--muted)]">No products found</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {productOptions.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()} // keep focus so click doesn't close before select
                    onClick={() => handleProductSelect(option)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-[var(--surface-hover)]"
                  >
                    <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]">
                      {option.image ? (
                        <img
                          src={option.image}
                          alt={option.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageOff className="size-4 text-[var(--muted)]" aria-hidden />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col text-sm">
                      <span className="font-medium text-[var(--foreground)]">
                        {formatProductLabel(option)}
                      </span>
                      {formatProductMeta(option) ? (
                        <span className="text-xs text-[var(--muted)]">
                          {formatProductMeta(option)}
                        </span>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function PurchaseBuilder({ locale, products }: PurchaseBuilderProps) {
  const router = useRouter();
  const t = useTranslations('purchases');
  const [pending, startTransition] = useTransition();

  const [supplierName, setSupplierName] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<LineState[]>(() => [createLine()]);

  
  const canSubmit = true; 

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
    setLines((current) => [...current, createLine()]);
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

    const parsedLines: {
      productId: string;
      quantity: number;
      unitToman: number;
      feesToman: number;
    }[] = [];

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
            disabled={pending}
          >
            {t('addLine')}
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {lines.map((line, index) => (
            <div
              key={line.id}
              className="grid gap-4 rounded-2xl border border-[var(--border)] px-4 py-4 sm:grid-cols-[minmax(0,1fr)_120px_150px_150px_auto]"
            >
              {/* Product Autocomplete */}
              <div className="flex flex-col gap-2">
                <label
                  className="text-xs font-medium uppercase text-[var(--muted)]"
                  htmlFor={`product-${line.id}`}
                >
                  {t('productLabel')}
                </label>
                <ProductAutocomplete
                  id={`product-${line.id}`}
                  value={line.productId}
                  onChange={(productId) => updateLine(index, { productId })}
                  disabled={pending}
                  placeholder={t('productLabel')}
                />
                {/* optional helper: show the selected product id */}
                {line.productId ? (
                  <span className="text-[10px] text-[var(--muted)]">
                    Selected: {line.productId}
                  </span>
                ) : null}
              </div>

              {/* Quantity */}
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

              {/* Unit */}
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

              {/* Fees */}
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

              {/* Remove */}
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
