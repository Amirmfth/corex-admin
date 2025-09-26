import { prisma } from './prisma';

type SearchProductsArgs = {
  query?: string;
  take?: number;
};

export async function searchProducts({ query, take = 10 }: SearchProductsArgs = {}) {
  const filters = query
    ? [
        { name: { contains: query, mode: 'insensitive' } },
        { brand: { contains: query, mode: 'insensitive' } },
        { model: { contains: query, mode: 'insensitive' } },
      ]
    : undefined;

  const products = await prisma.product.findMany({
    where: filters ? { OR: filters } : undefined,
    select: {
      id: true,
      name: true,
      brand: true,
      model: true,
      imageUrls: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take,
  });

  return products.map((product) => ({
    ...product,
    image: product.imageUrls[0] ?? null,
  }));
}
