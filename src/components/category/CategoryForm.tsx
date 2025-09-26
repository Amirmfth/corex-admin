"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Drawer } from "vaul";

import type { CategoryTreeNode } from "./types";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isMobile;
}

type ParentOption = {
  id: string;
  label: string;
  depth: number;
};

function buildParentOptions(
  nodes: CategoryTreeNode[],
  exclude: ReadonlySet<string>,
  depth = 0
): ParentOption[] {
  const options: ParentOption[] = [];

  for (const node of nodes) {
    if (exclude.has(node.id)) {
      continue;
    }

    const prefix = depth > 0 ? `${"\u00A0".repeat(depth * 2)}• ` : "";
    options.push({ id: node.id, label: `${prefix}${node.name}`, depth });

    if (node.children.length > 0) {
      options.push(...buildParentOptions(node.children, exclude, depth + 1));
    }
  }

  return options;
}

export type CategoryFormMode = "create" | "rename";

export interface CategoryFormProps {
  mode: CategoryFormMode;
  trigger: ReactNode;
  categories: CategoryTreeNode[];
  parentId?: string | null;
  categoryId?: string;
  initialName?: string;
  excludeIds?: string[];
  onCompleted?: () => void;
}

export default function CategoryForm({
  mode,
  trigger,
  categories,
  parentId = null,
  categoryId,
  initialName = "",
  excludeIds = [],
  onCompleted,
}: CategoryFormProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const t = useTranslations("categories");
  const tButtons = useTranslations("buttons");

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [parentValue, setParentValue] = useState(parentId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const excludedSet = useMemo(
    () => new Set<string>(excludeIds ?? []),
    [excludeIds]
  );

  const parentOptions = useMemo(
    () => buildParentOptions(categories, excludedSet),
    [categories, excludedSet]
  );

  useEffect(() => {
    if (!open) {
      setName(initialName);
      setParentValue(parentId ?? "");
      setError(null);
      setIsSubmitting(false);
    }
  }, [open, initialName, parentId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(t("form.nameRequired"));
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const body: Record<string, unknown> = { name: trimmedName };
    let url = "/api/categories";
    let method: "POST" | "PATCH" = "POST";

    if (mode === "create") {
      body.parentId = parentValue ? parentValue : null;
    } else {
      if (!categoryId) {
        console.error("Missing categoryId for rename");
        toast.error(t("form.renameError"));
        setIsSubmitting(false);
        return;
      }
      url = `/api/categories/${categoryId}`;
      method = "PATCH";
    }

    if (mode === "rename") {
      delete body.parentId;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        const fallbackMessage =
          mode === "create" ? t("form.createError") : t("form.renameError");
        toast.error(data.message ?? fallbackMessage);
        return;
      }

      if (mode === "create") {
        toast.success(t("form.createSuccess"));
      } else {
        toast.success(t("form.renameSuccess"));
      }

      setOpen(false);
      router.refresh();
      onCompleted?.();
    } catch (err) {
      console.error(err);
      const fallbackMessage =
        mode === "create" ? t("form.createError") : t("form.renameError");
      toast.error(fallbackMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  const title =
    mode === "create" ? t("form.createTitle") : t("form.renameTitle");

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--muted-strong)]">
          {t("form.nameLabel")}
        </label>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("form.namePlaceholder")}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
          dir="auto"
          disabled={isSubmitting}
        />
        {error ? (
          <p className="text-xs text-red-500" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {mode === "create" ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--muted-strong)]">
            {t("form.parentLabel")}
          </label>
          <select
            value={parentValue}
            onChange={(event) => setParentValue(event.target.value)}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
            disabled={isSubmitting}
          >
            <option value="">{t("form.rootOption")}</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
          disabled={isSubmitting}
        >
          {tButtons("cancel")}
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-65"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          <span>{tButtons("save")}</span>
        </button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[95vh] overflow-y-auto rounded-t-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neutral-300" />
            <div className="space-y-4 pb-12">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                {title}
              </h2>
              {formContent}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-y-16 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-[var(--foreground)]">
            {title}
          </Dialog.Title>
          <div className="mt-4">{formContent}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
