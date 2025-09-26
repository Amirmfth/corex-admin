import { NextResponse } from 'next/server';

import { searchProducts } from '../../../../../lib/products';


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') ?? searchParams.get('search') ?? undefined;
  const takeParam = searchParams.get('take');
  const take = takeParam ? Number.parseInt(takeParam, 10) : 10;

  if (Number.isNaN(take) || take <= 0) {
    return NextResponse.json({ message: 'Invalid take parameter' }, { status: 400 });
  }

  const products = await searchProducts({ query: query?.trim() || undefined, take: Math.min(take, 25) });

  return NextResponse.json({ products });
}
