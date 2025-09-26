import { NextResponse } from 'next/server';

import { searchProducts } from "../../../../../lib/products";

const MAX_RESULTS = 10;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json({ products: [] });
  }

  const products = await searchProducts({ query, take: MAX_RESULTS });

  return NextResponse.json({ products });
}
