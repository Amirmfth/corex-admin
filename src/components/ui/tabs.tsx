'use client';

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from 'react';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
  id: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, defaultValue, onValueChange, children, className }: TabsProps) {
  const generatedId = useId();
  const [internalValue, setInternalValue] = useState(defaultValue ?? value ?? '');

  useEffect(() => {
    if (typeof value === 'string') {
      setInternalValue(value);
    }
  }, [value]);

  const handleChange = useCallback(
    (next: string) => {
      if (value == null) {
        setInternalValue(next);
      }
      onValueChange?.(next);
    },
    [onValueChange, value],
  );

  const context = useMemo<TabsContextValue>(
    () => ({
      value: value ?? internalValue,
      setValue: handleChange,
      id: generatedId,
    }),
    [generatedId, handleChange, internalValue, value],
  );

  return (
    <TabsContext.Provider value={context}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cx('flex gap-2 rounded-xl bg-[var(--surface-muted)] p-1 text-sm font-medium', className)}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsTrigger must be used within Tabs');
  }
  const isActive = context.value === value;
  const triggerId = `${context.id}-trigger-${value}`;
  const contentId = `${context.id}-content-${value}`;

  return (
    <button
      type="button"
      role="tab"
      id={triggerId}
      aria-controls={contentId}
      aria-selected={isActive}
      onClick={() => context.setValue(value)}
      className={cx(
        'flex-1 rounded-lg px-4 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-muted)]',
        isActive
          ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm'
          : 'text-[var(--muted)] hover:text-[var(--muted-strong)]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, className, children }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsContent must be used within Tabs');
  }

  const isActive = context.value === value;
  const contentId = `${context.id}-content-${value}`;
  const triggerId = `${context.id}-trigger-${value}`;

  return (
    <div
      id={contentId}
      role="tabpanel"
      aria-labelledby={triggerId}
      hidden={!isActive}
      className={cx(isActive ? 'mt-4' : 'hidden', className)}
    >
      {isActive ? children : null}
    </div>
  );
}
