const HYPHEN = "-";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/[\s-]+/g, HYPHEN)
    .replace(/^-+|-+$/g, "");
}