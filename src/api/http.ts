import { z } from 'zod';

export async function fetchJson<T>(
  url: string,
  schema: z.ZodType<T>,
  init?: Parameters<typeof fetch>[1],
): Promise<T> {
  const res = await fetch(url, init);
  const json: unknown = await res.json();

  if (!res.ok) {
    const message =
      typeof json === 'object' && json && 'message' in json
        ? String((json as { message?: unknown }).message)
        : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return schema.parse(json);
}

