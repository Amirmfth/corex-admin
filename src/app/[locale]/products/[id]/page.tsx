import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { routing, type AppLocale } from "../../../../../i18n/routing";
import { getProductDetail } from "../../../../../lib/products";
import PageHeader from "../../../../components/PageHeader";
import ProductDetailTabs from "../../../../components/product/ProductDetailTabs";

type ProductDetailPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { locale, id } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const typedLocale = locale as AppLocale;

  const [t, detail] = await Promise.all([
    getTranslations({ locale: typedLocale, namespace: "products" }),
    getProductDetail(id),
  ]);

  if (!detail) {
    notFound();
  }

  const metaParts = [detail.product.brand, detail.product.model, detail.product.category?.name]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={detail.product.name}
        description={metaParts || t("detailSubtitle")}
      />

      <ProductDetailTabs
        product={detail.product}
        items={detail.items}
        soldItems={detail.soldItems}
        locale={typedLocale}
      />
    </section>
  );
}
