"use client";

import { Check, Wand2 } from "lucide-react";
import { useState } from "react";

type JsonEditorProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  error?: string | null;
  validateLabel: string;
  formatLabel: string;
  validMessage: string;
  invalidMessage: string;
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

export default function JsonEditor({
  id,
  label,
  value,
  onChange,
  helperText,
  error,
  validateLabel,
  formatLabel,
  validMessage,
  invalidMessage,
}: JsonEditorProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  function handleValidate() {
    if (!value.trim()) {
      setFeedback({ type: "success", message: validMessage });
      return;
    }

    try {
      JSON.parse(value);
      setFeedback({ type: "success", message: validMessage });
    } catch (error_) {
      console.error(error_);
      setFeedback({ type: "error", message: invalidMessage });
    }
  }

  function handleFormat() {
    if (!value.trim()) {
      setFeedback(null);
      return;
    }

    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
      setFeedback({ type: "success", message: validMessage });
    } catch (error_) {
      console.error(error_);
      setFeedback({ type: "error", message: invalidMessage });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>

      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={6}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleValidate}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <Check className="size-3.5" aria-hidden />
          <span>{validateLabel}</span>
        </button>
        <button
          type="button"
          onClick={handleFormat}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <Wand2 className="size-3.5" aria-hidden />
          <span>{formatLabel}</span>
        </button>
      </div>

      <div className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        {helperText ? <p>{helperText}</p> : null}
        {feedback ? (
          <p
            className={
              feedback.type === "success"
                ? "text-[var(--accent)]"
                : "text-[var(--destructive)]"
            }
          >
            {feedback.message}
          </p>
        ) : null}
        {error ? <p className="text-[var(--destructive)]">{error}</p> : null}
      </div>
    </div>
  );
}
