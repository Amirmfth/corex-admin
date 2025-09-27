'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(`${component} must be used within <Tabs>`);
  }
  return context;
}

export function Tabs({
  defaultValue,
  value: controlled,
  onValueChange,
  className,
  children,
}: {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: ReactNode;
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const isControlled = typeof controlled === 'string';
  const currentValue = isControlled ? controlled : uncontrolled;

  const contextValue = useMemo<TabsContextValue>(
    () => ({
      value: currentValue,
      setValue: (next) => {
        if (!isControlled) {
          setUncontrolled(next);
        }
        onValueChange?.(next);
      },
    }),
    [currentValue, isControlled, onValueChange],
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-wrap gap-2 ${className ?? ''}`.trim()}>{children}</div>;
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  const { value: active, setValue } = useTabsContext('TabsTrigger');
  const isActive = active === value;
  return (
    <button
      type="button"
      onClick={() => setValue(value)}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] ${
        isActive
          ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow'
          : 'bg-[var(--surface-muted)] text-[var(--muted-strong)] hover:bg-[var(--surface-hover)]'
      }`}
      aria-pressed={isActive}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const { value: active } = useTabsContext('TabsContent');
  if (active !== value) {
    return null;
  }
  return <div className={className}>{children}</div>;
}
