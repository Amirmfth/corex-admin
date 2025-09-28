'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import type { AppLocale } from '../../../i18n/routing';
import ConfirmDialog from '../ConfirmDialog';

type DeleteProductButtonProps = {
  productId: string;
  locale: AppLocale;
  variant?: 'default' | 'ghost';
};

const variantClasses: Record<NonNullable<DeleteProductButtonProps['variant']>, string> = {
  default:
    'inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700',
  ghost:
    'inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700',
};

export default function DeleteProductButton({
  productId,
  locale,
  variant = 'default',
}: DeleteProductButtonProps) {
  const router = useRouter();
  const t = useTranslations('products.delete');

  async function handleDelete() {
    const response = await fetch(`/api/products/${productId}`, { method: 'DELETE' });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const message = typeof data?.message === 'string' ? data.message : t('error');
      toast.error(message);
      return;
    }

    toast.success(t('success'));
    router.push(`/${locale}/products`);
    router.refresh();
  }

  return (
    <ConfirmDialog
      title={t('title')}
      description={t('description')}
      confirmLabel={t('confirm')}
      cancelLabel={t('cancel')}
      onConfirm={handleDelete}
      trigger={
        <button type="button" className={variantClasses[variant]}>
          {t('trigger')}
        </button>
      }
    />
  );
}
