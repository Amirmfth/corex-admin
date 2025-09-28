import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "../../../../lib/prisma";
import { createProductSchema } from "../../../../lib/validation.product";

import { BadRequestError, handleApiError, parseJsonBody } from "./_utils";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new BadRequestError("Pagination parameters must be positive integers");
  }

  return parsed;
}

function buildProductFilters(searchParams: URLSearchParams) {
  const filters: Prisma.ProductWhereInput = {};
  const query = searchParams.get("q")?.trim();
  const categoryId = searchParams.get("categoryId")?.trim();
  const brand = searchParams.get("brand")?.trim();

  if (query) {
    filters.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { brand: { contains: query, mode: "insensitive" } },
      { model: { contains: query, mode: "insensitive" } },
    ];
  }

  if (categoryId) {
    filters.categoryId = categoryId;
  }

  if (brand) {
    filters.brand = { equals: brand, mode: "insensitive" };
  }

  return filters;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const requestedPageSize = parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);
    const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
    const skip = (page - 1) * pageSize;
    const where = buildProductFilters(searchParams);

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true, path: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody(request, createProductSchema);

    const product = await prisma.product.create({
      data: {
        name: payload.name,
        brand: payload.brand ?? null,
        model: payload.model ?? null,
        categoryId: payload.categoryId ?? null,
        specsJson:
          payload.specsJson === null
            ? Prisma.JsonNull
            : (payload.specsJson as Prisma.InputJsonValue | undefined),
        imageUrls: payload.imageUrls ?? [],
      },
      include: {
        category: { select: { id: true, name: true, slug: true, path: true } },
        _count: { select: { items: true } },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
