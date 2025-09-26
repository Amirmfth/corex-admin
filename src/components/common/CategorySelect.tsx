"use client";

import { Loader2, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type CategoryNode = {
  id: string;
  name: string;
  children?: CategoryNode[];
};

type CategoryOption = {
  id: string;
  name: string;
  depth: number;
};

type CategorySelectProps = {
  id: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  noneLabel: string;
  helperText?: string;
  error?: string | null;
  loadingLabel: string;
  retryLabel: string;
};

function flattenCategories(nodes: CategoryNode[], depth = 0): CategoryOption[] {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, depth },
    ...(node.children ? flattenCategories(node.children, depth + 1) : []),
  ]);
}

export default function CategorySelect({
  id,
  label,
  value,
  onChange,
  placeholder,
  noneLabel,
  helperText,
  error,
  loadingLabel,
  retryLabel,
}: CategorySelectProps) {
  const [options, setOptions] = useState<CategoryOption[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const loadCategories = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetch("/api/categories", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load categories");
      }
      const data = (await response.json()) as CategoryNode[];
      setOptions(flattenCategories(data));
      setStatus("ready");
    } catch (error_) {
      console.error(error_);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const isLoading = status === "loading";
  const isError = status === "error";

  const resolvedPlaceholder = useMemo(() => {
    if (placeholder) {
      return placeholder;
    }

    return noneLabel;
  }, [placeholder, noneLabel]);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>

      <select
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value ? event.target.value : null)}
        disabled={isLoading}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none disabled:cursor-not-allowed"
      >
        <option value="">{resolvedPlaceholder}</option>
        {options.map((option) => {
          const indent = option.depth > 0 ? `${"\u00A0".repeat(option.depth * 2)}› ` : "";
          return (
            <option key={option.id} value={option.id}>
              {indent}
              {option.name}
            </option>
          );
        })}
      </select>

      <div className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        {helperText ? <p>{helperText}</p> : null}
        {isLoading ? (
          <p className="inline-flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" aria-hidden />
            <span>{loadingLabel}</span>
          </p>
        ) : null}
        {isError ? (
          <button
            type="button"
            onClick={loadCategories}
            className="inline-flex w-max items-center gap-1 rounded-full border border-dashed border-[var(--border)] px-2 py-1 text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <RefreshCcw className="size-3" aria-hidden />
            <span>{retryLabel}</span>
          </button>
        ) : null}
        {error ? <p className="text-[var(--destructive)]">{error}</p> : null}
      </div>
    </div>
  );
}
