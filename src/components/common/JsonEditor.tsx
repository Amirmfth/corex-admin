'use client';

import { Check, Trash2, Wand2, Plus, ToggleLeft } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type JsonEditorProps = {
  id: string;
  label: string;
  value: string; // pretty JSON string or empty
  onChange: (value: string) => void;
  helperText?: string;
  error?: string | null;
  validateLabel: string;
  formatLabel: string;
  validMessage: string;
  invalidMessage: string;
  addLabel: string;
  removeLabel: string;
};

type Feedback = {
  type: 'success' | 'error';
  message: string;
};

type ValueKind = 'string' | 'number' | 'boolean' | 'null' | 'json';

type Row = {
  id: string;
  key: string;
  kind: ValueKind;
  strVal: string;
  numVal: string;
  boolVal: boolean;
  jsonVal: string;
};

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function detectKind(val: unknown): ValueKind {
  if (val === null) return 'null';
  const t = typeof val;
  if (t === 'string') return 'string';
  if (t === 'number') return 'number';
  if (t === 'boolean') return 'boolean';
  return 'json'; // objects, arrays, anything else
}

function toRows(obj: unknown): Row[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
  const rec = obj as Record<string, unknown>;
  return Object.keys(rec).map((key) => {
    const val = rec[key];
    const kind = detectKind(val);
    return {
      id: uuid(),
      key,
      kind,
      strVal: kind === 'string' ? String(val) : '',
      numVal: kind === 'number' ? String(val) : '',
      boolVal: kind === 'boolean' ? Boolean(val) : false,
      jsonVal: kind === 'json' ? JSON.stringify(val, null, 2) : '',
    };
  });
}

function serializeRows(rows: Row[]): string {
  // ensure unique keys; later duplicates override earlier (like object literals)
  const result: Record<string, unknown> = {};
  for (const r of rows) {
    if (!r.key.trim()) continue;
    switch (r.kind) {
      case 'string':
        result[r.key.trim()] = r.strVal;
        break;
      case 'number': {
        const n = Number(r.numVal);
        if (Number.isFinite(n)) result[r.key.trim()] = n;
        break;
      }
      case 'boolean':
        result[r.key.trim()] = r.boolVal;
        break;
      case 'null':
        result[r.key.trim()] = null;
        break;
      case 'json': {
        const parsed = tryParseJson(r.jsonVal);
        if (parsed !== undefined) result[r.key.trim()] = parsed;
        break;
      }
    }
  }
  return JSON.stringify(result, null, 2);
}

export default function JsonEditor({
  id,
  label,
  value,
  onChange,
  helperText,
  error,
  validateLabel,
  formatLabel,
  addLabel,
  removeLabel,
  validMessage,
  invalidMessage,
}: JsonEditorProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const lastSentRef = useRef<string>(value ?? '');

  const initialObject = useMemo(() => {
    if (!value?.trim()) return {};
    const parsed = tryParseJson(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  }, [value]);

  const [rows, setRows] = useState<Row[]>(() => toRows(initialObject));

  useEffect(() => {
    if (value !== lastSentRef.current) {
      setRows(toRows(initialObject));
    }
  }, [value, initialObject]);

  useEffect(() => {
    const next = serializeRows(rows);
    if (next !== value) {
      lastSentRef.current = next;
      onChange(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  function addRow() {
    setRows((r) => [
      ...r,
      { id: uuid(), key: '', kind: 'string', strVal: '', numVal: '', boolVal: false, jsonVal: '' },
    ]);
  }

  function removeRow(id: string) {
    setRows((r) => r.filter((x) => x.id !== id));
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function handleValidate() {
    if (!value.trim()) {
      setFeedback({ type: 'success', message: validMessage });
      return;
    }
    try {
      JSON.parse(value);
      setFeedback({ type: 'success', message: validMessage });
    } catch {
      setFeedback({ type: 'error', message: invalidMessage });
    }
  }

  function handleFormat() {
    if (!value.trim()) {
      setFeedback(null);
      return;
    }
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed, null, 2));
      setFeedback({ type: 'success', message: validMessage });
    } catch {
      setFeedback({ type: 'error', message: invalidMessage });
    }
  }

  // quick duplicate-key check (soft warning)
  const duplicateKeys = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const k = r.key.trim();
      if (!k) return;
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return Array.from(m.entries())
      .filter(([, c]) => c > 1)
      .map(([k]) => k);
  }, [rows]);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>

      {/* Builder header */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-[var(--muted)]">
          {helperText ? <p>{helperText}</p> : null}
          {duplicateKeys.length > 0 ? (
            <p className="text-[var(--destructive)]">Duplicate keys: {duplicateKeys.join(', ')}</p>
          ) : null}
          {error ? <p className="text-[var(--destructive)]">{error}</p> : null}
          {feedback ? (
            <p
              className={
                feedback.type === 'success' ? 'text-[var(--accent)]' : 'text-[var(--destructive)]'
              }
            >
              {feedback.message}
            </p>
          ) : null}
        </div>

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
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <Plus className="size-3.5" aria-hidden />
            <span>{addLabel}</span>
          </button>
        </div>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-3">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            No fields. Click <em>Add field</em> to start.
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-1 gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 md:grid-cols-[minmax(0,1fr)_160px_minmax(0,1.2fr)_auto]"
            >
              {/* key */}
              <input
                placeholder="Key"
                value={row.key}
                onChange={(e) => updateRow(row.id, { key: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
              />

              {/* kind */}
              <div className="flex items-center gap-2">
                <select
                  value={row.kind}
                  onChange={(e) => updateRow(row.id, { kind: e.target.value as ValueKind })}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
                  aria-label="Type"
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="null">null</option>
                  <option value="json">json</option>
                </select>
              </div>

              {/* value (by kind) */}
              {row.kind === 'string' ? (
                <input
                  placeholder="Value"
                  value={row.strVal}
                  onChange={(e) => updateRow(row.id, { strVal: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
                />
              ) : row.kind === 'number' ? (
                <input
                  type="number"
                  placeholder="0"
                  value={row.numVal}
                  onChange={(e) => updateRow(row.id, { numVal: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
                />
              ) : row.kind === 'boolean' ? (
                <div className="flex items-center gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => updateRow(row.id, { boolVal: !row.boolVal })}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm shadow-sm hover:border-[var(--accent)]"
                    aria-pressed={row.boolVal}
                    aria-label="Toggle boolean"
                  >
                    <ToggleLeft className="size-4" />
                    <span>{row.boolVal ? 'true' : 'false'}</span>
                  </button>
                </div>
              ) : row.kind === 'null' ? (
                <div className="text-sm text-[var(--muted)] px-1 py-2">null</div>
              ) : (
                // json
                <textarea
                  placeholder='{"nested":"value"} or [1,2,3]'
                  rows={3}
                  value={row.jsonVal}
                  onChange={(e) => updateRow(row.id, { jsonVal: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs shadow-sm focus:border-[var(--accent)] focus:outline-none"
                />
              )}

              {/* remove */}
              <div className="flex items-start justify-end">
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[var(--destructive)] hover:text-[var(--destructive)]"
                  aria-label="Remove field"
                >
                  <Trash2 className="size-3.5" />
                  <span>{removeLabel}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* (Optional) raw JSON mirror for debugging (hidden by default). Toggle if you want. */}
      {/* <textarea className="mt-2 w-full rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-2 font-mono text-xs" rows={4} readOnly value={value} /> */}
    </div>
  );
}
