import { NextResponse } from "next/server";

import { rebuildCategorySubtreePaths } from "../../../../../../lib/category-path";
import { prisma } from "../../../../../../lib/prisma";
import { handleApiError, NotFoundError } from "../../_utils";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(_request: Request, { params }: RouteParams) {
  const categoryId = params.id;

  try {
    const exists = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundError("Category not found");
    }

    await prisma.$transaction(async (tx) => {
      await rebuildCategorySubtreePaths(categoryId, tx);
    });

    const category = await prisma.category.findUnique({ where: { id: categoryId } });

    return NextResponse.json({
      message: "Category paths rebuilt",
      category,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
