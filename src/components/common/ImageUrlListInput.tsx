"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

type ImageUrlListInputProps = {
  id: string;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  helperText?: string;
  addLabel: string;
  removeLabel: string;
  error?: string | null;
};

export default function ImageUrlListInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  helperText,
  addLabel,
  removeLabel,
  error,
}: ImageUrlListInputProps) {
  const rows = useMemo(() => (value.length > 0 ? value : [""]), [value]);

  function handleChange(index: number, nextValue: string) {
    const next = [...rows];
    next[index] = nextValue;
    onChange(next);
  }

  function handleAddRow() {
    onChange([...rows, ""]);
  }

  function handleRemoveRow(index: number) {
    const next = rows.filter((_, currentIndex) => currentIndex !== index);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>

      <div className="flex flex-col gap-2">
        {rows.map((entry, index) => (
          <div key={`${id}-${index}`} className="flex items-center gap-2">
            <input
              id={index === 0 ? id : `${id}-${index}`}
              type="url"
              value={entry}
              onChange={(event) => handleChange(index, event.target.value)}
              placeholder={placeholder}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
            />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveRow(index)}
                className="inline-flex items-center justify-center rounded-full border border-[var(--border)] p-2 text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                aria-label={removeLabel}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        {helperText ? <p>{helperText}</p> : null}
        {error ? <p className="text-[var(--destructive)]">{error}</p> : null}
      </div>

      <button
        type="button"
        onClick={handleAddRow}
        className="inline-flex w-max items-center gap-2 rounded-full border border-dashed border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <Plus className="size-3.5" aria-hidden />
        <span>{addLabel}</span>
      </button>
    </div>
  );
}
