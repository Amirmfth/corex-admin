import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { routing, type AppLocale } from '../../../../../i18n/routing';
import { getPurchaseProductOptions } from '../../../../../lib/purchases';
import PageHeader from '../../../../components/PageHeader';
import PurchaseBuilder from '../../../../components/purchases/PurchaseBuilder';

export const dynamic = 'force-dynamic';

type NewPurchasePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function NewPurchasePage({ params }: NewPurchasePageProps) {
  const { locale } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const typedLocale = locale as AppLocale;
  const [products, t] = await Promise.all([
    getPurchaseProductOptions(),
    getTranslations({ locale: typedLocale, namespace: 'purchases' }),
  ]);

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={t('pageTitle')} description={t('pageSubtitle')} />
      <PurchaseBuilder locale={typedLocale} products={products} />
    </section>
  );
}
