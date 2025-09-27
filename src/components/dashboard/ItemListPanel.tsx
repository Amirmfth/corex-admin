import type { ReactNode } from 'react';

import { Link } from '../../../i18n/routing';
import { formatToman } from '../../../lib/money';

type SupportedLocale = 'fa' | 'en';

export type ItemListEntry = {
  id: string;
  productName: string;
  serial: string;
  ageDays: number;
  costToman: number;
  listedPriceToman: number | null;
};

interface ItemListPanelProps {
  locale: SupportedLocale;
  title: string;
  description?: string;
  emptyLabel: string;
  items: ItemListEntry[];
  headers: {
    product: string;
    serial: string;
    age: string;
    cost: string;
    price: string;
  };
  formatAge: (days: number) => string;
  renderBadge?: (item: ItemListEntry) => ReactNode;
}

export default function ItemListPanel({
  locale,
  title,
  description,
  emptyLabel,
  items,
  headers,
  formatAge,
  renderBadge,
}: ItemListPanelProps) {
  const currencyLocale = locale === 'fa' ? 'fa-IR' : 'en-US';
  const isRTL = locale === 'fa';

  return (
    <section className="flex h-full flex-col gap-4 rounded-2xl border border-[var(--surface-hover)] bg-white/80 p-5 shadow-sm">
      <header className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">{title}</h3>
        {description ? <p className="text-sm text-[var(--muted)]">{description}</p> : null}
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className={`min-w-full text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
            <thead className="text-xs uppercase tracking-wide text-[var(--muted-strong)]/70">
              <tr>
                <th className="px-3 py-2 font-semibold">{headers.product}</th>
                <th className="px-3 py-2 font-semibold">{headers.serial}</th>
                <th className="px-3 py-2 font-semibold">{headers.age}</th>
                <th className="px-3 py-2 font-semibold">{headers.cost}</th>
                <th className="px-3 py-2 font-semibold">{headers.price}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-hover)] text-[var(--foreground)]">
              {items.map((item) => (
                <tr key={item.id} className="transition hover:bg-[var(--surface-hover)]/50">
                  <td className="px-3 py-3">
                    <Link
                      href={`/items/${item.id}`}
                      locale={locale}
                      className="font-medium text-[var(--accent)] hover:underline"
                    >
                      {item.productName}
                    </Link>
                    {renderBadge ? (
                      <div className="mt-1 text-xs text-[var(--muted-strong)]/70">
                        {renderBadge(item)}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-[var(--muted-strong)]">{item.serial}</td>
                  <td className="px-3 py-3 text-[var(--muted-strong)]">{formatAge(item.ageDays)}</td>
                  <td className="px-3 py-3 font-medium">
                    {formatToman(item.costToman, currencyLocale)}
                  </td>
                  <td className="px-3 py-3 text-[var(--muted-strong)]">
                    {item.listedPriceToman != null
                      ? formatToman(item.listedPriceToman, currencyLocale)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
