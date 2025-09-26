import { NextResponse } from "next/server";

import { buildCategoryPath } from "../../../../lib/category-path";
import { prisma } from "../../../../lib/prisma";
import { createCategorySchema } from "../../../../lib/validation.category";

import {
  buildSlugBase,
  ensureValidParent,
  generateUniqueCategorySlug,
  handleApiError,
  parseJsonBody,
} from "./_utils";

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  path: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  productCount: number;
  children: CategoryNode[];
}

function sortNodes(nodes: CategoryNode[]): CategoryNode[] {
  return nodes
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      return a.name.localeCompare(b.name);
    })
    .map((node) => ({
      ...node,
      children: sortNodes(node.children),
    }));
}

export async function GET() {
  try {
    const [categories, productCounts] = await Promise.all([
      prisma.category.findMany(),
      prisma.product.groupBy({
        by: ["categoryId"],
        _count: true,
      }),
    ]);

    const productsByCategory = new Map<string, number>();

    for (const entry of productCounts) {
      if (entry.categoryId) {
        productsByCategory.set(entry.categoryId, entry._count);
      }
    }

    const childrenByParent = new Map<string | null, CategoryNode[]>();

    for (const category of categories) {
      const node: CategoryNode = {
        ...category,
        productCount: productsByCategory.get(category.id) ?? 0,
        children: [],
      };

      const parentKey = category.parentId ?? null;
      const siblings = childrenByParent.get(parentKey) ?? [];
      siblings.push(node);
      childrenByParent.set(parentKey, siblings);
    }

    function buildTree(parentId: string | null): CategoryNode[] {
      const children = childrenByParent.get(parentId) ?? [];

      for (const child of children) {
        child.children = buildTree(child.id);
      }

      return sortNodes(children);
    }

    const tree = buildTree(null);

    return NextResponse.json(tree);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody(request, createCategorySchema);

    const createdCategory = await prisma.$transaction(async (tx) => {
      const parentId = payload.parentId ?? null;
      await ensureValidParent(tx, parentId);

      const slugBase = buildSlugBase(payload.name);
      const slug = await generateUniqueCategorySlug(slugBase, tx);

      let sortOrder = payload.sortOrder;

      if (sortOrder == null) {
        const siblingCount = await tx.category.count({
          where: { parentId },
        });
        sortOrder = siblingCount;
      }

      const category = await tx.category.create({
        data: {
          name: payload.name,
          slug,
          parentId,
          sortOrder,
          path: "",
        },
      });

      const path = await buildCategoryPath(category.id, tx);

      return tx.category.update({
        where: { id: category.id },
        data: { path },
      });
    });

    return NextResponse.json(createdCategory, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
