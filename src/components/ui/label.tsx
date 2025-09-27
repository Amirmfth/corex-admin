'use client';

import { forwardRef } from 'react';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label({ className, ...props }, ref) {
  return (
    <label
      ref={ref}
      className={cx('text-sm font-medium text-[var(--muted-strong)]', className)}
      {...props}
    />
  );
});
