'use client';

import { ImageOff } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { AppLocale } from '../../../i18n/routing';
import type { ProductListItem } from '../../../lib/products';

type ProductsTableProps = {
  products: ProductListItem[];
  locale: AppLocale;
};

export default function ProductsTable({ products, locale }: ProductsTableProps) {
  const tTable = useTranslations('table');
  const tProducts = useTranslations('products.table');
  const intlLocale = locale === 'fa' ? 'fa-IR' : 'en-US';
  const dateFormatter = new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium' });

  return (
    <div className="overflow-hidden overflow-x-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <table className="min-w-full divide-y divide-[var(--border)] text-sm text-right">
        <thead className="bg-[var(--surface-muted)] text-[var(--muted)]">
          <tr>
            <th className="px-4 py-3 font-medium">{tProducts('thumb')}</th>
            <th className="px-4 py-3 font-medium">{tTable('product')}</th>
            <th className="px-4 py-3 font-medium">{tProducts('category')}</th>
            <th className="px-4 py-3 font-medium">{tProducts('items')}</th>
            <th className="px-4 py-3 font-medium">{tProducts('createdAt')}</th>
            {/* <th className="px-4 py-3 text-right font-medium">{tTable("actions")}</th> */}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {products.map((product) => {
            const image = product.imageUrls[0];
            const meta = [product.brand, product.model].filter(Boolean).join(' · ');
            const categoryPath = product.category?.path ?? tProducts('noCategory');
            return (
              <tr key={product.id} className="hover:bg-[var(--surface-muted)]">
                <td className="px-4 py-3">
                  {image ? (
                    <img
                      src={image}
                      alt={product.name}
                      className="size-12 rounded-xl border border-[var(--border)] object-cover"
                    />
                  ) : (
                    <div className="flex size-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]">
                      <ImageOff className="size-5" aria-hidden />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <Link
                      href={`/${locale}/products/${product.id}`}
                      className="font-semibold text-[var(--foreground)]"
                    >
                      {product.name}
                    </Link>
                    {meta ? <span className="text-xs text-[var(--muted)]">{meta}</span> : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--foreground)]">{categoryPath}</td>
                <td className="px-4 py-3 text-[var(--foreground)]">
                  <span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--muted-strong)]">
                    {product.itemsCount.toLocaleString(intlLocale)}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--foreground)]">
                  {dateFormatter.format(new Date(product.createdAt))}
                </td>
                {/* <td className="px-4 py-3 text-right">
                  <Link
                    href={`/${locale}/products/${product.id}`}
                    className="inline-flex items-center gap-2 text-xs font-medium text-[var(--accent)] transition hover:text-[var(--accent-hover)]"
                  >
                    {tProducts("view")}
                  </Link>
                </td> */}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
