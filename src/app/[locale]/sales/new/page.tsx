import { notFound } from "next/navigation";

import { routing, type AppLocale } from "../../../../../i18n/routing";
import { getSellableItems } from "../../../../../lib/items";
import SaleBuilder from "../../../../components/sales/SaleBuilder";

export const dynamic = "force-dynamic";

type NewSalePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function NewSalePage({ params }: NewSalePageProps) {
  const { locale } = await params;
  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const typedLocale = locale as AppLocale;

  const sellableItems = await getSellableItems();
  const initialItems = sellableItems.map((item) => ({
    id: item.id,
    serial: item.serial,
    status: item.status,
    listedPriceToman: item.listedPriceToman,
    listedChannel: item.listedChannel,
    product: {
      id: item.product.id,
      name: item.product.name,
      brand: item.product.brand,
      model: item.product.model,
      image: item.product.imageUrls?.[0] ?? item.images?.[0] ?? null,
    },
  }));

  return (
    <section className="flex flex-col gap-6">
      <SaleBuilder locale={typedLocale} initialItems={initialItems} />
    </section>
  );
}




