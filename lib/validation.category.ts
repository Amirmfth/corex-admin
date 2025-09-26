import { z } from "zod";

const nonEmptyString = z.string().trim().min(1, "Required");
const optionalParentId = nonEmptyString.nullable().optional();
const sortOrderSchema = z.number().int();

export const createCategorySchema = z.object({
  name: nonEmptyString,
  parentId: optionalParentId,
  sortOrder: sortOrderSchema.optional(),
});

export type CreateCategoryDTO = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: nonEmptyString.optional(),
  parentId: optionalParentId,
  sortOrder: sortOrderSchema.optional(),
});

export type UpdateCategoryDTO = z.infer<typeof updateCategorySchema>;

export const reorderCategorySchema = z.object({
  parentId: optionalParentId,
  orderedIds: z.array(nonEmptyString),
});

export type ReorderDTO = z.infer<typeof reorderCategorySchema>;