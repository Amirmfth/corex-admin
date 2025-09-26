import type { Prisma, PrismaClient } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";
import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

import { slugify } from "../../../../lib/slug";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string) {
    super(400, message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(404, message);
  }
}

export type CategoryClient =
  | Pick<PrismaClient, "category">
  | Pick<Prisma.TransactionClient, "category">;

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new BadRequestError("Invalid JSON body");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new BadRequestError("Request body must be a JSON object");
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    const message = parsed.error.errors.map((err) => err.message).join(", ");
    throw new BadRequestError(message);
  }

  return parsed.data;
}

export function buildSlugBase(name: string): string {
  const base = slugify(name);
  return base.length > 0 ? base : "category";
}

export async function generateUniqueCategorySlug(
  base: string,
  prisma: CategoryClient,
  excludeId?: string
): Promise<string> {
  const normalized = base.length > 0 ? base : "category";
  let candidate = normalized;
  let suffix = 2;

  while (true) {
    const existing = await prisma.category.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === excludeId) {
      return candidate;
    }

    candidate = `${normalized}-${suffix}`;
    suffix += 1;
  }
}

export async function ensureValidParent(
  prisma: CategoryClient,
  parentId: string | null,
  currentId?: string
): Promise<void> {
  if (!parentId) {
    return;
  }

  if (currentId && parentId === currentId) {
    throw new BadRequestError("Category cannot be its own parent");
  }

  let cursor: string | null = parentId;

  while (cursor) {
    const parent = await prisma.category.findUnique({
      where: { id: cursor },
      select: { id: true, parentId: true },
    });

    if (!parent) {
      throw new BadRequestError("Parent category not found");
    }

    if (currentId && parent.id === currentId) {
      throw new BadRequestError(
        "Cannot set category as a descendant of itself"
      );
    }

    cursor = parent.parentId ?? null;
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  if (error instanceof PrismaNamespace.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Category with this slug already exists" },
        { status: 400 }
      );
    }

    if (error.code === "P2025") {
      return NextResponse.json(
        { message: "Category not found" },
        { status: 404 }
      );
    }
  }

  console.error(error);
  return NextResponse.json(
    { message: "Internal server error" },
    { status: 500 }
  );
}
