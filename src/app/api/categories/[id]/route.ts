import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import { resolveRequestLocale } from "../../../../../lib/api-locale";
import { rebuildCategorySubtreePaths } from "../../../../../lib/category-path";
import { prisma } from "../../../../../lib/prisma";
import { updateCategorySchema } from "../../../../../lib/validation.category";
import {
  BadRequestError,
  NotFoundError,
  buildSlugBase,
  ensureValidParent,
  generateUniqueCategorySlug,
  handleApiError,
  parseJsonBody,
} from "../_utils";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const categoryId = params.id;

  try {
    const payload = await parseJsonBody(request, updateCategorySchema);

    const updatedCategory = await prisma.$transaction(async (tx) => {
      const existing = await tx.category.findUnique({ where: { id: categoryId } });

      if (!existing) {
        throw new NotFoundError("Category not found");
      }

      const data: Prisma.CategoryUpdateInput = {};
      let shouldRebuildPaths = false;

      if (payload.name && payload.name !== existing.name) {
        const slugBase = buildSlugBase(payload.name);
        const slug = await generateUniqueCategorySlug(slugBase, tx, categoryId);

        data.name = payload.name;
        data.slug = slug;
        shouldRebuildPaths = true;
      }

      if (payload.sortOrder !== undefined) {
        data.sortOrder = payload.sortOrder;
      }

      if (payload.parentId !== undefined) {
        const parentId = payload.parentId ?? null;

        if (parentId !== existing.parentId) {
          await ensureValidParent(tx, parentId, categoryId);
          data.parentId = parentId;
          shouldRebuildPaths = true;
        }
      }

      if (Object.keys(data).length === 0) {
        return existing;
      }

      const updated = await tx.category.update({
        where: { id: categoryId },
        data,
      });

      if (shouldRebuildPaths) {
        await rebuildCategorySubtreePaths(categoryId, tx);

        const refreshed = await tx.category.findUnique({ where: { id: categoryId } });

        if (!refreshed) {
          throw new NotFoundError("Category not found");
        }

        return refreshed;
      }

      return updated;
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const categoryId = params.id;

  try {
    const locale = resolveRequestLocale(request);
    const t = await getTranslations({ locale, namespace: "categories" });
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.category.findUnique({ where: { id: categoryId } });

      if (!existing) {
        throw new NotFoundError("Category not found");
      }

      const [childCount, productCount] = await Promise.all([
        tx.category.count({ where: { parentId: categoryId } }),
        tx.product.count({ where: { categoryId } }),
      ]);

      if (childCount > 0) {
        throw new BadRequestError(t("delete.disabledChildren"));
      }

      if (productCount > 0) {
        throw new BadRequestError(t("delete.disabledProducts", { count: productCount }));
      }

      await tx.category.delete({ where: { id: categoryId } });

      return { message: "Category deleted" };
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
