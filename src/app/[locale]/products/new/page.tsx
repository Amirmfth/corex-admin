import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { routing, type AppLocale } from "../../../../../i18n/routing";
import PageHeader from "../../../../components/PageHeader";
import ProductForm from "../../../../components/product/ProductForm";

export default async function ProductNewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const typedLocale = locale as AppLocale;
  const t = await getTranslations({ locale: typedLocale, namespace: "products" });

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={t("newTitle")} description={t("newSubtitle")} />
      <ProductForm mode="create" redirectTo={`/${typedLocale}/products`} />
    </section>
  );
}
