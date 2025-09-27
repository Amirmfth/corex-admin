'use client';

import type { ChangeEvent } from 'react';
import { cloneElement, createContext, useContext, useId } from 'react';

import type { FormState, UseFormReturn } from '../../lib/react-hook-form';

interface FormContextValue<T> {
  form: UseFormReturn<T>;
}

const FormContext = createContext<FormContextValue<any> | null>(null);

export function Form<T>({ form, children }: { form: UseFormReturn<T>; children: React.ReactNode }) {
  return <FormContext.Provider value={{ form }}>{children}</FormContext.Provider>;
}

function useFormContext<T>() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('Form components must be used within <Form>');
  }
  return context.form as UseFormReturn<T>;
}

interface FormFieldContextValue {
  name: string;
  id: string;
  error?: { message?: string };
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

export interface FormFieldRenderProps<T> {
  field: {
    name: string;
    value: unknown;
    onChange: (event: unknown) => void;
    onBlur: () => void;
  };
  fieldState: {
    error?: { message?: string };
  };
  formState: FormState<T>;
}

export interface FormFieldProps<T> {
  name: string;
  render: (props: FormFieldRenderProps<T>) => React.ReactNode;
}

export function FormField<T>({ name, render }: FormFieldProps<T>) {
  const form = useFormContext<T>();
  const id = useId();
  const value = form.watch(name) as unknown;
  const error = form.formState.errors[name] as { message?: string } | undefined;

  const handleChange = (next: unknown) => {
    if (next && typeof (next as { target?: unknown }) === 'object' && (next as any)?.target) {
      const event = next as ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      form.setValue(name, target.type === 'number' ? target.valueAsNumber : target.value);
      return;
    }
    form.setValue(name, next);
  };

  return (
    <FormFieldContext.Provider value={{ name, id, error }}>
      {render({
        field: {
          name,
          value,
          onChange: handleChange,
          onBlur: () => undefined,
        },
        fieldState: { error },
        formState: form.formState,
      })}
    </FormFieldContext.Provider>
  );
}

function useFormFieldContext() {
  const context = useContext(FormFieldContext);
  if (!context) {
    throw new Error('Form components must be used within FormField');
  }
  return context;
}

export function FormItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function FormLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  const { id } = useFormFieldContext();
  return (
    <label htmlFor={id} className={['text-sm font-medium text-[var(--muted-strong)]', className].filter(Boolean).join(' ')}>
      {children}
    </label>
  );
}

export function FormControl({ children }: { children: React.ReactElement }) {
  const { id, error } = useFormFieldContext();
  return cloneElement(children, {
    id,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': error ? `${id}-message` : undefined,
  });
}

export function FormDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  const { id } = useFormFieldContext();
  return (
    <p id={`${id}-description`} className={['text-xs text-[var(--muted)]', className].filter(Boolean).join(' ')}>
      {children}
    </p>
  );
}

export function FormMessage({ className }: { className?: string }) {
  const { error, id } = useFormFieldContext();
  if (!error?.message) {
    return null;
  }
  return (
    <p id={`${id}-message`} className={['text-xs text-[var(--warning)]', className].filter(Boolean).join(' ')}>
      {error.message}
    </p>
  );
}
