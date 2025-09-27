import type { ZodTypeAny } from 'zod';

type ResolverResponse<T> = Promise<{ values: T; errors: Record<string, { message?: string }> }>;

export function zodResolver<T>(schema: ZodTypeAny): (values: T) => ResolverResponse<T> {
  return async (values: T) => {
    const result = await schema.safeParseAsync(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    const errors: Record<string, { message?: string }> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      errors[path] = { message: issue.message };
    }
    return { values, errors };
  };
}
