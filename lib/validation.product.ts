import { z } from "zod";

const nonEmptyString = z.string().trim().min(1, "Required");
const optionalNonEmptyString = nonEmptyString.optional().or(z.literal(null));
const imageUrlsSchema = z
  .array(z.string().trim().url({ message: "Image URL must be a valid URL" }))
  .optional();

export const createProductSchema = z.object({
  name: nonEmptyString,
  brand: optionalNonEmptyString,
  model: optionalNonEmptyString,
  categoryId: optionalNonEmptyString,
  specsJson: z.unknown().optional(),
  imageUrls: imageUrlsSchema,
});

export type CreateProductDTO = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: optionalNonEmptyString,
  brand: optionalNonEmptyString,
  model: optionalNonEmptyString,
  categoryId: optionalNonEmptyString,
  specsJson: z.unknown().optional(),
  imageUrls: imageUrlsSchema,
});

export type UpdateProductDTO = z.infer<typeof updateProductSchema>;
