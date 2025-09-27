'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';

import type { FormResolver } from '../../lib/settings';

type FieldError = { message?: string };
export type FieldErrors<T> = Record<string, FieldError> & { _values?: T };

function splitPath(name: string): string[] {
  return name.split('.').filter(Boolean);
}

function isNumericKey(key: string): boolean {
  return /^\d+$/.test(key);
}

function getNestedValue<T>(object: T, path: string[]): unknown {
  return path.reduce<unknown>((accumulator, key) => {
    if (accumulator == null) {
      return undefined;
    }
    const actualKey = isNumericKey(key) ? Number.parseInt(key, 10) : key;
    // @ts-expect-error -- dynamic access
    return accumulator[actualKey];
  }, object as unknown);
}

function cloneArray(source: unknown): unknown[] {
  return Array.isArray(source) ? [...source] : [];
}

function setNestedValue<T>(object: T, path: string[], value: unknown): T {
  if (path.length === 0) {
    return value as T;
  }

  const [head, ...rest] = path;
  if (isNumericKey(head)) {
    const index = Number.parseInt(head, 10);
    const array = cloneArray(object);
    array[index] = rest.length === 0 ? value : setNestedValue(array[index], rest, value);
    return array as T;
  }

  const current = (object && typeof object === 'object' && !Array.isArray(object)) ? { ...(object as object) } : {};
  // @ts-expect-error -- dynamic write
  current[head] = rest.length === 0 ? value : setNestedValue(current[head], rest, value);
  return current as T;
}

export type UseFormOptions<T> = {
  defaultValues: T;
  resolver?: FormResolver<T>;
};

export type UseFormHandleSubmit<T> = (
  onValid: (values: T) => void | Promise<void>,
  onInvalid?: (errors: FieldErrors<T>) => void,
) => (event?: FormEvent<HTMLFormElement>) => void;

export type RegisteredField = {
  name: string;
  value: unknown;
  onChange: (event: ChangeEvent<HTMLInputElement> | unknown) => void;
  onBlur: () => void;
};

export type FormState<T> = {
  isSubmitting: boolean;
  isDirty: boolean;
  errors: FieldErrors<T>;
};

export type UseFormReturn<T> = {
  register: (name: string) => RegisteredField;
  handleSubmit: UseFormHandleSubmit<T>;
  setValue: (name: string, value: unknown) => void;
  watch: (name?: string) => unknown;
  reset: (values?: T) => void;
  formState: FormState<T>;
  values: T;
};

export function useForm<T>({ defaultValues, resolver }: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(defaultValues);
  const [errors, setErrors] = useState<FieldErrors<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const updateValue = useCallback((name: string, nextValue: unknown) => {
    setValues((previous) => {
      const path = splitPath(name);
      const updated = setNestedValue(previous, path, nextValue);
      return updated;
    });
    setIsDirty(true);
    setErrors((previous) => {
      if (!previous[name]) {
        return previous;
      }
      const copy = { ...previous };
      delete copy[name];
      return copy;
    });
  }, []);

  const handleSubmit = useCallback<UseFormHandleSubmit<T>>(
    (onValid, onInvalid) => async (event) => {
      event?.preventDefault();
      setIsSubmitting(true);
      try {
        let currentValues = values;
        if (resolver) {
          const result = await resolver(values);
          currentValues = result.values;
          if (Object.keys(result.errors).length > 0) {
            setErrors(result.errors);
            onInvalid?.(result.errors);
            setIsSubmitting(false);
            return;
          }
          setValues(result.values);
        }
        setErrors({});
        await onValid(currentValues);
      } catch (error) {
        console.error('Form submission failed', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [resolver, values],
  );

  const register = useCallback(
    (name: string): RegisteredField<T> => ({
      name,
      value: getNestedValue(values, splitPath(name)),
      onChange: (input) => {
        if (input && typeof (input as ChangeEvent<HTMLInputElement>).target !== 'undefined') {
          const event = input as ChangeEvent<HTMLInputElement>;
          updateValue(name, event.target.type === 'number' ? event.target.valueAsNumber : event.target.value);
        } else {
          updateValue(name, input);
        }
      },
      onBlur: () => undefined,
    }),
    [updateValue, values],
  );

  const setValue = useCallback((name: string, value: unknown) => {
    updateValue(name, value);
  }, [updateValue]);

  const watch = useCallback(
    (name?: string) => {
      if (!name) {
        return values;
      }
      return getNestedValue(values, splitPath(name));
    },
    [values],
  );

  const reset = useCallback((nextValues?: T) => {
    const initial = nextValues ?? defaultValues;
    setValues(initial);
    setErrors({});
    setIsDirty(false);
  }, [defaultValues]);

  const formState = useMemo<FormState<T>>(
    () => ({
      isSubmitting,
      isDirty,
      errors,
    }),
    [errors, isDirty, isSubmitting],
  );

  const form = useMemo<UseFormReturn<T>>(
    () => ({
      register,
      handleSubmit,
      setValue,
      watch,
      reset,
      formState,
      values,
    }),
    [formState, handleSubmit, register, reset, setValue, values, watch],
  );

  return form;
}
