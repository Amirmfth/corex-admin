import type { Prisma, PrismaClient } from "@prisma/client";

type CategoryDelegate =
  | Pick<PrismaClient, "category">
  | Pick<Prisma.TransactionClient, "category">;

export async function buildCategoryPath(
  nodeId: string,
  prisma: CategoryDelegate
): Promise<string> {
  const segments: string[] = [];
  let currentId: string | null = nodeId;

  while (currentId) {
    const category = await prisma.category.findUnique({
      where: { id: currentId },
      select: { slug: true, parentId: true },
    });

    if (!category) {
      throw new Error(`Category with id "${currentId}" not found`);
    }

    segments.push(category.slug);
    currentId = category.parentId;
  }

  return segments.reverse().join("/");
}

export async function rebuildCategorySubtreePaths(
  nodeId: string,
  prisma: CategoryDelegate
): Promise<void> {
  const queue: string[] = [nodeId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const path = await buildCategoryPath(currentId, prisma);

    await prisma.category.update({
      where: { id: currentId },
      data: { path },
    });

    const children = await prisma.category.findMany({
      where: { parentId: currentId },
      select: { id: true },
    });

    for (const child of children) {
      queue.push(child.id);
    }
  }
}