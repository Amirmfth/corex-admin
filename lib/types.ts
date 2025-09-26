import type { TypeOf } from "zod";

import { createItemSchema, updateItemSchema, createSaleSchema } from "./validation";

export type CreateItemDTO = TypeOf<typeof createItemSchema>;
export type UpdateItemDTO = TypeOf<typeof updateItemSchema>;
export type CreateSaleDTO = TypeOf<typeof createSaleSchema>;
