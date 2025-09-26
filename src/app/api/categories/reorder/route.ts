import { NextResponse } from "next/server";

import { prisma } from "../../../../../lib/prisma";
import { reorderCategorySchema } from "../../../../../lib/validation.category";
import {
  BadRequestError,
  handleApiError,
  parseJsonBody,
} from "../_utils";

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody(request, reorderCategorySchema);
    const parentId = payload.parentId ?? null;

    await prisma.$transaction(async (tx) => {
      if (new Set(payload.orderedIds).size !== payload.orderedIds.length) {
        throw new BadRequestError("orderedIds must be unique");
      }

      if (payload.orderedIds.length === 0) {
        return;
      }

      const categories = await tx.category.findMany({
        where: { id: { in: payload.orderedIds } },
        select: { id: true, parentId: true },
      });

      if (categories.length !== payload.orderedIds.length) {
        throw new BadRequestError("One or more categories were not found");
      }

      for (const category of categories) {
        const expectedParent = category.parentId ?? null;
        if (expectedParent !== parentId) {
          throw new BadRequestError(
            "All categories must belong to the specified parent"
          );
        }
      }

      await Promise.all(
        payload.orderedIds.map((id, index) =>
          tx.category.update({
            where: { id },
            data: { sortOrder: index },
          })
        )
      );
    });

    return NextResponse.json({ message: "Reordered categories" });
  } catch (error) {
    return handleApiError(error);
  }
}
