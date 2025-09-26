import { NextRequest, NextResponse } from "next/server";

import { getSellableItems } from "../../../../../lib/items";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const items = await getSellableItems(search ?? undefined);

  return NextResponse.json(
    items.map((item) => ({
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
      purchaseToman: item.purchaseToman,
      feesToman: item.feesToman,
      refurbToman: item.refurbToman,
    })),
  );
}


