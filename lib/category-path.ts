import type { PrismaClient } from "@prisma/client";

export async function buildCategoryPath(
  nodeId: string,
  prisma: Pick<PrismaClient, "category">
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