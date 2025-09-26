-- Add path column to Category and backfill existing rows
ALTER TABLE "public"."Category"
  ADD COLUMN "path" TEXT NOT NULL DEFAULT '';

UPDATE "public"."Category"
SET "path" = "slug";
