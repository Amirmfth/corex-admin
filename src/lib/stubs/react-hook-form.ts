import { useCallback, useMemo, useRef, useState } from 'react';

type FieldErrors<T> = Partial<{ [K in keyof T]: { message?: string } | FieldErrors<T[K]> }> & {
  [key: string]: any;
};

type ResolverResult<T> = Promise<{ values: T; errors: Record<string, { message?: string }> }>;

type Resolver<T> = (values: T) => ResolverResult<T> | { values: T; errors: Record<string, { message?: string }> };

type UseFormOptions<T> = {
  defaultValues: T;
  resolver?: Resolver<T>;
};

type RegisterReturn = {
  name: string;
  value: any;
  onChange: (event: any) => void;
};

type SubmitHandler<T> = (values: T) => void | Promise<void>;

type SubmitErrorHandler = (errors: Record<string, { message?: string }>) => void | Promise<void>;

type UseFormReturn<T> = {
  register: (name: string) => RegisterReturn;
  handleSubmit: (onValid: SubmitHandler<T>, onInvalid?: SubmitErrorHandler) => (event?: React.FormEvent) => Promise<void>;
  reset: (values: T) => void;
  setValue: (name: string, value: any) => void;
  watch: () => T;
  watch: (name: string) => any;
  formState: {
    isSubmitting: boolean;
    errors: Record<string, { message?: string }>;
  };
};

function setDeepValue(target: any, path: string, value: unknown) {
  const segments = path.split('.');
  const draft = Array.isArray(target) ? [...target] : { ...target };
  let cursor: any = draft;
  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;
    const key = Number.isNaN(Number(segment)) ? segment : Number(segment);
    if (isLast) {
      cursor[key] = value;
      return;
    }
    const next = cursor[key];
    if (next == null) {
      const nextSegment = segments[index + 1];
      cursor[key] = Number.isNaN(Number(nextSegment)) ? {} : [];
    }
    cursor = cursor[key];
  });
  return draft;
}

function getDeepValue(target: any, path: string) {
  const segments = path.split('.');
  let cursor = target as any;
  for (const segment of segments) {
    const key = Number.isNaN(Number(segment)) ? segment : Number(segment);
    if (cursor == null) {
      return undefined;
    }
    cursor = cursor[key];
  }
  return cursor;
}

export function useForm<T>({ defaultValues, resolver }: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(defaultValues);
  const resolverRef = useRef(resolver);
  resolverRef.current = resolver;
  const [errors, setErrors] = useState<Record<string, { message?: string }>>({});
  const [isSubmitting, setSubmitting] = useState(false);

  const register = useCallback(
    (name: string) => ({
      name,
      value: getDeepValue(values, name) ?? '',
      onChange: (event: any) => {
        const nextValue = event?.target?.type === 'checkbox' ? event.target.checked : event?.target?.value ?? event;
        setValues((prev) => setDeepValue(prev, name, nextValue));
      },
    }),
    [values],
  );

  const setValue = useCallback((name: string, value: any) => {
    setValues((prev) => setDeepValue(prev, name, value));
  }, []);

  const reset = useCallback((nextValues: T) => {
    setValues(nextValues);
    setErrors({});
  }, []);

  const runResolver = useCallback(async (currentValues: T) => {
    const currentResolver = resolverRef.current;
    if (!currentResolver) {
      return { values: currentValues, errors: {} };
    }
    const result = await currentResolver(currentValues);
    if ('then' in (result as any)) {
      return await result;
    }
    return result as { values: T; errors: Record<string, { message?: string }> };
  }, []);

  const handleSubmit = useCallback(
    (onValid: SubmitHandler<T>, onInvalid?: SubmitErrorHandler) => {
      return async (event?: React.FormEvent) => {
        event?.preventDefault?.();
        setSubmitting(true);
        try {
          const result = await runResolver(values);
          setErrors(result.errors);
          const hasError = Object.keys(result.errors).length > 0;
          if (hasError) {
            await onInvalid?.(result.errors);
            return;
          }
          await onValid(result.values);
        } finally {
          setSubmitting(false);
        }
      };
    },
    [runResolver, values],
  );

  const watchAll = useCallback(() => values, [values]);
  const watchField = useCallback((name: string) => getDeepValue(values, name), [values]);

  const watch = useMemo(() => {
    const fn: any = (name?: string) => {
      if (typeof name === 'string') {
        return watchField(name);
      }
      return watchAll();
    };
    return fn;
  }, [watchAll, watchField]);

  return {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: {
      isSubmitting,
      errors,
    },
  } as UseFormReturn<T>;
}

export type { SubmitHandler };
