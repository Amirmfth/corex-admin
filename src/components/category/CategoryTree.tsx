"use client";

import { GripVertical, Loader2, Pencil, Plus, ArrowUpRight, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import ConfirmDialog from "../ConfirmDialog";

import CategoryForm from "./CategoryForm";
import MoveCategoryDialog from "./MoveCategoryDialog";
import type { CategoryTreeNode } from "./types";

interface CategoryTreeProps {
  categories: CategoryTreeNode[];
}

function collectDescendantIds(node: CategoryTreeNode): string[] {
  const ids: string[] = [];
  for (const child of node.children) {
    ids.push(child.id);
    ids.push(...collectDescendantIds(child));
  }
  return ids;
}

export default function CategoryTree({ categories }: CategoryTreeProps) {
  const router = useRouter();
  const t = useTranslations("categories");
  const tButtons = useTranslations("buttons");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const allCategories = useMemo(() => categories, [categories]);

  const handleDelete = useCallback(
    async (category: CategoryTreeNode) => {
      try {
        setDeletingId(category.id);
        const response = await fetch(`/api/categories/${category.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            message?: string;
          };
          toast.error(data.message ?? t("form.deleteError"));
          return;
        }

        toast.success(t("form.deleteSuccess"));
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error(t("form.deleteError"));
      } finally {
        setDeletingId(null);
      }
    },
    [router, t]
  );

  function renderNodes(nodes: CategoryTreeNode[], depth = 0) {
    if (nodes.length === 0) {
      return null;
    }

    return (
      <ul className={depth === 0 ? "space-y-4" : "space-y-4"}>
        {nodes.map((node) => {
          const descendantIds = collectDescendantIds(node);
          const hasChildren = node.children.length > 0;
          const hasProducts = (node.productCount ?? 0) > 0;
          const deleteDisabled = hasChildren || hasProducts;
          const deleteTooltip = hasChildren
            ? t("delete.disabledChildren")
            : hasProducts
              ? t("delete.disabledProducts", { count: node.productCount })
              : undefined;

          return (
            <li key={node.id} className={depth > 0 ? "ms-6" : undefined}>
              <div className="rounded-3xl border border-[var(--surface-hover)] bg-white shadow-sm">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="flex flex-1 items-start gap-3">
                    <GripVertical className="mt-1 size-4 text-[var(--muted)]" aria-hidden />
                    <div className="min-w-0 space-y-2">
                      <div className="break-words text-base font-semibold text-[var(--foreground)]">
                        {node.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                        <span className="font-medium text-[var(--muted-strong)]">
                          {t("pathLabel")}:
                        </span>
                        <code className="rounded bg-[var(--surface-hover)] px-2 py-1 font-mono text-[var(--muted-strong)]">
                          {node.path}
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <CategoryForm
                      mode="create"
                      categories={allCategories}
                      parentId={node.id}
                      trigger={
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)] sm:text-sm"
                        >
                          <Plus className="size-4" aria-hidden />
                          <span>{t("actions.addChild")}</span>
                        </button>
                      }
                    />

                    <CategoryForm
                      mode="rename"
                      categories={allCategories}
                      categoryId={node.id}
                      initialName={node.name}
                      trigger={
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)] sm:text-sm"
                        >
                          <Pencil className="size-4" aria-hidden />
                          <span>{t("actions.rename")}</span>
                        </button>
                      }
                    />

                    <MoveCategoryDialog
                      trigger={
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)] sm:text-sm"
                        >
                          <ArrowUpRight className="size-4" aria-hidden />
                          <span>{t("actions.move")}</span>
                        </button>
                      }
                      categories={allCategories}
                      category={node}
                      excludeIds={descendantIds}
                    />

                    <ConfirmDialog
                      trigger={
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-2 text-xs font-medium text-red-600 transition hover:border-red-500 hover:text-red-600 sm:text-sm"
                          disabled={deleteDisabled || deletingId === node.id}
                          title={deleteTooltip}
                        >
                          {deletingId === node.id ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                          ) : (
                            <Trash2 className="size-4" aria-hidden />
                          )}
                          <span>{t("actions.delete")}</span>
                        </button>
                      }
                      title={t("delete.title")}
                      description={t("delete.description")}
                      confirmLabel={t("delete.confirm")}
                      cancelLabel={tButtons("cancel")}
                      onConfirm={() => handleDelete(node)}
                    />
                  </div>
                </div>

                {node.children.length > 0 ? (
                  <div className="border-t border-[var(--surface-hover)] bg-[var(--surface)]/30 p-4">
                    {renderNodes(node.children, depth + 1)}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--surface-hover)] bg-white p-8 text-center text-sm text-[var(--muted)]">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {renderNodes(categories)}
    </div>
  );
}
