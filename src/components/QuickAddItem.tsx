'use client';
import type { ItemCondition, ItemStatus } from '@prisma/client';
import * as Dialog from '@radix-ui/react-dialog';
import { ImageOff, Loader2, Search, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Drawer } from 'vaul';

import CategorySelect from './common/CategorySelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
// import "vaul/dist/index.css";
type ProductOption = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  image: string | null;
};
const STATUS_OPTIONS: ItemStatus[] = ['IN_STOCK', 'LISTED', 'REPAIR', 'RESERVED', 'SOLD'];
const CONDITION_OPTIONS: ItemCondition[] = ['NEW', 'USED', 'FOR_PARTS'];
type FormState = {
  productId: string;
  purchaseToman: string;
  feesToman: string;
  condition: ItemCondition;
  status: ItemStatus;
};
const INITIAL_FORM: FormState = {
  productId: '',
  purchaseToman: '',
  feesToman: '',
  condition: 'NEW',
  status: 'IN_STOCK',
};
const TEXT_FIELD_KEYS = ['purchaseToman', 'feesToman'] as const;
type TextFieldKey = (typeof TEXT_FIELD_KEYS)[number];
function isTextFieldKey(value: string): value is TextFieldKey {
  return TEXT_FIELD_KEYS.includes(value as TextFieldKey);
}
type NewProductFormState = {
  name: string;
  brand: string;
  model: string;
  categoryId: string | null;
};
const NEW_PRODUCT_INITIAL: NewProductFormState = {
  name: '',
  brand: '',
  model: '',
  categoryId: null,
};
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return isMobile;
}
export default function QuickAddItem() {
  const router = useRouter();
  const t = useTranslations('quickAdd');
  const tStatuses = useTranslations('statuses');
  const tConditions = useTranslations('conditions');
  const tCreateProduct = useTranslations('quickAdd.createProduct');
  const tProductForm = useTranslations('products.form');
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productInput, setProductInput] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isProductSheetOpen, setIsProductSheetOpen] = useState(false);
  const [newProductForm, setNewProductForm] = useState<NewProductFormState>(NEW_PRODUCT_INITIAL);
  const [newProductError, setNewProductError] = useState<string | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const menuCloseTimeoutRef = useRef<number | null>(null);
  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function handleFieldChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    if (!isTextFieldKey(name)) {
      return;
    }
    updateForm(name, value);
  }
  useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM);
      setIsSubmitting(false);
      setProductInput('');
      setProductQuery('');
      setProductOptions([]);
      setSelectedProduct(null);
      setIsProductMenuOpen(true);
      clearMenuCloseTimeout();
      setIsProductSheetOpen(false);
    }
  }, [open]);

  function clearMenuCloseTimeout() {
    if (menuCloseTimeoutRef.current !== null) {
      window.clearTimeout(menuCloseTimeoutRef.current);
      menuCloseTimeoutRef.current = null;
    }
  }
  useEffect(() => () => clearMenuCloseTimeout(), []);
  function formatProductLabel(option: ProductOption) {
    return [option.name, option.brand, option.model].filter(Boolean).join(' • ');
  }
  function formatProductMeta(option: ProductOption) {
    return [option.brand, option.model].filter(Boolean).join(' • ');
  }
  function clearSelectedProduct() {
    updateForm('productId', '');
    setSelectedProduct(null);
    setProductInput('');
    setProductQuery('');
    setProductOptions([]);
    clearMenuCloseTimeout();
    setIsProductMenuOpen(false);
  }
  function handleProductInputChange(value: string) {
    setProductInput(value);
    setProductQuery(value);
    updateForm('productId', '');
    setSelectedProduct(null);
    clearMenuCloseTimeout();
    setIsProductMenuOpen(true);
  }
  function handleProductSelect(option: ProductOption) {
    updateForm('productId', option.id);
    setProductInput(formatProductLabel(option));
    setSelectedProduct(option);
    setProductQuery('');
    setProductOptions([]);
    clearMenuCloseTimeout();
    setIsProductMenuOpen(false);
  }
  useEffect(() => {
    if (!isProductSheetOpen) {
      setNewProductForm(NEW_PRODUCT_INITIAL);
      setNewProductError(null);
      setIsCreatingProduct(false);
    }
  }, [isProductSheetOpen]);
  function updateNewProductForm<K extends keyof NewProductFormState>(
    key: K,
    value: NewProductFormState[K],
  ) {
    setNewProductForm((prev) => ({ ...prev, [key]: value }));
  }
  async function handleCreateProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = newProductForm.name.trim();
    if (!trimmedName) {
      setNewProductError(tProductForm('nameRequired'));
      return;
    }
    setNewProductError(null);
    setIsCreatingProduct(true);
    const payload = {
      name: trimmedName,
      brand: newProductForm.brand.trim() ? newProductForm.brand.trim() : null,
      model: newProductForm.model.trim() ? newProductForm.model.trim() : null,
      categoryId: newProductForm.categoryId ?? null,
    };
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        const message = data?.message ?? tProductForm('submitError');
        setNewProductError(message);
        toast.error(message);
        return;
      }
      const product = (await response.json()) as {
        id: string;
        name: string;
        brand: string | null;
        model: string | null;
        imageUrls?: string[];
      };
      const option: ProductOption = {
        id: product.id,
        name: product.name,
        brand: product.brand,
        model: product.model,
        image: product.imageUrls?.[0] ?? null,
      };
      handleProductSelect(option);
      toast.success(tProductForm('createSuccess'));
      setIsProductSheetOpen(false);
    } catch (error) {
      console.error(error);
      const message = tProductForm('submitError');
      setNewProductError(message);
      toast.error(message);
    } finally {
      setIsCreatingProduct(false);
    }
  }
  useEffect(() => {
    if (!open || !isProductMenuOpen) {
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
        if (term) {
          params.set('query', term);
        }
        const response = await fetch(`/api/products/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Failed to load products');
        }
        const data = (await response.json()) as { products?: ProductOption[] };
        if (!cancelled) {
          setProductOptions(data.products ?? []);
        }
      } catch (error) {
        if (!controller.signal.aborted && !cancelled) {
          console.error(error);
          setProductOptions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProducts(false);
        }
      }
    }, 180);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, isProductMenuOpen, productQuery]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const payload = {
      productId: form.productId.trim(),
      condition: form.condition,
      status: form.status,
      purchaseToman: Number.parseInt(form.purchaseToman, 10),
      feesToman: form.feesToman ? Number.parseInt(form.feesToman, 10) : 0,
      refurbToman: 0,
    };
    if (!payload.productId) {
      toast.error(t('productRequired'));
      setIsSubmitting(false);
      return;
    }
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = typeof data?.message === 'string' ? data.message : t('error');
        throw new Error(message);
      }
      toast.success(t('success'));
      router.refresh();
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }
  const triggerButton = (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
    >
      <Sparkles className="size-4" aria-hidden />
      <span>{t('open')}</span>
    </button>
  );
  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <div className="mb-1 flex items-center justify-between gap-3">
          <label
            className="block text-sm font-medium text-[var(--muted-strong)]"
            htmlFor="product-search"
          >
            {t('productId')}
          </label>
          {/* Add product */}
          <Drawer.Root open={isProductSheetOpen} onOpenChange={setIsProductSheetOpen}>
            <Drawer.Trigger asChild>
              <button
                type="button"
                className="text-xs font-semibold text-[var(--accent)] transition hover:text-[var(--accent-hover)]"
              >
                + {tCreateProduct('trigger')}
              </button>
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
              <Drawer.Content className="fixed inset-x-0 bottom-0 z-[60] max-h-[95vh] overflow-y-auto rounded-t-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
                <div className="mx-auto h-1.5 w-12 rounded-full bg-neutral-300 sm:hidden" />
                <div className="space-y-6 mb-16">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">
                      {tCreateProduct('title')}
                    </h2>
                    <p className="text-sm text-[var(--muted)]">{tCreateProduct('subtitle')}</p>
                  </div>
                  <form onSubmit={handleCreateProduct} className="space-y-4">
                    {newProductError ? (
                      <div className="rounded-xl border border-[var(--destructive)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--destructive)]">
                        {newProductError}
                      </div>
                    ) : null}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2 sm:col-span-2">
                        <label
                          htmlFor="new-product-name"
                          className="text-sm font-medium text-[var(--foreground)]"
                        >
                          {tProductForm('nameLabel')}
                        </label>
                        <input
                          id="new-product-name"
                          value={newProductForm.name}
                          onChange={(event) => updateNewProductForm('name', event.target.value)}
                          placeholder={tProductForm('namePlaceholder')}
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="new-product-brand"
                          className="text-sm font-medium text-[var(--foreground)]"
                        >
                          {tProductForm('brandLabel')}
                        </label>
                        <input
                          id="new-product-brand"
                          value={newProductForm.brand}
                          onChange={(event) => updateNewProductForm('brand', event.target.value)}
                          placeholder={tProductForm('brandPlaceholder')}
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="new-product-model"
                          className="text-sm font-medium text-[var(--foreground)]"
                        >
                          {tProductForm('modelLabel')}
                        </label>
                        <input
                          id="new-product-model"
                          value={newProductForm.model}
                          onChange={(event) => updateNewProductForm('model', event.target.value)}
                          placeholder={tProductForm('modelPlaceholder')}
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
                        />
                      </div>
                    </div>
                    <CategorySelect
                      id="new-product-category"
                      label={tProductForm('categoryLabel')}
                      value={newProductForm.categoryId}
                      onChange={(value) => updateNewProductForm('categoryId', value)}
                      placeholder={tProductForm('categoryPlaceholder')}
                      noneLabel={tProductForm('categoryNone')}
                      helperText={tProductForm('categoryHelper')}
                      error={null}
                      loadingLabel={tProductForm('categoryLoading')}
                      retryLabel={tProductForm('categoryRetry')}
                    />
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsProductSheetOpen(false)}
                        className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                        disabled={isCreatingProduct}
                      >
                        {t('cancel')}
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-65"
                        disabled={isCreatingProduct}
                      >
                        {isCreatingProduct ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : null}
                        <span>
                          {isCreatingProduct
                            ? tProductForm('submitting')
                            : tProductForm('submitCreate')}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </div>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden
          />
          <input
            id="product-search"
            value={productInput}
            onChange={(event) => handleProductInputChange(event.target.value)}
            onFocus={() => {
              clearMenuCloseTimeout();
              setIsProductMenuOpen(true);
              if (!productQuery) {
                setProductQuery('');
              }
            }}
            onBlur={() => {
              clearMenuCloseTimeout();
              menuCloseTimeoutRef.current = window.setTimeout(
                () => setIsProductMenuOpen(false),
                120,
              );
            }}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-11 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
            autoComplete="off"
          />
          {isProductMenuOpen ? (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_60px_var(--shadow-color)]">
              {isLoadingProducts ? (
                <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-[var(--muted)]">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  <span>Loading...</span>
                </div>
              ) : productOptions.length === 0 ? (
                <p className="px-4 py-3 text-sm text-[var(--muted)]">{t('noProducts')}</p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {productOptions.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
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
        {selectedProduct ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm shadow-sm">
            <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-hover)]">
              {selectedProduct.image ? (
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageOff className="size-4 text-[var(--muted)]" aria-hidden />
              )}
            </div>
            <div className="flex flex-1 flex-col">
              <span className="font-medium text-[var(--foreground)]">
                {formatProductLabel(selectedProduct)}
              </span>
              {formatProductMeta(selectedProduct) ? (
                <span className="text-xs text-[var(--muted)]">
                  {formatProductMeta(selectedProduct)}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={clearSelectedProduct}
              className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
            >
              {t('clearSelection')}
            </button>
          </div>
        ) : null}
      </div>
      {/* <div>
        <label
          className="mb-1 block text-sm font-medium text-[var(--muted-strong)]"
          htmlFor="serial"
        >
          {t('serial')}
        </label>
        <input
          id="serial"
          name="serial"
          value={form.serial}
          onChange={handleFieldChange}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
          placeholder="SN-0001"
        />
      </div> */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            className="mb-1 block text-sm font-medium text-[var(--muted-strong)]"
            htmlFor="condition"
          >
            {t('condition')}
          </label>
          <Select
            value={form.condition}
            onValueChange={(value) => updateForm('condition', value as ItemCondition)}
          >
            <SelectTrigger id="condition">
              <SelectValue placeholder={t('condition')} />
            </SelectTrigger>
            <SelectContent>
              {CONDITION_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {tConditions(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {tStatuses(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            className="mb-1 block text-sm font-medium text-[var(--muted-strong)]"
            htmlFor="purchaseToman"
          >
            {t('purchaseToman')}
          </label>
          <input
            id="purchaseToman"
            name="purchaseToman"
            required
            min={0}
            type="number"
            inputMode="numeric"
            value={form.purchaseToman}
            onChange={handleFieldChange}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
          />
          <span className="text-xs text-[var(--muted)]">
            {form.purchaseToman !== '' ? Number(form.purchaseToman).toLocaleString() : ''}
          </span>
        </div>
        <div>
          <label
            className="mb-1 block text-sm font-medium text-[var(--muted-strong)]"
            htmlFor="feesToman"
          >
            {t('feesToman')}
          </label>
          <input
            id="feesToman"
            name="feesToman"
            min={0}
            type="number"
            inputMode="numeric"
            value={form.feesToman}
            onChange={handleFieldChange}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
          />
          <span className="text-xs text-[var(--muted)]">
            {form.feesToman !== '' ? Number(form.feesToman).toLocaleString() : ''}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
          disabled={isSubmitting}
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-65"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}
          <span>{isSubmitting ? t('loading') : t('submit')}</span>
        </button>
      </div>
    </form>
  );
  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Trigger asChild>{triggerButton}</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[95vh] overflow-y-auto rounded-t-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neutral-300" />
            <div className="space-y-4 pb-16">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('title')}</h2>
                <p className="text-sm text-[var(--muted)]">{t('subtitle')}</p>
              </div>
              {formContent}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{triggerButton}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-y-8 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-[var(--foreground)]">
            {t('title')}
          </Dialog.Title>
          <Dialog.Description className="mb-6 mt-2 text-sm text-[var(--muted)]">
            {t('subtitle')}
          </Dialog.Description>
          {formContent}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
